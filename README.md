  full-git-history extract all raw history (not only from the current branch) from the git-repository (by path) and stores it into the json-file with the given name.
  After this, the json-data can be used for plotting graphs, calculating statistics, searching commits, and so on.
  Raw history include all information from repository except blobs and trees object (i.e. all commits, tags, local and remote branches, symbolic refs, stash).

## Usage

Of course, you must have installed Git.
Let /path/to/foo-project -- path to some git-project (i.e. it contains ".git" directory).
```bash
$ npm install full-git-history -g
$ full-git-history /path/to/foo-project -o ~/bar/foo-project-history.json
```
Arguments order is not important, just use -o before output filename. Paths can be absolute or relative.

Also you can install package locally or use it programmatically:

```js
const fullGitHistory = require('full-git-history'),
      checkHistory = require('check-history');

/**
 * @param {string[]} Args list.
 * @param {function(Error=)} Callback for when the writting is finished.
 */
fullGitHistory(['../foo-project', '-o', '/foo-history.json'], error => {

  if (error) {
    console.error(`Cannot read history: ${error.message}`);
    return;
  }

  if (checkHistory('/foo-history.json'))
    console.log('No errors in history.');
  }) else {
    console.log('History has some errors.');
  }

});
```
Function checkHistory('/foo-history.json') check history in file and print some general information about repository and history errors (it is only for debug).

full-git-history work fine with world biggest git-repositories (like [Chromium](https://chromium.googlesource.com/chromium/src/), [Gecko](https://github.com/mozilla/gecko-dev), [parts of linux kernel](https://git.kernel.org/cgit/linux/kernel/git/clk/linux.git/) -- each repository include about 500 000 commits), but in this case the output file will be automatically separated into several parts (all parts are valid json-files, which should be mixed) due to a max string size limit in the V8 ([https://github.com/nodejs/node/issues/3175](https://github.com/nodejs/node/issues/3175)).
Also for checking such a large object, you should use the increase memory limit for the node (only for checking, not for getting history):

```bash
$ node --max-old-space-size=8192 ~/JS/full-git-history/test/check-history.js big-history.json
```
See [fatal-error-call-and-retry-last-allocation-failed-process-out-of-memory](http://stackoverflow.com/questions/26094420/fatal-error-call-and-retry-last-allocation-failed-process-out-of-memory) for details.

## History format
Here is an example of the resulting json-history with all mandatory fields:


## Tests

```bash
npm test
```
Use Mocha.

# License

  MIT

[npm-url]: https://www.npmjs.com/package/full-git-history "full-git-history"