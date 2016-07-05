#!/usr/bin/env node

'use strict'; /* global process */

const fs = require('fs');

/**
 * Check history JSON for correct.
 * @param  {string} FILE Name of file to check.
 * @return {boolean} true, if history is correct.
 */
const checkHistory = module.exports = FILE => {
  log(`Check git history in ${FILE}`);

  /**
   * Read history.
   */
  const history = readHistory(FILE),
        time = Date.now();

  /**
   * Check history.
   */
  checkKeys(history, 5, 6);

  const { commits, remotes, tags, heads, stash, REFS } = history,
        commitOptions = { tags, heads, remotes, stash, REFS, key: 'sha1' };

  const commitsCheck = check(commits, checkCommit, commitOptions);
  let errors = commitsCheck.errors, len;

  const refOptions = {
          commitsHash: commitsCheck.hash,
          heads,
          canHasHEAD: true
        },
        remoteLen = {},
        optionalLen = { upstream: 0, push: 0 };

  const branches = Object.keys(heads).map(key => heads[key]),
        localLen = branches.length;
  for (const remote in remotes) {
    remoteLen[remote] = 0;
    for (const branch in remotes[remote]) {
      branches.push(remotes[remote][branch]);
      ++remoteLen[remote];
    }
  }
  if (stash) branches.push(stash);
  const branchesCheck = check(branches, checkBranch, refOptions);
  errors += branchesCheck.errors;

  refOptions.canHasHEAD = false;
  const tagsList = Object.keys(tags).map(tag => tags[tag]);
  errors += check(tagsList, checkRef, refOptions).errors;

  const anTags = tagsList.filter(tag => tag.tagger);
  errors += check(anTags, checkAnnotatedRef).errors;

  const REFSlist = Object.keys(REFS).map(name => ({
    name, REF: REFS[name]
  }));
  errors += check(REFSlist, checkREF, refOptions).errors;

  /**
   * Log time.
   */
  log(`Check history in ${humanTime(Date.now() - time)}`);

  /**
   * Log total commits.
   */
  len = commits.length;
  log(`${len} commit${plural(len)}`);
  log(`(first: ${commits[len - 1].author.date}`);
  log(` last : ${commits[0].committer.date})`);

  /**
   * Log GPG commits.
   */
  const GPGLen = { N: 0 },
        GPGtypes = { UN: 'unknown' };

  ['Good', 'Bad', 'untrusted'].forEach(name => {
    const key = name[0].toUpperCase();

    GPGLen[key] = 0;
    GPGtypes[key] = name;
  });

  commits.forEach(commit => {
    ++GPGLen[(commit.GPG && commit.GPG.type) || 'N'];
  });

  for (const key in GPGtypes) {
    if (key === 'UN') {
      len = GPGLen.G + GPGLen.B + GPGLen.U + GPGLen.N - commits.length;
    } else {
      len = GPGLen[key];
    }
    if (len) {
      log(`${len} signed commit${plural(len)} with ${GPGtypes[key]} signature`);
    }
  }

  /**
   * Log reflog and encoding commits.
   */
  len = 0;
  commits.forEach(commit => commit.reflog && ++len);
  if (len) log(`${len} commit${plural(len)} with reflog`);

  len = 0;
  commits.forEach(commit => commit.encoding && ++len);
  if (len) log(`${len} commit${plural(len)} with non standard encoding`);

  /**
   * Log branches.
   */
  log(`${localLen} local branch${plurale(len)}`);
  for (const remote in remoteLen) {
    len = remoteLen[remote];
    log(`${len} ${remote}/* branch${plurale(len)}`);
  }
  if (!Object.keys(remoteLen).length) log(`No remote branches`);

  branches.forEach(ref => {
    if (ref.upstream) optionalLen.upstream++;
    if (ref.push) optionalLen.push++;
  });

  len = optionalLen.upstream;
  if (len) log(`${len} tracking branch${plurale(len)}`);

  len = optionalLen.push;
  if (len) log(`${len} branch${plurale(len)} with @{push}`);

  /**
   * Log HEAD.
   */
  if ('HEAD' in REFS) {
    const HEAD = REFS.HEAD;
    if (hasOwn.call(heads, HEAD)) {
      if (heads[HEAD] && heads[HEAD].sha1 === branchesCheck.HEAD) {
        log(`HEAD is now at ${HEAD}`);
      } else {
        log(`HEAD is not at ${HEAD}`);
      }
    } else {
      log(`Detached HEAD is now at ${HEAD}`);
    }
  } else {
    log(`No HEAD!`);
  }
  if (branchesCheck.HEAD) {
    log(`HEAD sha1: ${branchesCheck.HEAD}`);
  } else {
    log(`No HEAD in refs`);
  }

  /**
   * Log REFS.
   */
  log(`REFS:`);
  for (const name in REFS) {
    log(`  ${name} -> ${REFS[name]}`);
  }

  /**
   * Log tags.
   */
  len = tagsList.length;
  log(`${len} tag${plural(len)}`);
  len = anTags.length;
  log(`${len} annotated tag${plural(len)}`);
  for (const key in optionalLen) optionalLen[key] = 0;
  tagsList.forEach(ref => {
    if (ref.upstream) optionalLen.upstream++;
    if (ref.push) optionalLen.push++;
  });

  len = optionalLen.upstream;
  if (len) log(`${len} tracking tag${plural(len)}`);

  len = optionalLen.push;
  if (len) log(`${len} tag${plurale(len)} with @{push}`);

  /**
   * Log total errors.
   */
  if (errors) {
    log(`FAIL: ${errors} error${plural(errors)}`);
  } else {
    log(`OK. No errors`);
  }

  return !errors;
};

/**
 * Check branch object.
 * @param  {Object} ref Object to check.
 * @param  {Object=} options Options object.
 */
const checkBranch = (ref, options) => {
  checkRef(ref, options);
  assert(ref.type === 'commit', `type is commit: ${ref.type}`);
};

/**
 * Check ref base keys.
 * @param  {Object} ref Object to check.
 * @param  {Object=} options Options object.
 */
const checkRef = (ref, options) => {
  checkKeys(ref, 3, 4, 5, 6, 7, 8, 9, 10);
  checkSha1(ref.sha1);
  checkType(ref.type);
  checkNumber(ref.size);
  if ('upstream' in ref) checkStr(ref.upstream);
  if ('push' in ref) checkStr(ref.push);
  if ('HEAD' in ref) checkHEAD(ref, options);
  checkCommitsExist(ref, options.commitsHash);
};

/**
 * Check tag ref.
 * @param  {Object} ref Ref object to check.
 */
const checkAnnotatedRef = ref => {
  checkType(ref.objecttype);
  checkSha1(ref.object);
  checkUser(ref.tagger);
  checkStr(ref.message);
  assert(ref.type === 'tag', `type is tag: ${ref.type}`);
};

/**
 * Check commit object.
 * @param  {Object} commit Object to check.
 * @param  {Object=} options Options object.
 */
const checkCommit = (commit, options) => {
  checkKeys(commit, 6, 7, 8, 9, 10, 11);
  checkSha1(commit.sha1);
  checkParents(commit.parents, options.isLast);
  checkSha1(commit.tree);
  checkUser(commit.author);
  checkUser(commit.committer);
  checkStr(commit.message);
  if ('GPG' in commit) checkGPG(commit.GPG);
  if ('reflog' in commit) checkReflog(commit.reflog);
  if ('encoding' in commit) checkStr(commit.encoding);
  if ('tags' in commit) checkTags(commit, options);
  if ('refs' in commit) checkRefs(commit, options);
};

/**
 * Check list of tags.
 * @param {Object} commit Commit object to check.
 * @param {Object} options Options object.
 */
const checkTags = (commit, options) => {
  checkStrList(commit.tags);
  const tagsHash = options.tags;
  for (const tag of commit.tags) {
    assert(hasOwn.call(tagsHash, tag), `not found: ${tag}`);
    checkLink(tagsHash[tag], commit);
  }
};

/**
 * Check commit's refs list.
 * @param {Object} commit Commit object to check.
 * @param {Object} options Options object.
 */
const checkRefs = (commit, options) => {
  checkStrList(commit.refs);
  const { heads, remotes, stash, REFS } = options;
  for (const branch of commit.refs) {

    if (hasOwn.call(heads, branch)) {
      checkLink(heads[branch], commit);
      continue;
    }

    if (hasOwn.call(REFS, branch)) {
      const ref = REFS[branch];
      checkStr(ref);
      if (ref !== commit.sha1) checkLink(heads[ref], commit);
      continue;
    }

    if (branch === 'refs/stash') {
      checkLink(stash, commit);
      continue;
    }

    const index = branch.indexOf('/'),
          repo = branch.slice(0, index),
          rbranch = branch.slice(index + 1),
          remote = remotes[repo];

    assert(index > 0, `index <= 0: ${index}`);
    assertObject(remote);
    assert(
      hasOwn.call(remote, rbranch),
      `branch is not in remote: ${rbranch}`
    );
    checkLink(remote[rbranch], commit);
  }
};

/**
 * Check REF element.
 * @param {{name: string, REF: string}} refitem
 * @param {{commitsHash: Object, heads: Object}} options
 */
const checkREF = ({ REF, name }, { commitsHash, heads }) => {
  checkStr(name);
  checkStr(REF );
  assert(/^[A-Z_]+$/.test(name), `incorrect REF name: ${name}`);

  if (!/^[a-f0-9]+$/.test(REF) || REF.length !== 40 || REF in heads) {
    return;
  }

  const commit = commitsHash[REF];
  assertObject(commit);

  const refs = commit.refs;
  assert(isArray(refs), `refs is not an array in commit ${REF}`);

  assert(
    refs.indexOf(name) >= 0,
    `ref '${name}' do not link to commit ${REF}`
  );
};

/**
 * Check that ref is linked with commit.
 * @param {Object} ref    Ref object.
 * @param {Object} commit Commit object.
 */
const checkLink = (ref, commit) => {
    assertObject(ref);
    let key;
    if (ref.type === 'commit') key = 'sha1';
    if (ref.objecttype === 'commit') key = 'object';
    if (key) assert(
      ref[key] === commit.sha1,
      `${ref.type} ref do not link to commit ${commit.sha1}`
    );
};

/**
 * Check that commits from ref exists.
 * @param {Object} ref  ref object.
 * @param {Object} hash Hash with all commits.
 */
const checkCommitsExist = (ref, hash) => {
  if (ref.type === 'commit')
    assert(ref.sha1 in hash, `not found: ${ref.sha1}`);

  if (ref.objecttype === 'commit')
    assert(ref.object in hash, `not found in tag: ${ref.object}`);
};

/**
 * Check HEAD field in ref.
 * @param  {Object} ref     ref object.
 * @param  {Object} options Options object.
 */
const checkHEAD = (ref, options) => {
  assert(options.canHasHEAD, `HEAD -> ${ref.type}`);
  assert(
    !options.HEAD,
    `Duplicate HEAD:\n ${options.HEAD}\n ${ref.sha1}`
  );
  assert(ref.HEAD, `HEAD: ${ref.HEAD}`);
  options.HEAD = ref.sha1;
};

/**
 * Check reflog object
 * @param  {Object} reflog Reflog object to check.
 */
const checkReflog = reflog => {
  checkKeys(reflog, 1, 2, 3, 4);
  if ('selector' in reflog) checkStr(reflog.selector);
  if ('name' in reflog) checkStr(reflog.name);
  if ('email' in reflog) checkStr(reflog.email);
  if ('message' in reflog) checkStr(reflog.message);
};

const TYPES = ['commit', 'tag', 'tree', 'blob'],
      hasOwn = TYPES.hasOwnProperty;

const log = console.log.bind(console);

/**
 * Check that value is true.
 * @param  {*} value to check.
 * @param  {string} msg Message for logging.
 * @throws {Error} Throws, if value is not true.
 */
const assert = (value, msg) => {
  if (value !== true) throw Error(msg);
};

/**
 * Check js-type of value.
 * @param  {*} value to check.
 * @param  {string} type for comparing.
 */
const assertType = (value, type) => {
  assert(typeof value === type, `type ${value}:${type}`);
};

/**
 * Check that argument is native object.
 * @param  {*} obj Value to check.
 */
const assertObject = obj => {
  assert(obj instanceof Object, `is not an object: ${obj}`);
};

/**
 * Check list of values by checker.
 * @param  {Array} list Values to check.
 * @param  {function(*)} checker Check one value.
 * @param  {Object=} options Object for passing to checker.
 * @return  {{errors: number, hash: Object}}
 */
const check = (list, checker, options) => {
  const res  = { errors: 0 },
        hash = res.hash = {},
        len  = list.length;

  if (!options) options = {};

  let i, item;

  for (i = 0; i < len; ++i) try {
    item = list[i];

    if (options.key) {
      const id = item[options.key];
      checkStr(id);
      assert(
        !hasOwn.call(hash, id),
        `duplicate key;
         new:${item}
         old:${hash[id]}`
      );
      hash[id] = item;
    }

    options.isLast = i === len - 1;
    checker(item, options);

  } catch (checkError) {
    ++res.errors;
    log(``);
    log(item);
    log(`has ${checkError.stack}\n`);
  }

  if (options.HEAD) {
    res.HEAD = options.HEAD;
    delete options.HEAD;
  }

  return res;
};

/**
 * Check user object (autor, commiter, tagger)
 * @param {Object} user Object to check.
 */
const checkUser = user => {
  checkKeys(user, 2);
  checkDate(user.date);

  user = user.user;

  checkKeys(user, 2);
  checkStr(user.name);
  checkEmail(user.email);
};

/**
 * Check date format (should be strict ISO 8601).
 * @param {string} date Date to check.
 */
const checkDate = date => {
  assert(
    /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d[\-+]\d\d:\d\d$/.test(date),
    `date in not in ISO 8601 format: ${date}`
  );
};

/**
 * Check that email is correct.
 * @param {string} email to check.
 */
const checkEmail = email => {
  checkStr(email);
  assert(email.indexOf('@') > 0, `@ not in email (${email})`);
  assert(email.indexOf('<') === -1, `< in email (${email})`);
  assert(email.indexOf('>') === -1, `> in email (${email})`);
};

/**
 * Check GPG object.
 * @param {Object} GPG Object to check.
 */
const checkGPG = GPG => {
  checkStr(GPG.type, 1);

  if ('name' in GPG) checkStr(GPG.name);
  if ('key'  in GPG) checkStr(GPG.key );
};

/**
 * Check parenst list.
 * @param {string[]} parents Array of parents sha1.
 * @param {boolean=} isLast True, if commit is initial.
 */
const checkParents = (parents, isLast) => {
  assert(isArray(parents), parents);

  assert(
    isLast != parents.length,
    `length of parents (${parents}) is ${isLast ? 'not ' : ''}0`
  );

  for (const parent of parents) checkSha1(parent);
};

/**
 * Check that number is positive.
 * @param {number} num Number to check.
 */
const checkNumber = num => {
  assertType(num, 'number');
  assert(isFinite(num), `${num} not finite`);
  assert(num > 0, `${num} <= 0`);
};

/**
 * Check list of strings.
 * @param {string[]} list List of strings to check.
 * @param {number=} len  The expected length of strings.
 */
const checkStrList = (list, len) => {
  assert(isArray(list), `${list} is not an array`);
  for (const str of list) checkStr(str, len);
};

/**
 * Check that str in not empty.
 * @param  {string} str to check.
 * @param  {number=} len The expected length of str.
 */
const checkStr = (str, len) => {
  assertType(str, 'string');
  assert(
    len ? str.length === len : str.length > 0,
    `length of string (${str}) not ${len || '> 0'}`
  );
};

/**
 * Check number of object keys.
 * @param  {Object} obj Object to check.
 * @param  {number[]} rest Possible number of keys.
 */
const checkKeys = (obj, ...rest) => {
  assertObject(obj);
  const len = Object.keys(obj).length;

  for (const num of rest)
    if (num === len) return;

  assert(false, `number of keys (${len}) not in ${rest}`);
};

/**
 * Check type of git-object.
 * @param  {string} type to check.
 */
const checkType = type => {
  assert(TYPES.indexOf(type) !== -1, type);
};

/**
 * Check sha1 string.
 * @param  {string} sha1 to check.
 */
const checkSha1 = sha1 => {
  checkStr(sha1, 40);
  assert(/^[a-f0-9]+$/.test(sha1), `test: ${sha1}`);
};

const isArray = Array.isArray;

/**
 * Get correct suffix for number.
 * @param  {number} number
 * @return {string} 's' or ''
 */
const plural = number => number === 1 ? '' : 's';

/**
 * Get correct suffix for word "branch", etc.
 * @param  {number} number
 * @return {string} 'es' or ''
 */
const plurale = number => plural(number) ? 'es' : '';

/**
 * Sync reading JSON from filesystem.
 * @param  {string} name Filename.
 * @return {?Object} Parsed JSON value (null if no such file).
 */
const readJSON = name => {
  try {
    return JSON.parse(fs.readFileSync(name, 'utf8'));
  } catch(e) { return null; }
};

/**
 * Convert time in ms to second.
 * @param  {number} time Time interval in ms.
 * @return {string} String with this interval in seconds.
 */
const humanTime = time => `${(time/1000).toFixed(3)} sec`;

/**
 * Read git history from one or several files.
 * @param  {string} name Name of file with history.
 * @return {?Object} History object or null.
 */
const readHistory = name => {
  let outCount = 0, history = null;
  const outParts = name.split('.'),
        outExt  = outParts.length > 1 ? '.' + outParts.pop() : '',
        outName = outParts.join('.');

  while(true) {
    const time = Date.now(),
          file = outName + (outCount ? '-' + outCount : '') + outExt,
          json = readJSON(file);

    if (!json) return history;
    console.log(`Load and parse ${file} in ${humanTime(Date.now() - time)}`);
    outCount++;

    if (!history) history = {};

    for (const key in json) {
      const value = json[key];

      if (isArray(value)) {
        const list = history[key] = history[key] || [],
              l = value.length;

        let i = 0;
        for (; i < l; ++i) list[list.length] = value[i];

      } else {

        if (!hasOwn.call(history, key)) {
          history[key] = value;
          continue;
        }

        const target = history[key];
        if (!(value  instanceof Object) ||
            !(target instanceof Object)) {
          log(`Duplicate key ${key} in file ${file}`);
          continue;
        }

        for (const prop in value) {
          if (hasOwn.call(target, prop)) {
            log(`Duplicate property ${prop} for key ${key} in file ${file}`);
          } else {
            target[prop] = value[prop];
          }
        }
      }
    }
  }
};

/**
 * If called from command line, execute with it args.
 */
if (require.main && require.main.id === module.id) {
  checkHistory(process.argv[2]);
}