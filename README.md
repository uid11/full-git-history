# full-git-history #

  [![NPM version][npm-image]][npm-url]

  full-git-history extract all raw history (not only from the current branch) from the git-repository (by path) and stores it into the json-file with the given name.
  After this, the json-data can be used for plotting graphs, calculating statistics, searching commits, and so on.
  Raw history include all information from repository except blobs and trees object (i.e. all commits, tags, local and remote branches, symbolic refs, stash).

## Usage ##
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

## History format ##
Here is an example of the resulting json-history with all mandatory fields:

```json
{
  "commits": [
    {
      "sha1": "486bd367f5adb8d33ab0645942d96005fa76a5ed",
      "parents": [],
      "tree": "981153ddc8ec9463945835841e4b426c1138c289",
      "author": {
        "user": { "name": "uid-11222", "email": "uid.11222@gmail.com" },
        "date": "2016-07-04T08:49:16+03:00"
      },
      "committer": {
        "user": { "name": "uid-11222", "email": "uid.11222@gmail.com" },
        "date": "2016-07-04T08:49:16+03:00"
      },
      "message": "Fix \"send error arg to callback\" test.",
      "refs": [
          "HEAD",
          "origin/other",
          "foo-branch"
      ]
    },
    {
      "sha1": "baf2f375fd1575a86e7905585bd8341a9bb2655c",
      "parents": [
        "80008b786f3943dfc464e8374d9df451331449a8"
      ],
      "tree": "41aaf4b7a775f07e0541c468d66d6e0b3abbc40c",
      "author": {
        "user": { "name": "uid-11222", "email": "uid.11222@gmail.com" },
        "date": "2016-07-04T08:43:46+03:00"
      },
      "committer": {
        "user": { "name": "uid-11222", "email": "uid.11222@gmail.com" },
        "date": "2016-07-04T08:43:46+03:00"
      },
      "message": "Add check-history.js and test.js, remove test filed.",
      "tags": [
        "tg13",
        "tag18",
        "v1.2"
      ]
    }
  ],
  "REFS": {
    "HEAD": "master",
    "ORIG_HEAD": "baf2f375fd1575a86e7905585bd8341a9bb2655c"
  },
  "heads": {
    "master": {
      "sha1": "a854f3c79aa87f3be037eb8d5290a597a54c620c",
      "type": "commit",
      "size": 235,
      "upstream":"refs/remotes/origin/master",
      "push":"refs/remotes/origin/master",
      "HEAD": true
    },
    "bar-branch": {
      "sha1": "2cdcaf057f56e4d6a7ff215fda8cee319d76a9c6",
      "type": "commit",
      "size": 221
    },
    "foo-branch": {
      "sha1": "d0fce431c26b32805af6607c5012e00ec429a0ca",
      "type": "commit",
      "size": 221
    }
  },
  "tags": {
    "v1.2": {
      "sha1": "5af52613903caa57e446827314273a0790513ea2",
      "type": "tag",
      "size": 138,
      "objecttype": "commit",
      "object": "70c1d32ae8f353a3e22e73044090337d021b3987",
      "tagger": {
        "user": { "name": "uid-11222", "email": "uid.11222@gmail.com" },
        "date": "2016-05-28T07:30:13+03:00"
      },
      "message": "My message."
    },
    "v1.3": {
      "sha1": "2f7c073ea3371089f8fc8039a617ad4f568593d6",
      "type": "commit",
      "size": 243
    }
  },
  "remotes": {
    "origin": {
      "ab": {
        "sha1": "70c1d32ae8f353a3e22e73044090337d021b3987",
        "type": "commit",
        "size": 178
      },
      "br11": {
        "sha1": "cc699fd283d0ecf33c6f3fe368840ce8345c9fc4",
        "type": "commit",
        "size": 222
      }
    }
  }
}
```
Fields "tags" and "refs" are optional for commit object.
Field "refs" for commit include all refs to this commits except tags -- branches, remote branches, symbolic refs.
Also there are optional fields "encoding", "reflog" and "GPG" for commits.

Fields "upstream" and "push" are optional for ref object.
Field "HEAD" is optional for ref (true, if HEAD link to this ref).
v1.3 is lightweight tag, and v1.2 is annotated tag.
Value of fields "type" and "objecttype" for ref is one of "commit", "tag", "tree", "blob".
Value of field "size" for ref is the size of the object (the same as git cat-file -s reports).

REFS is a hash of symbolic refs (usually just HEAD, but also may be FETCH_HEAD, MERGE_HEAD, CHERRY_PICK_HEAD etc).

See "git help rev-list" and "git help for-each-ref" for a detailed description of all this fields.

## Tests ##
To run the test suite, first install the dependencies (only Mocha), then run npm test:
```bash
$ npm test
```

For checking file /path/history.json with history:

```bash
$ npm run check /path/history.json
```

## License ##
  [MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/full-git-history.svg
[npm-url]: https://www.npmjs.com/package/full-git-history "full-git-history"