# full-git-history #

  [![NPM version][npm-image]][npm-url] ![node][node-image] ![dependencies][dependencies-image] [![License MIT][license-image]](LICENSE)

  **full-git-history** extract all raw history (not only from the current branch) in an asynchronous non-blocking manner from the local git-repository (by path) and stores it into the json-file with the given name.
  After this, the json-data can be used for plotting graphs, calculating statistics, searching commits, and so on.
  Raw history include all information from repository except blobs and trees objects (i.e. all commits, tags, local and remote branches, symbolic refs, stash).

## Usage ##
You need a node version >=6.0.0. Of course, you must have installed Git.
Let /path/to/foo-project -- path to some git-project (i.e. it contains ".git" directory).
```bash
$ npm install full-git-history -g
$ full-git-history /path/to/foo-project -o ~/bar/foo-project-history.json
```
Arguments order is not important, just use -o before output filename. Paths can be absolute or relative. Default path is "." (current path), default output filename is "history.json" (in the current directory, respectively).

Get some statistics of the repository and a list of errors (useful only for debugging):
```bash
$ check-history ~/bar/foo-project-history.json
```

Also you can install package locally or use it programmatically:
```js
const fullGitHistory = require('full-git-history'),
      checkHistory = require('full-git-history/test/check-history');

/**
 * @param {string[]} Args list.
 * @param {function(Error=)} Callback for when the writting is finished.
 */
fullGitHistory(['../foo-project', '-o', '/foo-history.json'], error => {

  if (error) {
    console.error(`Cannot read history: ${error.message}`);
    return;
  }

  if (checkHistory('/foo-history.json')) {
    console.log('No errors in history.');
  } else {
    console.log('History has some errors.');
  }

});
```
Function checkHistory('/foo-history.json') check history in file (synchronously) and print some general information about the repository and history errors.

**full-git-history** work fine with world biggest git-repositories (like [Chromium](https://chromium.googlesource.com/chromium/src/), [Gecko](https://github.com/mozilla/gecko-dev), [parts of linux kernel](https://git.kernel.org/cgit/linux/kernel/git/clk/linux.git/) -- each repository include about 500 000 commits), but in this case the output file will be automatically separated into several parts (all parts are valid json-files, which should be mixed) due to a max string size limit in the V8 ([https://github.com/nodejs/node/issues/3175](https://github.com/nodejs/node/issues/3175)).
Also for checking such a large object, you should use the increase memory limit for the node (only for checking, not for getting history):

```bash
$ node --max-old-space-size=8192 ~/JS/full-git-history/test/check-history.js big-history.json
```
See [fatal-error-call-and-retry-last-allocation-failed-process-out-of-memory](http://stackoverflow.com/questions/26094420/fatal-error-call-and-retry-last-allocation-failed-process-out-of-memory) for details.

## History format ##
Here is an synthetic (not self-consistent) example of the resulting json-history with all mandatory and some optional fields:
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
      "encoding": "ISO-8859-2",
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
      ],
      "GPG": {
        "type": "G",
        "name": "uid-11222 <uid.11222@gmail.com>",
        "key": "3757A74B1FDB2FFF"
      }
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
  },
  "stash": {
    "sha1": "b817416d8e65eb6292fc3d63fc7526be9478b461",
    "type": "commit",
    "size": 306
  }
}
```
v1.3 is lightweight tag, and v1.2 is annotated tag.

**history** fields:
 * "commits": array of all commits in reverse chronological order (from newest to oldest)
 * "heads": object with all local branches; key — branch name, value — branch ref object
 * "tags": object with all tags; key — tag name, value — tag ref object
 * "remotes": object with all remotes; key — remote name, value — remote object
 * "REFS": object with all *symbolic* refs (usually just HEAD, but also may be FETCH_HEAD, MERGE_HEAD, CHERRY_PICK_HEAD etc); key — symbolic ref name, value — string with ref value (name of some ref or sha1 of commit)
 * *"stash"*: optional field with stash-ref object (containing a ref .git/refs/stash, if it exists)

**commit** fields:
 * "sha1": string of 40 chars with sha1
 * "parents": array with sha1-strings of all commit parents; there are usually only one parent, but array may be empty (for initial commits) or contain several string (for merge commits)
 * "tree": string of 40 chars with sha1 of commit tree
 * "author": user object of author
 * "committer": user object of committer
 * "message": message string
 * *"GPG"*: optional field with GPG object (only for signed commits)
 * *"encoding"*: optional field with encoding string (only for non-default encoding)
 * *"reflog"*: optional field with the reflog object

**ref** fields:
 * "sha1": string of 40 chars with sha1
 * "type": one of "commit", "tag", "tree", "blob"
 * "size": number; the size of the referenced object in bytes (the same as git cat-file -s reports)
 * *"upstream"*: optional field with upstream link string (if this ref is tracking branch)
 * *"push"*: optional field with push link string (usually the same as the upstream)
 * *"HEAD"*: optional field with true (if HEAD linked to this ref)
 * *"objecttype"*: optional field with one of "commit", "tag", "tree", "blob"; type of tag linked object (if ref is annotated tag)
 * *"object"*: optional field with sha1-string of tag linked object (if ref is annotated tag)
 * *"tagger"*: optional field with user object of tagger (if ref is annotated tag)
 * *"message"*: optional field with message string (if ref is annotated tag)

**remote** object: object with all branches in this remote (like history.heads for local branches); key — branch name, value — branch ref object

**user** fields:
 * "user": object with string fields "name" and "email"
 * "date": string with date in strict ISO 8601 format

**GPG** fields:
 * "type": one of "G", "B", "U" (Good/Bad/good Untrusted signature)
 * *"name"*: optional field with non-empty string with the name of the signer (if exists)
 * *"key"*: optional field with non-empty string with the key used to sign (if exists)

**reflog** fields:
 * *"selector"*: optional field with non-empty string with reflog selector, e.g., "refs/stash@{1}" (if exists)
 * *"name"*: optional field with non-empty string with reflog identity name (if exists)
 * *"email"*: optional field with non-empty string with reflog identity email (if exists)
 * *"message"*: optional field with non-empty string with reflog message (if exists)

See "git help rev-list" and "git help for-each-ref" for a detailed description of all this fields.

## Tests ##
To run the test suite (47 tests), first install the devDependencies (only Mocha), then run npm test:
```bash
$ npm install
$ npm test
```

For checking file /path/history.json with history:
```bash
$ npm run check /path/history.json
```

## License ##
  [MIT](LICENSE)

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg "license-image"
[dependencies-image]: https://img.shields.io/gemnasium/mathiasbynens/he.svg?maxAge=2592000 "dependencies-image"
[node-image]: https://img.shields.io/badge/node-v6.0.0-brightgreen.svg?maxAge=2592000 "node-image"
[npm-image]: https://img.shields.io/npm/v/full-git-history.svg "npm-image"
[npm-url]: https://www.npmjs.com/package/full-git-history "full-git-history"