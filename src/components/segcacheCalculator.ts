// Pelikan Segcache Calculator
// Calculates memory footprint for a single Pelikan instance

import {
  K,
  M,
  KB,
  MB,
  GB,
  SIZE_RANGE,
  DEFAULT_SIZE,
  NKEY_RANGE,
  DEFAULT_NKEY,
  HASH_OCCUPANCY_RANGE,
  DEFAULT_HASH_OCCUPANCY,
  SEGMENT_SIZE_RANGE,
  DEFAULT_SEGMENT_SIZE,
  HASH_OVERHEAD,
  ITEM_OVERHEAD,
  KEYVAL_ALIGNMENT,
} from "./constants.js";

// Re-export relevant constants
export {
  K,
  M,
  KB,
  MB,
  GB,
  SIZE_RANGE,
  DEFAULT_SIZE,
  NKEY_RANGE,
  DEFAULT_NKEY,
  HASH_OCCUPANCY_RANGE,
  DEFAULT_HASH_OCCUPANCY,
  SEGMENT_SIZE_RANGE,
  DEFAULT_SEGMENT_SIZE,
  KEYVAL_ALIGNMENT,
};

// ============================================================================
// Types
// ============================================================================
export interface SegcacheCalculatorArgs {
  size: number; // key+value size in bytes
  nkey: number; // number of keys
  hashOccupancy: number; // average number of keys per hash bucket (0.1-2.0)
  segmentSize: number; // segment size in bytes
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
 * Calculate hash parameters for the given number of keys and occupancy
 * @param nkey - number of keys to store
 * @param hashOccupancy - average number of keys per hash bucket
 */
function hashParameters(nkey: number, hashOccupancy: number): { hashPower: number; ramHash: number } {
  // Calculate desired number of hash slots based on occupancy
  const desiredSlots = nkey / hashOccupancy;
  const hashPower = Math.ceil(Math.log2(desiredSlots));
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

  // Total number of keys
  const totalKeys = args.nkey;

  // Calculate hash parameters
  const { hashPower, ramHash } = hashParameters(totalKeys, args.hashOccupancy);

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
    hashOccupancy: DEFAULT_HASH_OCCUPANCY,
    segmentSize: DEFAULT_SEGMENT_SIZE,
  };
}
