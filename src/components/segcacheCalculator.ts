// Pelikan Segcache Calculator
// Calculates memory footprint for a single Pelikan instance

import {
  K,
  M,
  MB,
  GB,
  SIZE_RANGE,
  DEFAULT_SIZE,
  NKEY_RANGE,
  DEFAULT_NKEY,
  HASH_OVERHEAD,
  ITEM_OVERHEAD,
  KEYVAL_ALIGNMENT,
} from "./constants.js";

// Re-export relevant constants
export {
  K,
  M,
  MB,
  GB,
  SIZE_RANGE,
  DEFAULT_SIZE,
  NKEY_RANGE,
  DEFAULT_NKEY,
};

// ============================================================================
// Types
// ============================================================================
export interface SegcacheCalculatorArgs {
  size: number; // key+value size in bytes
  nkey: number; // number of keys in thousands/K
}

export interface SegcacheConfig {
  hashPower: number;
  segMem: number; // in MB
  totalMem: number; // in MB
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate hash parameters for the given number of keys
 */
function hashParameters(nkey: number): { hashPower: number; ramHash: number } {
  const hashPower = Math.ceil(Math.log2(nkey));
  const ramHash = Math.ceil((HASH_OVERHEAD * Math.pow(2, hashPower)) / MB);
  return { hashPower, ramHash };
}

// ============================================================================
// Main Calculator Function
// ============================================================================

/**
 * Calculate memory footprint for a single Pelikan segcache instance.
 *
 * Returns: hashPower, segMem (in MB), totalMem (in MB)
 */
export function calculate(args: SegcacheCalculatorArgs): SegcacheConfig {
  // Calculate item size with alignment
  const itemSize =
    KEYVAL_ALIGNMENT * Math.ceil((ITEM_OVERHEAD["segcache"] + args.size) / KEYVAL_ALIGNMENT);

  // Total number of keys (convert from K to actual count)
  const totalKeys = args.nkey * K;

  // Calculate hash parameters
  const { hashPower, ramHash } = hashParameters(totalKeys);

  // Calculate segment memory needed for data storage (in MB)
  const segMem = (itemSize * totalKeys) / MB;

  // Total memory is segment memory plus hash table overhead
  const totalMem = segMem + ramHash;

  return {
    hashPower,
    segMem,
    totalMem,
  };
}

/**
 * Get default calculator arguments
 */
export function getDefaultArgs(): SegcacheCalculatorArgs {
  return {
    size: DEFAULT_SIZE,
    nkey: DEFAULT_NKEY,
  };
}
