'use strict'; /* global describe, it */
describe('full-git-history', function() {

const fs = require('fs'),
      fullGitHistory = require('../src/full-git-history'),
      checkHistory   = require('./check-history');


const assert = (value, msg) => {
  if (value !== true) throw Error('Assert ' + (msg || ''));
};

const assertUser = user => {

  assert(typeof user.date === 'string');
  assert(user.date.length === 25);

  user = user.user;

  assert(typeof user.name  === 'string');
  assert(typeof user.email === 'string');

  assert(user.name.length > 0);
  assert(user.email.includes('@'));
  assert(!user.email.includes('<'));
  assert(!user.email.includes('>'));

};

const hasOwn = Object.prototype.hasOwnProperty,
      TIMEOUT = 1024,
      GIT = 'test',
      TMP = `${GIT}/tmp/`,
      FILE = `${TMP}tmp.json`,
      OTHER = `${TMP}other.json`,
      NOT_EXISTS = `NOT_EXISTS_FILE.json`,
      EMPTY = `${TMP}empty.json`,
      INCORRECT = `${TMP}incorrect.json`,
      DEFAULT = 'history.json',
      REPO_ORIG = `${GIT}/git`,
      REPO = `${GIT}/.git`;

const TYPES = ['commit', 'tag', 'tree', 'blob'];

const clearFile = name =>
  fs.writeFileSync(name, '');

const readJSON = name =>
  JSON.parse(fs.readFileSync(name, 'utf8') || 'null');

/**
 * TODO:
 * -1-. Проверять, что все коммиты, кроме первого, имеют массив родителей
 * ненулевой длины; а первый коммит -- нулевой длины.
 *
 * -2-. Проверять, что каждая ссылка и каждая ветка указывают на
 * какой-либо существующий коммит.
 *
 * -3-. Проверить работу на очень больших репозиториях (склонировать из github,
 * или ещё откуда-то), в частности -- на репозиториях с ядром Линукса.
 *
 * -4-. Проверять, что все емейлы в коммитах не содержат символов <>.
 *
 * -5-. Наладить возможность прогонять тесты для любого репозитория,
 * по переданному пути.
 *
 * -6-. Получать поля upstream и push? Да, получать. А также поле body.
 * upstream и push -- поля--ссылки, в них не будет пробельных символов.
 * Чаще всего они пусты.
 *
 * -7-. Проверить подписанные коммиты, и удалённые ветки с трекингом (upstream).
 * Для этого создать удалённый репозиторий на github, и использовать GPG-подпись.
 *
 * -8-. Добавить вывод полей reflog для коммитов.
 *
 * -9-. Добавить проверку полей upstream и push (используя пункт 7).
 *
 * -10-. Ввести функцию проверки готового json-файла с историей (вместо пункта 5,
 * так как его реализовать не получается).
 *
 * -11-. Разрешить пустые сообщения в коммитах (в проверке json-файла оставить требование
 * непустоты).
 *
 * -12-. В проверку истории добавить более подробный вывод количества ссылок -- количество локальных веток,
 * количество удалённых веток по каждому удалённому репозиторию.
 *
 * -13-. Разрешить аннотированные теги без сообщений (то есть теги типа "tag", но с пустым body).
 * Точнее, решить проблему с ошибками в репозитории SublimeLinter3 (неформатные теги).
 *
 * -14-. При проверке файла с историей выводить количество подписанных коммитов, и количество локальных веток,
 * связанных с удалёнными.
 *
 * -15-. Перенести поля upstream и push в общие (но необязательные) поля всех ссылок. Обновить соответствующим
 * образом тесты и функцию проверки истории.
 *
 * -16-. Добавить вывод кодировки, вывод тегов, ветвей, и символьных ссылок (типа HEAD) к коммитам.
 *
 * -17-. Добавить вывод флага HEAD к ссылкам.
 *
 * -18-. Сделать GPG необязательным.
 *
 * -19-. В проверку истории добавить чекер для проверки полей REFS (и саму проверку этим чекером).
 * Проверять обратное включение -- что все ссылки из REFS ведут либо на существующие ветки (возможно,
 * удалённые), либо на коммиты, имеющие в refs данную ссылку.
 * Такую же проверку -- в test, в "has only refs from heads and remotes".
 */

describe('API', function() {

  it('exists', function() {

    try {
      /**
       * npm always ignore dir ".git", so we keep test repository in dir "git".
       */
      fs.renameSync(REPO_ORIG, REPO);
    } catch(e) {}

    assert(typeof fullGitHistory === 'function');

  });

  it('works without callback', function(done) {

    this.timeout(TIMEOUT + 1024);

    fullGitHistory(['test']);

    setTimeout(done, TIMEOUT);

  });

  it('works without args', function(done) {

    this.timeout(TIMEOUT + 1024);

    fullGitHistory([]);

    setTimeout(done, TIMEOUT);

  });

  it('throw without args array', function() {

    try {
      fullGitHistory();
    } catch(e) {
      return;
    }

    assert(false);

  });

  it('show usage with unknown args', function() {

    let log, called = false;

    try {
      log = console.log;
      console.log = message => {
        assert(!called);
        called = true;
        assert(message.startsWith('usage'));
      };
      fullGitHistory([GIT, 'A']);
      assert(called);
    } finally {
      console.log = log;
      return;
    }

    assert(false);

  });

  it('show usage with extra args', function() {

    let log, called = false;

    try {
      log = console.log;
      console.log = message => {
        assert(!called);
        called = true;
        assert(message.startsWith('usage'));
      };
      fullGitHistory([GIT, '-o', FILE, 'C']);
      assert(called);
    } finally {
      console.log = log;
      return;
    }

    assert(false);

  });

  it('show usage with extra args in custom order', function() {

    let log, called = false;

    try {
      log = console.log;
      console.log = message => {
        assert(!called);
        called = true;
        assert(message.startsWith('usage'));
      };
      fullGitHistory(['-o', FILE, GIT, 'C']);
      assert(called);
    } finally {
      console.log = log;
      return;
    }

    assert(false);

  });

  it('works with -o key', function(done) {

    this.timeout(TIMEOUT + 1024);

    fullGitHistory([GIT, '-o', FILE]);

    setTimeout(done, TIMEOUT);

  });

  it('works with -o key in front of path', function(done) {

    this.timeout(TIMEOUT + 1024);

    fullGitHistory(['-o', FILE, GIT]);

    setTimeout(done, TIMEOUT);

  });

  it('works with callback', function(done) {

    this.timeout(TIMEOUT);

    fullGitHistory(['-o', FILE, GIT], done);

  });

  it('works with callback with different order of args', function(done) {

    this.timeout(TIMEOUT);

    fullGitHistory([GIT, '-o', FILE], done);

  });

  it('send error arg to callback', function(done) {

    this.timeout(TIMEOUT);

    fullGitHistory(['./NOT_EXISTS', '-o', FILE], function(error) {
      if (error) done();
    });

  });

});

describe('fs', function() {

  it('create file', function(done) {

    clearFile(FILE);

    assert(readJSON(FILE) === null, 'check empty file');

    fullGitHistory([GIT, '-o', FILE], function(error) {

      if (error) throw error;

      assert(readJSON(FILE) instanceof Object);

      done();

    });
  });

  it('create file for default path', function(done) {

    clearFile(DEFAULT);

    assert(readJSON(DEFAULT) === null, 'check empty file');

    fullGitHistory([], function(error) {

      if (error) throw error;

      assert(readJSON(DEFAULT) instanceof Object);

      done();

    });
  });

  it('create file with given name for default path', function(done) {

    clearFile(DEFAULT);

    assert(readJSON(DEFAULT) === null, 'check empty file');

    fullGitHistory(['-o', DEFAULT], function(error) {

      if (error) throw error;

      assert(readJSON(DEFAULT) instanceof Object);

      done();

    });
  });

  it('create file with default filename', function(done) {

    clearFile(DEFAULT);

    assert(readJSON(DEFAULT) === null, 'check empty file');

    fullGitHistory([GIT], function(error) {

      if (error) throw error;

      assert(readJSON(DEFAULT) instanceof Object);

      done();

    });
  });

  it('create JSON with correct keys', function(done) {

    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], function(error) {

      if (error) throw error;

      const history = readJSON(FILE);

      assert(Array.isArray(history.commits));

      assert(history.heads   instanceof Object);
      assert(history.tags    instanceof Object);
      assert(history.remotes instanceof Object);

      done();

    });
  });

  it('works with absolute paths', function(done) {

    const AFILE = __dirname + '/tmp/atmp.json';
    const AGIT  = __dirname;

    clearFile(AFILE);

    fullGitHistory([AGIT, '-o', AFILE], function(error) {

      if (error) throw error;

      const history = readJSON(AFILE);

      assert(Array.isArray(history.commits));

      assert(history.heads   instanceof Object);
      assert(history.tags    instanceof Object);
      assert(history.remotes instanceof Object);

      done();

    });
  });

  it('create two files parallel', function(done) {

    clearFile(FILE); clearFile(OTHER);

    let calls = 0;

    const callback = error => {

      if (error) throw error;
      if (++calls !== 2) return;

      assert(readJSON(FILE ).commits.length ===
             readJSON(OTHER).commits.length);

      done();
    };

    fullGitHistory([GIT, '-o', FILE ], callback);
    fullGitHistory([GIT, '-o', OTHER], callback);
  });

});

describe('JSON', function() {

  it('get arrays of parents', function(done) {

    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      for (let commit of readJSON(FILE).commits)
        assert(Array.isArray(commit.parents));

      done();
    });
  });

  it('get correct number of parents', function(done) {

    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const commits = readJSON(FILE).commits;

      for (let i = 0; i < commits.length; ++i) {

        const len = commits[i].parents.length;

        if (i < commits.length - 1) {
          assert(len > 0, commits[i].sha1);
        } else {
          assert(len === 0, commits[i].sha1);
        }

      }

      done();
    });
  });

  it('get correct parents', function(done) {

    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const commits = readJSON(FILE).commits;

      for (let i = 0; i < commits.length; ++i) {

        const parents = commits[i].parents;

        for (const parent of parents) {
          assert(typeof parent === 'string');
          assert(parent.length === 40);
        }

      }

      done();
    });
  });

  it('get correct users', function(done) {

    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const history = readJSON(FILE),
            commits = history.commits,
            tags    = history.tags;

      for (let commit of commits) {

        assertUser(commit.author);
        assertUser(commit.committer);

      }

      for (let tag of Object.keys(tags)) {

        if ('tagger' in tags[tag])
          assertUser(tags[tag].tagger);

      }

      done();
    });
  });

  it('get commits with uniq sha1', function(done) {

    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const history = readJSON(FILE),
            commits = history.commits,
            commitsHash = {};

      for (let commit of commits) {

        let sha1 = commit.sha1;

        assert(typeof sha1 === 'string');
        assert(sha1.length === 40);

        assert(!commitsHash.hasOwnProperty(sha1));

        commitsHash[sha1] = true;

      }

      done();
    });

  });

  it('get all refs commits', function(done) {

    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const history = readJSON(FILE),
            commits = history.commits,
            tags    = history.tags,
            heads   = history.heads,
            remotes = history.remotes,
            commitsHash = {};

      let refs;

      for (let commit of commits) {

        commitsHash[commit.sha1] = true;

      }

      for (let ref of Object.keys(tags)) {
        if (tags[ref].type === 'commit') {
          assert(commitsHash[tags[ref].sha1], ref);
        }
      }

      for (let ref of Object.keys(heads)) {
        assert(commitsHash[heads[ref].sha1], ref);
      }

      for (let remote of Object.keys(remotes)) {
        refs = remotes[remote];

        for (let ref of Object.keys(refs)) {
          assert(commitsHash[refs[ref].sha1], ref);
        }
      }

      done();
    });
  });

});

describe('commits', function() {

  it('has correct tree', function(done) {
    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const commits = readJSON(FILE).commits;

      for (const commit of commits) {

        assert(typeof commit.tree === 'string');
        assert(commit.tree.length === 40);

      }

      done();
    });
  });

  it('has correct message', function(done) {
    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const commits = readJSON(FILE).commits;

      for (const commit of commits) {

        assert(typeof commit.message === 'string');
        assert(commit.message.length > 0);

      }

      done();
    });
  });

  it('has correct encoding', function(done) {
    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const commits = readJSON(FILE).commits;

      for (const commit of commits) {

        if (!commit.hasOwnProperty('encoding')) continue;

        assert(typeof commit.encoding === 'string');
        assert(commit.encoding.length > 0);

      }

      done();
    });
  });

  it('has correct tags', function(done) {
    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const commits = readJSON(FILE).commits;

      for (const commit of commits) {

        if (!commit.hasOwnProperty('tags')) continue;

        const tags = commit.tags;

        assert(Array.isArray(tags));

        for (const tag of tags) {
          assert(typeof tag === 'string');
          assert(tag.length > 0);
        }

      }
      done();
    });
  });

  it('has correct refs', function(done) {
    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const commits = readJSON(FILE).commits;

      for (const commit of commits) {

        if (!commit.hasOwnProperty('refs')) continue;

        const refs = commit.refs;

        assert(Array.isArray(refs));

        for (const branch of refs) {
          assert(typeof branch === 'string');
          assert(branch.length > 0);
        }

      }
      done();
    });
  });

  it('has exists tags', function(done) {
    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const { commits, tags } = readJSON(FILE);

      for (const commit of commits) {

        if (!commit.hasOwnProperty('tags')) continue;

        const ctags = commit.tags;

        for (const tag of ctags) {
          assert(hasOwn.call(tags, tag));
        }

      }
      done();
    });
  });

  it('has tags with correct sha1', function(done) {
    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const { commits, tags } = readJSON(FILE);

      for (const commit of commits) {

        if (!commit.hasOwnProperty('tags')) continue;

        const ctags = commit.tags;

        for (const tag of ctags) {

          const ref = tags[tag];
          assert(ref instanceof Object);
          if (ref.type === 'tag' && ref.objecttype === 'commit') {
            assert(ref.object === commit.sha1, `annotated tag: ${tag}`);
          }
          if (ref.type === 'commit') {
            assert(ref.sha1 === commit.sha1, `light tag: ${tag}`);
          }

        }
      }
      done();
    });
  });

  it('has exists refs', function(done) {
    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const { commits, heads, remotes, stash, REFS } = readJSON(FILE);

      for (const commit of commits) {

        if (!commit.hasOwnProperty('refs')) continue;

        const refs = commit.refs;

        for (const branch of refs) {

          if (hasOwn.call(heads, branch)) continue;
          if (hasOwn.call(REFS , branch)) continue;

          if (branch === 'refs/stash') {
            assert(stash instanceof Object);
            assert(commit.sha1 === stash.sha1);
            continue;
          }

          const index = branch.indexOf('/');
          assert(index > 0, `branch: ${branch}`);

          const remote = branch.slice(0, index),
                rbranch = branch.slice(index + 1);

          assert(
            hasOwn.call(remotes, remote),
            `branch: ${branch}, repo: ${remote}`
          );
          assert(
            hasOwn.call(remotes[remote], rbranch),
            `branch: ${branch}, repo: ${remote}, rbranch: ${rbranch}`
          );

        }
      }
      done();
    });
  });

  it('has refs with correct sha1', function(done) {
    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const { commits, heads, remotes, stash, REFS } = readJSON(FILE);

      for (const commit of commits) {

        if (!commit.hasOwnProperty('refs')) continue;

        const refs = commit.refs;

        for (const branch of refs) {

          if (hasOwn.call(heads, branch)) {

            const ref = heads[branch];
            assert(ref instanceof Object, `branch: ${branch}`);
            assert(ref.sha1 === commit.sha1, `sha1: ${ref.sha1}`);

            continue;
          }

          if (hasOwn.call(REFS, branch)) {

            let ref = REFS[branch];
            assert(typeof ref === 'string', `branch: ${branch}`);
            if (ref !== commit.sha1) {
              ref = heads[ref];
              assert(ref instanceof Object, `branch: ${branch}`);
              assert(ref.sha1 === commit.sha1, `sha1: ${ref.sha1}`);
            }

            continue;
          }

          if (branch === 'refs/stash') {
            assert(stash instanceof Object);
            assert(commit.sha1 === stash.sha1);
            continue;
          }

          const index = branch.indexOf('/');
          assert(index > 0, `branch: ${branch}`);

          const remote = branch.slice(0, index),
                rbranch = branch.slice(index + 1),
                repo = remotes[remote];

          assert(
            repo instanceof Object,
            `branch: ${branch}, repo: ${remote}`
          );
          assert(
            repo[rbranch] instanceof Object,
            `branch: ${branch}, repo: ${remote}, rbranch: ${rbranch}`
          );
          assert(
            repo[rbranch].sha1 === commit.sha1,
            `branch: ${branch}, sha1: ${repo[rbranch].sha1}`
          );

        }
      }
      done();
    });
  });


  it('has correct reflog', function(done) {
    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const commits = readJSON(FILE).commits;

      for (const commit of commits) {

        if (!commit.hasOwnProperty('reflog')) continue;

        const reflog = commit.reflog;

        assert(typeof reflog === 'object');
        if ('selector' in reflog)
          assert(reflog.selector && typeof reflog.selector === 'string');
        if ('name' in reflog)
          assert(reflog.name && typeof reflog.name === 'string');
        if ('email' in reflog)
          assert(reflog.email && typeof reflog.email === 'string');
        if ('message' in reflog)
          assert(reflog.message && typeof reflog.message === 'string');

      }
      done();
    });
  });

  it('has correct GPG', function(done) {
    clearFile(FILE);

    const GPGtypes = ['G', 'B', 'U'];

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const commits = readJSON(FILE).commits;

      for (const commit of commits) {

        if (!('GPG' in commit)) continue;

        const GPG = commit.GPG;

        assert(GPG instanceof Object);

        assert(GPGtypes.includes(GPG.type));

        if (GPG.hasOwnProperty('key')) {
          assert(typeof GPG.key === 'string');
          assert(GPG.key.length > 0);
        }

        if (GPG.hasOwnProperty('name')) {
          assert(typeof GPG.name === 'string');
          assert(GPG.name.length > 0);
        }

      }
      done();
    });
  });

});

describe('refs', function() {

  it('has correct base refs keys', function(done) {

    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const history = readJSON(FILE),
            refs = [
              history.heads,
              history.tags
            ];

      if (history.hasOwnProperty('stash')) {
        refs.push({stash: history.stash});
      }

      for (const remote in history.remotes) {
        refs.push(history.remotes[remote]);
      }

      for (let base of refs) {

        for (let refname of Object.keys(base)) {

          const ref = base[refname];

          assert(typeof ref.sha1 === 'string');
          assert(ref.sha1.length === 40);

          assert(typeof ref.type === 'string');
          assert(TYPES.includes(ref.type));

          assert(typeof ref.size === 'number');
          assert(ref.size > 0);

        }
      }
      done();
    });
  });

  it('has correct optional refs keys', function(done) {

    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const history = readJSON(FILE),
            refs = [
              history.heads,
              history.tags
            ];

      if (history.hasOwnProperty('stash')) {
        refs.push({stash: history.stash});
      }

      for (const remote in history.remotes) {
        refs.push(history.remotes[remote]);
      }

      for (let base of refs) {

        for (let refname of Object.keys(base)) {

          const ref = base[refname];

          if (ref.hasOwnProperty('upstream')) {
            assert(typeof ref.upstream === 'string');
            assert(ref.upstream.length > 0);
          }

          if (ref.hasOwnProperty('push')) {
            assert(typeof ref.push === 'string');
            assert(ref.push.length > 0);
          }

          if (ref.hasOwnProperty('HEAD')) {
            assert(ref.HEAD);
          }

        }
      }
      done();
    });

  });

  it('has only one HEAD', function(done) {

    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const history = readJSON(FILE),
            refs = [
              history.heads,
              history.tags
            ];

      let has_HEAD = false;

      if (history.hasOwnProperty('stash')) {
        refs.push({stash: history.stash});
      }

      for (const remote in history.remotes) {
        refs.push(history.remotes[remote]);
      }

      for (let base of refs) {

        for (let refname of Object.keys(base)) {

          const ref = base[refname];

          if (ref.hasOwnProperty('HEAD')) {
            assert(!has_HEAD);
            has_HEAD = true;
          }

        }
      }
      done();
    });
  });


  it('has type "commit", if it is not in tags', function(done) {

    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const history = readJSON(FILE),
            refs = [history.heads];

      if (history.hasOwnProperty('stash')) {
        refs.push({stash: history.stash});
      }

      for (const remote in history.remotes) {
        refs.push(history.remotes[remote]);
      }

      for (let base of refs) {

        for (let refname of Object.keys(base)) {

          const ref = base[refname];

          assert(ref.type === 'commit');

        }
      }
      done();
    });
  });

});

describe('tags', function() {

  it('has full annotated tags', function(done) {

    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const tags = readJSON(FILE).tags;


      for (let refname of Object.keys(tags)) {

        const ref = tags[refname];

        if (ref.type !== 'tag') continue;

        assert(TYPES.includes(ref.objecttype));

        assert(typeof ref.object === 'string');
        assert(ref.object.length === 40);

        assertUser(ref.tagger);

      }

      done();
    });
  });

});

describe('REFS', function() {

  it('exists', function(done) {

    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const REFS = readJSON(FILE).REFS;

      assert(REFS instanceof Object);

      done();

    });

  });

  it('has correct fields', function(done) {

    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const REFS = readJSON(FILE).REFS;

      for (const name in REFS) {
        const REF = REFS[name];
        assert(typeof REF === 'string');
        assert(REF.length > 0);
      }

      done();

    });

  });

  it('has only refs from heads and remotes', function(done) {

    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const { REFS, heads, remotes, commits } = readJSON(FILE);

      const commitsHash = {};
      commits.forEach(commit => commitsHash[commit.sha1] = commit);

      for (const name in REFS) {
        const REF = REFS[name];

        if (hasOwn.call(heads, REF)) continue;
        if (/^[A-Z_]+$/.test(name) && REF.length === 40) {

          const commit = commitsHash[REF];
          assert(commit instanceof Object);
          const refs = commit.refs;
          assert(refs instanceof Array);
          assert(refs.includes(name));

          continue;
        }

        const index = REF.indexOf('/');

        assert(index > 0);

        const remote = REF.slice(0, index),
              branch = REF.slice(index + 1),
              repo = remotes[remote];

        assert(repo instanceof Object);
        assert(hasOwn.call(repo, branch));

      }

      done();

    });

  });

  it('has refs to the same commits', function(done) {

    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const { REFS, heads, commits } = readJSON(FILE);

      const commitsHash = {};
      commits.forEach(commit => commitsHash[commit.sha1] = commit);

      for (const name in REFS) {
        const REF = REFS[name];

        if (!/^[a-f0-9]+$/.test(REF) || REF.length !== 40 ||
              REF in heads) continue;

        const commit = commitsHash[REF];
        assert(commit instanceof Object);
        const refs = commit.refs;
        assert(refs instanceof Array);
        assert(refs.includes(name));

      }

      done();

    });

  });

  it('has HEAD', function(done) {

    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const REFS = readJSON(FILE).REFS;

      assert(hasOwn.call(REFS, 'HEAD'));

      done();

    });

  });

  it('has correct HEAD', function(done) {

    clearFile(FILE);

    fullGitHistory([GIT, '-o', FILE], error => {

      if (error) throw error;

      const { REFS, heads } = readJSON(FILE),
            HEAD = REFS.HEAD,
            branch = heads[HEAD];

      if (branch) assert(branch.HEAD);

      done();

    });

  });

});


describe('check-history', function() {

  it('exists', function() {

    assert(typeof checkHistory === 'function');

  });

  it('return true for correct history', function() {

    assert(checkHistory(FILE));

  });

  it('throw for not exists file', function() {

    try {
      checkHistory(NOT_EXISTS);
    } catch (e) {
      return;
    }

    assert(false);
  });

  it('throw for empty history', function() {

    try {
      checkHistory(EMPTY);
    } catch (e) {
      return;
    }

    assert(false);
  });

  it('show usage without args', function() {

    let log, called = false;

    try {
      log = console.log;
      console.log = message => {
        assert(!called);
        called = true;
        assert(message.startsWith('usage'));
      };
      checkHistory();
      assert(called);
    } finally {
      console.log = log;
      return;
    }

    assert(false);

  });

  it('return false for incorrect history', function() {

    try {
      checkHistory(INCORRECT);
    } catch (e) {
      return;
    } finally {

      try {
        /**
         * Reverse the renaming.
         */
        fs.renameSync(REPO, REPO_ORIG);
      } catch(e) {}

    }

    assert(false);
  });
});

});