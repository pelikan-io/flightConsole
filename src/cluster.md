# Pelikan Cluster Calculator

Calculate resource requirements for a Pelikan cluster based on your workload parameters.

```js
import * as calculator from "./components/clusterCalculator.js";
```

## Configuration

```js
const runnableInput = Inputs.select(
  ["segcache", "rds", "pingserver"],
  {
    label: "Backend Type",
    value: "segcache"
  }
);
const runnable = Generators.input(runnableInput);
```

```js
const qpsInput = Inputs.range(
  calculator.QPS_RANGE,
  {
    label: "QPS",
    value: calculator.DEFAULT_QPS,
    step: calculator.K
  }
);
const qps = Generators.input(qpsInput);
```

```js
const sizeInput = Inputs.range(
  calculator.SIZE_RANGE,
  {
    label: "Key-Value Size (bytes)",
    value: calculator.DEFAULT_SIZE,
    step: 1,
    disabled: runnable === "pingserver"
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
    disabled: runnable === "pingserver"
  }
);
const nkey = Generators.input(nkeyInput);
```

```js
const nconnInput = Inputs.range(
  calculator.NCONN_RANGE,
  {
    label: "Connections per Server",
    value: calculator.DEFAULT_NCONN,
    step: 1
  }
);
const nconn = Generators.input(nconnInput);
```

```js
const failureDomainInput = Inputs.range(
  calculator.FAILURE_DOMAIN_RANGE,
  {
    label: "Failure Domain (%)",
    value: calculator.DEFAULT_FAILURE_DOMAIN,
    step: 0.1
  }
);
const failureDomain = Generators.input(failureDomainInput);
```

## Inputs

${runnableInput}

<div class="grid grid-cols-2">
  <div class="card">
    ${qpsInput}
    ${sizeInput}
    ${nkeyInput}
    ${nconnInput}
    ${failureDomainInput}
  </div>
</div>

```js
const args = {
  qps,
  size,
  nkey,
  nconn,
  failureDomain,
  ram: calculator.RAM_CANDIDATES,
  runnable
};
```

```js
const result = calculator.calculate(args);
const { config, analysis } = result;
```

### Input Summary

```js
(() => {
  const formatNumber = (n) => {
    if (n >= calculator.M) return `${(n / calculator.M).toFixed(n % calculator.M === 0 ? 0 : 1)}M`;
    if (n >= calculator.K) return `${(n / calculator.K).toFixed(n % calculator.K === 0 ? 0 : 1)}K`;
    return n.toString();
  };

  const items = [
    { name: "Backend", value: runnable },
    { name: "QPS", value: formatNumber(qps) },
  ];

  if (runnable !== "pingserver") {
    items.push({ name: "Key-Value Size", value: `${size} bytes` });
    items.push({ name: "Number of Keys", value: formatNumber(nkey) });
  }

  items.push(
    { name: "Connections", value: nconn },
    { name: "Failure Domain", value: `${failureDomain.toFixed(1)}%` }
  );

  return Inputs.table(items);
})()
```

## Job Configuration (Per Instance)

```js
(() => {
  const perInstanceConfig = [
    { parameter: "CPU", value: config.cpu },
    { parameter: "RAM", value: `${config.ram} GB` },
    { parameter: "Disk", value: `${config.disk} GB` }
  ];

  if (config.hashPower !== undefined) {
    perInstanceConfig.push({ parameter: "Hash Power", value: config.hashPower });
  }

  if (config.segMem !== undefined) {
    perInstanceConfig.push({ parameter: "Segment Memory", value: `${config.segMem.toFixed(2)} MB` });
  }

  return Inputs.table(perInstanceConfig);
})()
```

## Capacity Planning

```js
(() => {
  const dataSize = (size * nkey) / calculator.GB;
  const instancesNeeded = config.instance;
  const totalCpu = config.cpu * instancesNeeded;
  const totalRam = config.ram * instancesNeeded;
  const totalDisk = config.disk * instancesNeeded;

  const capacityPlanning = [];

  if (runnable !== "pingserver") {
    capacityPlanning.push({ parameter: "Total Data Size", value: `${dataSize.toFixed(2)} GB` });
  }

  capacityPlanning.push(
    { parameter: "Instances Required", value: instancesNeeded },
    { parameter: "Total CPU", value: totalCpu },
    { parameter: "Total RAM", value: `${totalRam} GB` },
    { parameter: "Total Disk", value: `${totalDisk} GB` }
  );

  return Inputs.table(capacityPlanning);
})()
```

## Analysis

```js
(() => {
  const analysisResults = [
    { parameter: "Bottleneck", value: analysis.bottleneck }
  ];

  return Inputs.table(analysisResults);
})()
```
