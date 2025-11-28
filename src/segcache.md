# Segcache Calculator

Calculate memory footprint for a single Pelikan segcache instance.

```js
import * as calculator from "./components/segcacheCalculator.js";
```

## Configuration

```js
const sizeInput = Inputs.range(
  calculator.SIZE_RANGE,
  {
    label: "Key-Value Size (bytes)",
    value: calculator.DEFAULT_SIZE,
    step: 1
  }
);
const size = Generators.input(sizeInput);
```

```js
const nkeyInput = Inputs.range(
  calculator.NKEY_RANGE,
  {
    label: "Number of Keys (K)",
    value: calculator.DEFAULT_NKEY,
    step: 1
  }
);
const nkey = Generators.input(nkeyInput);
```

## Inputs

<div class="grid grid-cols-2">
  <div class="card">
    ${sizeInput}
    ${nkeyInput}
  </div>
</div>

```js
const args = {
  size,
  nkey
};
```

```js
const config = calculator.calculate(args);
```

### Input Summary

```js
(() => {
  const items = [
    { name: "Key-Value Size", value: `${size} bytes` },
    { name: "Number of Keys", value: `${nkey} K` }
  ];

  return Inputs.table(items);
})()
```

## Memory Footprint

```js
(() => {
  const memoryConfig = [
    { parameter: "Hash Power", value: config.hashPower },
    { parameter: "Segment Memory", value: `${config.segMem.toFixed(2)} MB` },
    { parameter: "Total Memory", value: `${config.totalMem.toFixed(2)} MB` }
  ];

  return Inputs.table(memoryConfig);
})()
```

## Data Size

```js
(() => {
  const dataSize = (size * nkey * calculator.K) / calculator.MB;

  const dataSizeInfo = [
    { parameter: "Raw Data Size", value: `${dataSize.toFixed(2)} MB` },
    { parameter: "Overhead", value: `${(config.segMem - dataSize).toFixed(2)} MB` },
    { parameter: "Hash Table", value: `${(config.totalMem - config.segMem).toFixed(2)} MB` }
  ];

  return Inputs.table(dataSizeInfo);
})()
```
