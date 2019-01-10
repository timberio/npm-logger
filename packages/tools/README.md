# 🌲 Timber - JS lib tools

![Beta: Ready for testing](https://img.shields.io/badge/early_release-beta-green.svg)
![Speed: Blazing](https://img.shields.io/badge/speed-blazing%20%F0%9F%94%A5-brightgreen.svg)
[![ISC License](https://img.shields.io/badge/license-ISC-ff69b4.svg)](LICENSE.md)

**New to Timber?** [Here's a low-down on logging in Javascript.](https://github.com/timberio/timber-js)

## `@timberio/tools`

This library provides helper tools used by the [Javascript logger](https://github.com/timberio/timber-js).

## Tools

### `Queue<T>`

Generic [FIFO](<https://en.wikipedia.org/wiki/FIFO_(computing_and_electronics)>) queue. Used by `makeThrottle` to store pipeline functions to be executed as concurrent 'slots' become available. Provides fast retrieval for any primitive or object that needs ordered, first-in, first-out retrieval.

Used to store `.log()` Promises that are being batched/throttled.

**Usage example**

```typescript
import { Queue } from "@timberio/tools";

// Interface representing a person
interface IPerson {
  name: string;
  age: number;
}

// Create a queue to store `IPerson` objects
const q = new Queue<IPerson>();

// Add a couple of records...
q.push({ name: "Jeff", age: 50 });
q.push({ name: "Sally", age: 39 });

// Pull values from the queue...
while (q.length) {
  console.log(q.shift().name); // <-- first Jeff, then Sally...
}
```

### `makeThrottle<T>(max: number)`

Returns a `throttle` higher-order function, which wraps an `async` function, and limits the number of active Promises to `max: number`

The `throttle` function has this signature:

```
throttle(fn: T): (...args: InferArgs<T>[]) => Promise<InferArgs<T>>
```

**Usage example**

```typescript
import Timber from "@timberio/logger";
import { makeThrottle } from "@timberio/tools";

// Create a new Timber instance
const timber = new Timber("apiKey");

// Guarantee a pipeline will run a max of 2x at once
const throttle = makeThrottle(2);

// Create a basic pipeline function which resolves after 2 seconds
const pipeline = async log =>
  new Promise(resolve => {
    setTimeout(() => resolve(log), 2000);
  });

// Add a pipeline which has been throttled
timber.addPipeline(throttle(pipeline));

// Add 10 logs, and store the Promises
const promises = [];
for (let i = 0; i < 10; i++) {
  promises.push(timber.log({ message: `Hello ${i}` }));
}

void (async () => {
  void (await promises); // <-- will take 10 seconds total!
})();
```

### `makeBatch(size: number, flushTimeout: number)`

Creates a higher-order batch function aggregates Timber logs and resolves when either `size` # of logs have been collected, or when `flushTimeout` (in ms) has elapsed -- whichever occurs first.

This is used alongside the throttler to provide an array of [`ITimberLog`](https://github.com/timberio/timber-js/tree/master/packages/types#itimberlog) to the function set in the `.setSync()` method, to be synced with [Timber.io](https://timber.io)

Used internally by the [`@timberio/core Base class`](https://github.com/timberio/timber-js/blob/master/packages/core/src/base.ts) to implicitly batch logs:

```typescript
// Create a throttler, for sync operations
const throttle = makeThrottle(this._options.syncMax);

// Sync after throttling
const throttler = throttle((logs: any) => {
  return this._sync!(logs);
});

// Create a batcher, for aggregating logs by buffer size/interval
const batcher = makeBatch(this._options.batchSize, this._options.batchInterval);

this._batch = batcher((logs: any) => {
  return throttler(logs);
});
```

### `base64Encode(str: string): string`

**Node.js only**

Converts a plain-text string to a Base64 encoded string. Similar to [window.btoa()](https://www.w3schools.com/jsref/met_win_atob.asp) in the browser.

Used by the logger to convert an API key to Timber's `user:password` basic auth.

**Usage example:**

```typescript
import { atob } from "@timberio/tools";

console.log(atob("hello world")); // <-- returns "aGVsbG8gd29ybGQ="
```

### `pluckMultiple(source: { [key: string]: any }, paths: string[])`

Returns a new object with just those paths which is requested from source object.

** Usage example **

```typescript
import { pluckMultiple } from '@timberio/tools';
const paths = ["length", "response.status"];
const source = {
  request: {
    secure: true,
    headers: { "content-type": "text/plain" },
    href: "http://google.com/?q=whatever",
  },
  response: { status: 200 },
  length: 40,
  message: null,
};

const result = pluckMultiple(source, paths);
console.log(result); // { "length": 40, "response": { status: 200 }}
```

### LICENSE

[ISC](LICENSE.md)
