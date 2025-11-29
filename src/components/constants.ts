// Pelikan Cluster Calculator - Constants

// ============================================================================
// Constants: Units
// ============================================================================
export const K = 1000;
export const M = K * 1000;
export const KB = 1024;
export const MB = 1024 * KB;
export const GB = 1024 * MB;

// ============================================================================
// Constants: Throughput and connections
// ============================================================================
export const QPS_RANGE = [1 * K, 100 * M];
export const DEFAULT_QPS = 1 * M;
export const NCONN_RANGE = [1, 500 * K];
export const DEFAULT_NCONN = 500;
export const CONN_OVERHEAD = 33 * KB; // 2 16KiB buffers, one channel, and stream overhead
export const TLS_OVERHEAD = 64 * KB; // 2 32KiB buffers, one channel, and stream overhead

// ============================================================================
// Constants: Data Sizes
// ============================================================================
export const SIZE_RANGE = [8, 16 * MB];
export const DEFAULT_SIZE = 64;
export const NKEY_RANGE = [1 * K, 10 * M];
export const DEFAULT_NKEY = 100 * K;

// ============================================================================
// Constants: Cluster and Reliability
// ============================================================================
export const FAILURE_DOMAIN_RANGE = [0.1, 100]; // (%)
export const DEFAULT_FAILURE_DOMAIN = 5.0; // 5% of the nodes may be lost at once

// ============================================================================
// Constants: SegCache Related
// ============================================================================
export const HASH_OCCUPANCY_RANGE = [0.1, 2]; // average number of keys/items per hash bucket
export const DEFAULT_HASH_OCCUPANCY = 0.75;
export const SEGMENT_SIZE_RANGE = [4 * KB, 2 * GB]; // in bytes
export const DEFAULT_SEGMENT_SIZE = 1 * MB; // in bytes
export const HASH_OVERHEAD = 10; // per hash table entry, in bytes

// Constants: Process Related
// ============================================================================
export const SAFETY_BUF = 128; // in MB
export const BASE_OVERHEAD = 10; // in MB
export const KQPS = 60 * K; // much lower than single-instance max, picked to scale to 10 jobs/host

// ITEM_HDR_SIZE + CAS
export const ITEM_OVERHEAD: Record<string, number> = {
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
