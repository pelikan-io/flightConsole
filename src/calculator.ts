// Pelikan Cluster Calculator - TypeScript Translation
// Calculates resource requirement of a Pelikan cluster based on input

// ============================================================================
// Constants: Units
// ============================================================================
export const K = 1000;
export const M = K * 1000;
export const KB = 1024;
export const MB = 1024 * KB;
export const GB = 1024 * MB;

// ============================================================================
// Constants: Limits and Defaults
// ============================================================================
export const QPS_RANGE = [1, 100000]; // (K)
export const DEFAULT_QPS = 1000; // (K)
export const NCONN_RANGE = [1, 500000];
export const DEFAULT_NCONN = 500;
export const SIZE_RANGE = [1, 16 * MB];
export const DEFAULT_SIZE = 64;
export const NKEY_RANGE = [1, 10000]; // (K)
export const DEFAULT_NKEY = 100; // (K)
export const FAILURE_DOMAIN_RANGE = [0.1, 100]; // (%)
export const DEFAULT_FAILURE_DOMAIN = 5.0; // 5% of the nodes may be lost at once

// ============================================================================
// Constants: Pelikan Related
// ============================================================================
export const CONN_OVERHEAD = 33 * KB; // 2 16KiB buffers, one channel, and stream overhead
export const TLS_OVERHEAD = 64 * KB; // 2 32KiB buffers, one channel, and stream overhead
export const SAFETY_BUF = 128; // in MB
export const BASE_OVERHEAD = 10; // in MB
export const KQPS = 60; // much lower than single-instance max, picked to scale to 10 jobs/host

export const HASH_OVERHEAD: Record<Runnable, number> = {
  segcache: 10,
  rds: 10,
  pingserver: 0,
};

// ITEM_HDR_SIZE + CAS
export const ITEM_OVERHEAD: Record<Runnable, number> = {
  segcache: 5 + 8,
  rds: 5 + 8,
  pingserver: 0,
};

export const KEYVAL_ALIGNMENT = 8; // in bytes

// ============================================================================
// Constants: Job Related
// ============================================================================
export const CPU_PER_JOB = 2.0;
export const DISK_PER_JOB = 3; // in GB
export const RAM_CANDIDATES = [4, 8]; // in GB
export const WARNING_THRESHOLD = 10000; // alert when too many jobs are needed

// ============================================================================
// Types
// ============================================================================
export type Runnable = "segcache" | "rds" | "pingserver";

export interface CalculatorArgs {
  qps: number; // query per second in thousands/K
  size: number; // key+value size in bytes
  nkey: number; // number of keys in thousands/K
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

export interface SegcacheConfig extends BaseConfig {
  hashPower: number;
  segMem: number;
}

export interface RdsConfig extends BaseConfig {
  hashPower: number;
  segMem: number;
}

export interface PingserverConfig extends BaseConfig {}

export type CalculatorConfig =
  | SegcacheConfig
  | RdsConfig
  | PingserverConfig;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate hash parameters for the given number of keys
 */
export function hashParameters(
  nkey: number,
  runnable: Runnable
): { hashPower: number; ramHash: number } {
  const hashPower = Math.ceil(Math.log2(nkey));
  const ramHash = Math.ceil((HASH_OVERHEAD[runnable] * Math.pow(2, hashPower)) / MB);
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
 * For segcache, returns config with: cpu, ram, disk, hashPower, segMem, instance
 * For rds, returns config with: cpu, ram, disk, hashPower, segMem, instance
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
  const ramData = (itemSize * args.nkey * K) / MB;

  // Calculate njob (vector) assuming memory-bound
  const njobMem: number[] = [];
  const sortedRam = [...args.ram].sort((a, b) => a - b);

  for (const ramGb of sortedRam) {
    const ram = (ramGb * GB) / MB; // change unit to MB
    const nLow = Math.ceil(ramData / ram); // number of shards, lower bound
    const nkeyPerShard = (args.nkey * K) / nLow; // number of keys per shard, upper bound
    const { ramHash } = hashParameters(nkeyPerShard, args.runnable); // upper bound
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

  // Calculate runnable-specific values
  const { hashPower, ramHash } = hashParameters(nkeyPerShard, args.runnable);
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

  // Return runnable-specific config
  switch (args.runnable) {
    case "segcache":
      return {
        config: {
          ...baseConfig,
          hashPower,
          segMem,
        } as SegcacheConfig,
        analysis,
      };

    case "rds":
      return {
        config: {
          ...baseConfig,
          hashPower,
          segMem,
        } as RdsConfig,
        analysis,
      };

    default:
      return {
        config: baseConfig,
        analysis,
      };
  }
}

