'use strict'; /* global process */

const fullGitHistory = require('../src/full-git-history'),
      checkHistory   = require('./check-history');

const REPO = process.argv[2];

/**
 * Check that value is true.
 * @param  {*} value to check.
 * @param  {string} msg Message for logging.
 * @throws {Error} Throws, if value is not true.
 */
const assert = (value, msg) => {
  if (value !== true) throw Error('Assert ' + (msg || ''));
};

assert(
  fullGitHistory([REPO, '-no', '-r'], (error, history) => {

    assert(!error);
    assert(typeof checkHistory(history) === 'boolean');

    console.log(`\nOK. Get and check history from repository "${REPO}".`);

  }) === undefined
);