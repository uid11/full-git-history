  full-git-history extract all raw history (not only from the current branch) from the git-repository (by path) and stores it into the json-file with the given name.
  After this, the json-data can be used for plotting graphs, calculating statistics, searching commits, and so on.

## Usage

```js
var nextTask = require('next-task');

nextTask(function() {
  /* this === undefined, arguments.length === 0 */
  console.log('Run this async, but "as soon as possible".');
});

console.log('This run sync.');

/** Log:
 * -> This run sync.
 * -> Run this async, but "as soon as possible".
 */

/** Variant with context: */
var task = {
    data: ...,
    call: function() {/* this === task */}
};

nextTask(task);
```
About rawAsap and microtasks: [rawAsap](https://github.com/kriskowal/asap#raw-asap).
If you need queue of animation tasks, use [raf](https://github.com/chrisdickinson/raf) instead, for synchronize with rendering loop.
If you need to perform a long (macrotask) queue of heavy tasks, use [setImmediate](https://github.com/YuzuJS/setImmediate) to give the browser the ability to handle current events.
Note that, like rawAsap, nextTask does not catch the errors (to work as soon as possible).

## Tests

```bash
npm test
```
Use Mocha.

# License

  MIT

[npm-url]: https://www.npmjs.com/package/full-git-history "full-git-history"