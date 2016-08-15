#!/usr/bin/env node

'use strict'; /* globals process */

const createFile = require('fs').createWriteStream,
      execFile = require('child_process').execFile;


const defaultCallback = error => {
  if (error) throw error;
};

const KB = 1024, MB = 1024 * KB,
      EXEC_OPTIONS = {
        maxBuffer: 4096 * MB,
        encoding: 'buffer'
      },
      MAX_OUT_SIZE = 160 * MB,
      MAX_REF_SIZE = 1 * KB,
      MAX_OUT_REFS = Math.round(MAX_OUT_SIZE / MAX_REF_SIZE),
      TOLERANCE_SIZE = 8 * MB;

const REFS = ['heads', 'tags', 'remotes'],
      FULL_REFS = REFS.map(key => `refs/${key}/`);

const SEPARATOR = '\n'.repeat(32);
const GIT_PARAMS = {
  refs: [
    `for-each-ref`, `--format=%(objectname) %(refname) %(objecttype)
    %(objectsize) %(type) %(object) %(taggername) %(taggeremail)
    %(taggerdate:iso-strict) %(upstream) %(push) %(HEAD) %(subject) %(body)`
    .replace(/\s+/g, '%0a') + SEPARATOR.replace(/\s/g, '%0a')
  ],
  commits:
    (`rev-list --full-history --reflog --all --use-bitmap-index
    --sparse --pretty=tformat:%P%n%T%n%an%n%ae%n%aI%n%cn%n` +
    `%ce%n%cI%n%G?%n%GS%n%GK%n%e%n%gD%n%gn%n%ge%n%gs%n%D%n%B` +
    SEPARATOR.replace(/\s/g, '%n')).split(/\s+/)
};

const SOURCES = Object.keys(GIT_PARAMS),
      hasOwn  = GIT_PARAMS.hasOwnProperty;

/**
 * Parse string arguments from command line.
 * @param  {string[]} args
 * @return {Object} Options object with output filename, path to repository.
 */
const parseArgs = args => {
  const options = { out: 'history.json', path: '.' };
  for (const arg of args) {

    if (arg === '-no') {
      options.no = true;
      continue;
    }

    if (arg === '-r') {
      options.r = true;
      continue;
    }

    if (options.afterO) {
      options.out = arg;
      options.afterO = false;
      continue;
    }

    if (arg === '-o') {
      options.afterO = true;
      continue;
    }

    if (!options.pathSetted) {
      options.path = arg;
      options.pathSetted = true;
      continue;
    }

    options.usage = true;
    break;
  }
  return options;
};

/**
 * Get full history from git repository and write to json-file.
 * @param {string[]} args like ['~/foo-project', '-o', 'history.json']
 * @param {function(Error=,Object=)} cb for when the writting is finished.
 */
const fullGitHistory = (args, callback = defaultCallback) => {

  const options = parseArgs(args);
  let closed = false;

  if (options.usage) {
    console.log(`usage: full-git-history [<path>] [-o <path>] [-no] [-r]
       full-git-history path/to/foo -o path/to/foo-history.json`);
    return;
  }

  /**
   * General handler for all errors.
   * @param {Error=}
   */
  const errorHandler = error => {
    if (closed || !error) return;
    closed = true;

    console.error(error);
    if (output) output.end();

    callback(error);
  };

  const execs = {};
  let execsCount = SOURCES.length;

  for (const source of SOURCES) {
    execs[source] = execFile('git',
      ['-C', options.path].concat(GIT_PARAMS[source]),
      EXEC_OPTIONS, errorHandler
    );
  }

  const commitsBuffer = [];
  let canWrite, outSize, separator;

  /**
   * Async write commits to output file.
   */
  const write = () => {
    if (commitsBuffer.length === 0) {
      canWrite = true;
      return;
    }

    if (output) {
      const data = JSON.stringify(commitsBuffer).slice(1, -1);
      outSize += data.length;

      if (outSize > MAX_OUT_SIZE) openNextFile(data.length);
      canWrite = output.write(separator + data);
    }

    if (options.r) {
      for (let i = 0, l = commitsBuffer.length; i < l; ++i)
        refs.commits[refs.commits.length] = commitsBuffer[i];
    }
    separator = ',';
    commitsBuffer.length = 0;
  };

  const refs = {},
        OUTPUT_REFS = refs.REFS = {},
        MAYBE_REFS = {};

  if (options.r) refs.commits = [];
  for (const ref of REFS) refs[ref] = {};

  const snip = {}, parse = {};
  for (const source of SOURCES) snip[source] = '';

  /**
   * Parse git references from text to JSON.
   */
  parse.refs = (data, isEnd) => {
    const refsList = (snip.refs + data).split(SEPARATOR);
    snip.refs = isEnd ? '' : refsList.pop();

    let lines, ref, reftype, refname, remote, i,
        j, email, obj, base;
    const len = refsList.length;

    for (j = 0; j < len; ++j) {
      ref = refsList[j].trim();

      if (ref === '') continue;

      lines = ref.split('\n');

      if (lines.length < 4) {
        console.error(`Wrong ref format:\n${ref}\n`);
        continue;
      }

      obj = {
        sha1: lines[0],
        type: lines[2],
        size: parseInt(lines[3])
      };
      reftype = undefined;
      refname = lines[1];

      for (i = 0; i < REFS.length; ++i) {
        if (refname.startsWith(FULL_REFS[i])) {
          reftype = REFS[i];
          refname = refname.slice(FULL_REFS[i].length);
          break;
        }
      }
      if (refname === 'refs/stash') reftype = refname = 'stash';

      if (!reftype) {
        console.error(`Unknown reftype (${refname}) in ref:\n${ref}\n`);
        continue;
      }

      if (reftype === 'remotes') {

        i = refname.indexOf('/');
        if (i < 1) {
          console.error(`Wrong refname (${refname}) in ref:\n${ref}\n`);
          continue;
        }
        remote  = refname.slice(0,  i);
        refname = refname.slice(i + 1);

        if (hasOwn.call(refs.remotes, remote)) {
          base = refs.remotes[remote];
        } else {
          base = refs.remotes[remote] = {};
        }

      } else if (reftype === 'stash') {
        base = refs;
      } else {
        base = refs[reftype];
      }

      if (hasOwn.call(base, refname)) {
        console.error(`Duplicate ref:\n${ref}\n`);
        continue;
      }

      base[refname] = obj;

      if (lines[ 9]) obj.upstream = lines[9];
      if (lines[10]) obj.push = lines[10];
      if (lines[11] === '*') obj.HEAD = true;

      if (obj.type !== 'tag') continue;

      if (lines.length < 9) {
        console.error(`Wrong tag format:\n${ref}\n`);
        continue;
      }

      email = lines[7];
      if (email[0] === '<' && email.slice(-1) === '>') {
        email = email.slice(1, -1);
      }
      obj.objecttype = lines[4];
      obj.object = lines[5];
      obj.tagger = {
        user: { name: lines[6], email },
        date: lines[8]
      };
      obj.message = lines.slice(12).join('\n');
    }
  };

  /**
   * Parse git commits from text to JSON.
   */
  parse.commits = (data, isEnd) => {
    const commits = (snip.commits + data).split(SEPARATOR);
    snip.commits = isEnd ? '' : commits.pop();

    let commit, lines, i, obj;
    const len = commits.length;

    for (i = 0; i < len; ++i) {
      commit = commits[i].trim();
      
      if (commit === '') continue;

      lines = commit.split('\n');

      if (lines.length < 10) {
        console.error(`Wrong commit format:\n${commit}\n`);
        continue;
      }

      obj = {
        sha1: lines[0].slice(7),
        parents: lines[1] ? lines[1].split(' ') : [],
        tree: lines[2],
        author: {
          user: { name: lines[3], email: lines[4] },
          date: lines[5]
        },
        committer: {
          user: { name: lines[6], email: lines[7] },
          date: lines[8]
        },
        message: lines.slice(18).join('\n')
      };

      if (lines[9] !== 'N') {
        obj.GPG = { type: lines[9] };
        if (lines[10]) obj.GPG.name = lines[10];
        if (lines[11]) obj.GPG.key  = lines[11];
      }

      if (lines[12]) obj.encoding = lines[12];

      if (lines[13]) (obj.reflog = obj.reflog || {}).selector = lines[13];
      if (lines[14]) (obj.reflog = obj.reflog || {}).name = lines[14];
      if (lines[15]) (obj.reflog = obj.reflog || {}).email = lines[15];
      if (lines[16]) (obj.reflog = obj.reflog || {}).message = lines[16];

      if (lines[17]) parseRefNames(lines[17], obj);

      commitsBuffer.push(obj);
    }

    if (canWrite) write();
  };

  /**
   * Parse string with ref names.
   * @param {string} str    String with refs for reading.
   * @param {Object} commit Commit object for writing.
   */
  const parseRefNames = (str, commit) => {
    for (const ref of str.split(', ')) {

      const parts = ref.split(' '),
            name = parts[parts.length - 1];

      switch(parts.length) {
        case 1:
          (commit.refs = commit.refs || []).push(name);

          if (/^[A-Z_]+$/.test(name)) {
            const refCommits =
              MAYBE_REFS[name] = MAYBE_REFS[name] || {};

            if (commit.sha1 in refCommits) {
              console.error(`duplicate commit for refname '${ref}'.`);
              continue;
            }
            refCommits[commit.sha1] = true;
          }
        break;
        case 2:
          if (parts[0] !== 'tag:') {
            console.error(`wrong tag name format: '${ref}'.`);
            continue;
          }
          (commit.tags = commit.tags || []).push(name);
        break;
        case 3:
          if (parts[1] !== '->') {
            console.error(`wrong branch name format: '${ref}'.`);
            continue;
          }
          (commit.refs = commit.refs || []).push(name);
          if (parts[0] in OUTPUT_REFS) {
            console.error(`duplicate REF name: '${ref}'.`);
            continue;
          }
          OUTPUT_REFS[parts[0]] = name;
        break;
        default:
          console.error(`wrong ref name format: '${ref}'.`);
      }
    }
  };

  /**
   * Mix MAYBE_REFS to OUTPUT_REFS.
   */
  const mixREFS = () => {
    LOOK_UP_REFS:
    for (const ref in MAYBE_REFS) {

      const branch = refs.heads[ref] && refs.heads[ref].sha1,
            commits = MAYBE_REFS[ref];

      if (branch) {
        if (!commits[branch]) {
          console.error(`cannot find branch '${ref}' in commit ${branch}.`);
        }
        commits[branch] = false;
      }

      let REF;
      for (const sha1 in commits) {
        if (!commits[sha1]) continue;
        commits[REF = sha1] = false;
        break;
      }
      if (ref in OUTPUT_REFS) {
        if (REF) {
          console.error(`refname '${ref}' is ambiguous:` +
            `\n ${OUTPUT_REFS[ref]}\n ${REF}\n`);
          continue;
        }
        REF = OUTPUT_REFS[ref];
      }

      for (const sha1 in commits) {
        if (commits[sha1]) {
          console.error(`excess commit for refname '${ref}':\n ${sha1}\n`);
          continue LOOK_UP_REFS;
        }
      }

      if (REF && branch) {
        console.log(`warning: refname '${ref}' is ambiguous.`);
      }
      if (REF) OUTPUT_REFS[ref] = REF;
    }
  };

  var output;
  let outCount = -1;
  const outParts = options.out.split('.'),
        outExt  = outParts.length > 1 ? '.' + outParts.pop() : '',
        outName = outParts.join('.');

  /**
   * Get name for next output file.
   * @return {string} Filename.
   */
  const getNextFileName = () =>
    outName + (++outCount ? '-' + outCount : '') + outExt;

  /**
   * Open next output file for writing.
   * @param {number} dataSize Starting data size.
   */
  const openNextFile  = dataSize => {
    outSize = dataSize;
    separator = '';

    if (output) output
      .removeListener('drain', write)
      .removeListener('error', errorHandler)
      .end(']}');

    output = createFile(getNextFileName())
      .on('error', errorHandler)
      .on('drain', write);

    canWrite = output.write('{"commits":[');
  };

  if (!options.no) openNextFile(0);

  /**
   * Get Promise callback.
   * @param  {function} resolve
   * @param  {function} reject
   * @return {function} Node-type callback.
   */
  const promiseCallback = (resolve, reject) => error => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  };


  /**
   * Write JSON to next output file.
   * @param  {Object} json Data for writing.
   * @return {Promise} Write promise.
   */
  const writeJSON = json => {
    if (options.no) return Promise.resolve();
    const file = createFile(getNextFileName());

    return new Promise((resolve, reject) => {
      file.end(
        JSON.stringify(json), 'utf8',
        promiseCallback(resolve, reject)
      );
    });
  };

  /**
   * Write big refs object to several files.
   * @return {Promise[]} Array with file-write promises.
   */
  const writeSeparateRefs = () => {
    const proms = [],
          keys = Object.keys(refs.tags),
          len = keys.length;
    let i = Math.round(
          (TOLERANCE_SIZE + MAX_OUT_SIZE - outSize)/MAX_REF_SIZE
        ),
        j = 0, tags = {};

    for(; i < len; ++i, ++j) {
      const key = keys[i];

      tags[key] = refs.tags[key];
      refs.tags[key] = undefined;

      if (j === MAX_OUT_REFS) {
        proms.push(writeJSON({ tags }));
        j = 0, tags = {};
      }
    }
    if (Object.keys(tags).length) proms.push(writeJSON({ tags }));
    return proms;
  };

  /**
   * Successful completion of writing. Write refs.
   */
  const close = () => {
    if (--execsCount || closed) return;
    write();
    closed = true;

    mixREFS();
    const proms = writeSeparateRefs();

    proms.push(output ?
      new Promise((resolve, reject) => {
        output
          .removeListener('drain', write)
          .removeListener('error', errorHandler)
          .end(
            '],' + JSON.stringify(refs).slice(1), 'utf8',
            promiseCallback(resolve, reject)
          );
      }) :
      Promise.resolve()
    );

    Promise.all(proms).then(
      options.r ?
        () => callback(null, refs) : () => callback(),
      error => callback(error)
    );
  };

  for (const source of SOURCES) {
    execs[source].on('close', () => {
      parse[source]('', true);
      close();
    });

    execs[source].stderr.on('data', data => {
      console.error(`Error with reading ${source}:\n${data}\n`);
    });

    execs[source].stdout.on('data', parse[source]);
  }

};

module.exports = fullGitHistory;

/**
 * If called from command line, execute with it args.
 */
if (require.main && require.main.id === module.id) {
  fullGitHistory(process.argv.slice(2));
}