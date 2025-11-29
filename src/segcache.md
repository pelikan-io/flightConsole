# Segcache Calculator

Calculate memory footprint for a single Pelikan segcache instance.

<style>
input[type="number"] {
  width: 120px !important;
  flex-shrink: 0 !important;
}
</style>

```js
import * as calculator from "./components/segcacheCalculator.js";
```

## Configuration

```js
const inputWidth = 260;
```

```js
const sizeInput = Inputs.range(
  calculator.SIZE_RANGE,
  {
    label: "Key-Value Size (bytes)",
    value: calculator.DEFAULT_SIZE,
    step: calculator.KEYVAL_ALIGNMENT,
    transform: Math.log,
    width: inputWidth
  }
);
const size = Generators.input(sizeInput);
```

```js
const nkeyInput = Inputs.range(
  calculator.NKEY_RANGE,
  {
    label: "Number of Keys",
    value: calculator.DEFAULT_NKEY,
    step: calculator.K,
    transform: Math.log,
    width: inputWidth
  }
);
const nkey = Generators.input(nkeyInput);
```

```js
const hashOccupancyInput = Inputs.range(
  calculator.HASH_OCCUPANCY_RANGE,
  {
    label: "Hash Occupancy",
    value: calculator.DEFAULT_HASH_OCCUPANCY,
    step: 0.05,
    width: inputWidth
  }
);
const hashOccupancy = Generators.input(hashOccupancyInput);
```

```js
const segmentSizeInput = Inputs.range(
  calculator.SEGMENT_SIZE_RANGE,
  {
    label: "Segment Size (bytes)",
    value: calculator.DEFAULT_SEGMENT_SIZE,
    step: 4 * calculator.KB,
    transform: Math.log,
    width: inputWidth
  }
);
const segmentSize = Generators.input(segmentSizeInput);
```


<div class="grid grid-cols-2">
  <div class="card">
    <h2>Data</h2>
    ${sizeInput}
    ${nkeyInput}
  </div>
  <div class="card">
    <h2>Storage</h2>
    ${hashOccupancyInput}
    ${segmentSizeInput}
  </div>
</div>

```js
const args = {
  size,
  nkey,
  hashOccupancy,
  segmentSize
};
```

```js
const config = calculator.calculate(args);
```

### Input Summary

```js
(() => {
  const formatNumber = (n) => {
    if (n >= calculator.M) return `${(n / calculator.M).toFixed(n % calculator.M === 0 ? 0 : 1)}M`;
    if (n >= calculator.K) return `${(n / calculator.K).toFixed(n % calculator.K === 0 ? 0 : 1)}K`;
    return n.toString();
  };

  const formatBytes = (bytes) => {
    if (bytes >= calculator.GB) return `${(bytes / calculator.GB).toFixed(bytes % calculator.GB === 0 ? 0 : 2)} GB`;
    if (bytes >= calculator.MB) return `${(bytes / calculator.MB).toFixed(bytes % calculator.MB === 0 ? 0 : 2)} MB`;
    if (bytes >= calculator.KB) return `${(bytes / calculator.KB).toFixed(bytes % calculator.KB === 0 ? 0 : 2)} KB`;
    return `${bytes} bytes`;
  };

  const items = [
    { parameter: "Key-Value Size", value: `${size} bytes` },
    { parameter: "Number of Keys", value: formatNumber(nkey) },
    { parameter: "Hash Occupancy", value: hashOccupancy.toFixed(2) },
    { parameter: "Segment Size", value: formatBytes(segmentSize) }
  ];

  return Inputs.table(items, { select: false });
})()
```

## Options

```js
  const cacheConfig = [
    { parameter: "Hash Power", value: config.hashPower },
    { parameter: "Segment Size", value: segmentSize },
  ];

  display(Inputs.table(cacheConfig, { select: false }));
```

## Data and Memory

```js
  const dataSize = (size * nkey) / calculator.MB;

  const dataSizeInfo = [
    { parameter: "Raw Data Size", value: `${dataSize.toFixed(2)} MB` },
    { parameter: "In-line Storage Overhead", value: `${(config.segMem - dataSize).toFixed(2)} MB` },
    { parameter: "Segment Memory", value: `${config.segMem.toFixed(2)} MB` },
    { parameter: "Hash Table Overhead", value: `${(config.totalMem - config.segMem).toFixed(2)} MB` },
    { parameter: "Total Memory", value: `${config.totalMem.toFixed(2)} MB` },
    { parameter: "Memory-to-data ratio", value: `${(config.totalMem / dataSize).toFixed(3)}` }
  ];

  display(Inputs.table(dataSizeInfo, { select: false, align: {value: "right"} }));
```
