// Pelikan Cluster Calculator - TypeScript Translation
// Calculates resource requirement of a Pelikan cluster based on input

import {
  K,
  M,
  KB,
  MB,
  GB,
  QPS_RANGE,
  DEFAULT_QPS,
  NCONN_RANGE,
  DEFAULT_NCONN,
  SIZE_RANGE,
  DEFAULT_SIZE,
  NKEY_RANGE,
  DEFAULT_NKEY,
  FAILURE_DOMAIN_RANGE,
  DEFAULT_FAILURE_DOMAIN,
  CONN_OVERHEAD,
  SAFETY_BUF,
  BASE_OVERHEAD,
  KQPS,
  HASH_OVERHEAD,
  ITEM_OVERHEAD,
  KEYVAL_ALIGNMENT,
  CPU_PER_JOB,
  DISK_PER_JOB,
  RAM_CANDIDATES,
  WARNING_THRESHOLD,
} from "./constants.js";

// Re-export constants for convenience
export {
  K,
  M,
  KB,
  MB,
  GB,
  QPS_RANGE,
  DEFAULT_QPS,
  NCONN_RANGE,
  DEFAULT_NCONN,
  SIZE_RANGE,
  DEFAULT_SIZE,
  NKEY_RANGE,
  DEFAULT_NKEY,
  FAILURE_DOMAIN_RANGE,
  DEFAULT_FAILURE_DOMAIN,
  CONN_OVERHEAD,
  SAFETY_BUF,
  BASE_OVERHEAD,
  KQPS,
  HASH_OVERHEAD,
  ITEM_OVERHEAD,
  KEYVAL_ALIGNMENT,
  CPU_PER_JOB,
  DISK_PER_JOB,
  RAM_CANDIDATES,
  WARNING_THRESHOLD,
};

// ============================================================================
// Types
// ============================================================================
export type Runnable = "segcache" | "rds" | "pingserver";

export interface CalculatorArgs {
  qps: number; // queries per second
  size: number; // key+value size in bytes
  nkey: number; // number of keys
  nconn: number; // number of connections to each server
  failureDomain: number; // percentage of server/data that may be lost simultaneously
  ram: number[]; // list of container ram sizes to consider (in GB)
  runnable: Runnable; // backend flavor
}

export interface ConfigAnalysis {
  bottleneck: string
}

export interface BaseConfig {
  cpu: number;
  ram: number;
  disk: number;
  instance: number;
}

export interface CacheConfig extends BaseConfig {
  hashPower: number;
  segMem: number;
}

export interface PingserverConfig extends BaseConfig {}

export type CalculatorConfig =
  | CacheConfig
  | PingserverConfig;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate hash parameters for the given number of keys
 */
export function hashParameters(nkey: number): { hashPower: number; ramHash: number } {
  const hashPower = Math.ceil(Math.log2(nkey));
  const ramHash = Math.ceil((HASH_OVERHEAD * Math.pow(2, hashPower)) / MB);
  return { hashPower, ramHash };
}

/**
 * Get default calculator arguments
 */
export function getDefaultArgs(runnable: Runnable): CalculatorArgs {
  return {
    qps: DEFAULT_QPS,
    size: DEFAULT_SIZE,
    nkey: DEFAULT_NKEY,
    nconn: DEFAULT_NCONN,
    failureDomain: DEFAULT_FAILURE_DOMAIN,
    ram: [...RAM_CANDIDATES],
    runnable,
  };
}

// ============================================================================
// Main Calculator Function
// ============================================================================

/**
 * Calculate job configuration according to requirements.
 *
 * For segcache/rds, returns config with: cpu, ram, disk, hashPower, segMem, instance
 * For pingserver, returns config with: cpu, ram, disk, instance
 *
 * Also returns analysis containing: bottleneck
 */
export function calculate(args: CalculatorArgs): { config: CalculatorConfig; analysis: ConfigAnalysis } {
  // Validate failure domain
  if (args.failureDomain < FAILURE_DOMAIN_RANGE[0] || args.failureDomain > FAILURE_DOMAIN_RANGE[1]) {
    console.error(
      `ERROR: failure domain should be between ${FAILURE_DOMAIN_RANGE[0].toFixed(1)}% and ${FAILURE_DOMAIN_RANGE[1].toFixed(1)}%`
    );
  }

  // First calculate njob disregarding memory, note both njob & bottleneck are not yet final
  const njobQps = Math.ceil(args.qps / KQPS);
  const njobFd = Math.ceil(100.0 / args.failureDomain);

  let bottleneck: string;
  let njob: number;

  if (njobQps >= njobFd) {
    bottleneck = "qps";
    njob = njobQps;
  } else {
    bottleneck = "failure domain";
    njob = njobFd;
  }

  // Per-job memory overhead, in MB
  const ramConn = Math.ceil((CONN_OVERHEAD * args.nconn) / MB);
  const ramFixed = BASE_OVERHEAD + SAFETY_BUF;

  // Short circuit pingserver calculation as it doesn't require any data storage
  if (args.runnable === "pingserver") {
    return {
      config: {
        cpu: CPU_PER_JOB,
        ram: Math.ceil((ramConn + ramFixed) / GB),
        disk: DISK_PER_JOB,
        instance: njob,
      } as PingserverConfig,
      analysis: {
        bottleneck,
      },
    };
  }

  // All ram-related values in this function are in MB
  // Amount of ram needed to store dataset, factoring in overhead
  const itemSize =
    KEYVAL_ALIGNMENT * Math.ceil((ITEM_OVERHEAD[args.runnable] + args.size) / KEYVAL_ALIGNMENT);
  const ramData = (itemSize * args.nkey) / MB;

  // Calculate njob (vector) assuming memory-bound
  const njobMem: number[] = [];
  const sortedRam = [...args.ram].sort((a, b) => a - b);

  for (const ramGb of sortedRam) {
    const ram = (ramGb * GB) / MB; // change unit to MB
    const nLow = Math.ceil(ramData / ram); // number of shards, lower bound
    const nkeyPerShard = args.nkey / nLow; // number of keys per shard, upper bound
    const { ramHash } = hashParameters(nkeyPerShard); // upper bound
    const n = Math.ceil(ramData / (ram - ramFixed - ramConn - ramHash));
    njobMem.push(n);
  }

  // Get final njob count; prefer larger ram if it reduces njob
  let index = 0; // if qps bound, use smallest ram setting

  for (let i = njobMem.length - 1; i >= 1; i--) {
    if (njobMem[i] > njob || njobMem[i - 1] > njob) {
      bottleneck = "memory";
      index = i;
      njob = Math.max(njob, njobMem[i]);
      break;
    }
  }

  if (njob > WARNING_THRESHOLD) {
    console.warn(`WARNING: more than ${WARNING_THRESHOLD} instances needed, please verify input.`);
  }

  // Recalculate hash parameters with the final job count
  const nkeyPerShard =
    (sortedRam[index] * GB - ramFixed * MB - ramConn * MB) / itemSize;

  // Calculate hash parameters
  const { hashPower, ramHash } = hashParameters(nkeyPerShard);
  const segMem = (sortedRam[index] * GB) / MB - ramFixed - ramConn - ramHash;

  // Build base config
  const baseConfig: BaseConfig = {
    cpu: CPU_PER_JOB,
    ram: sortedRam[index],
    disk: DISK_PER_JOB,
    instance: njob,
  };

  // Build analysis
  const analysis: ConfigAnalysis = {
    bottleneck,
  };

  // Return config with memory calculations for segcache/rds
  return {
    config: {
      ...baseConfig,
      hashPower,
      segMem,
    } as CacheConfig,
    analysis,
  };
}
