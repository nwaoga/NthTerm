const test = require('node:test');
const assert = require('node:assert/strict');

const { appendGitConfigEnv, buildTerminalSpawnEnv, GIT_COLOR_DEFAULTS } = require('./terminal-spawn-env');

test('buildTerminalSpawnEnv enables truecolor and tool color output', () => {
  const env = buildTerminalSpawnEnv({ PATH: 'C:\\Windows' }, { workspaceName: 'main work' });

  assert.equal(env.TERM, 'xterm-256color');
  assert.equal(env.COLORTERM, 'truecolor');
  assert.equal(env.FORCE_COLOR, '1');
  assert.equal(env.CLICOLOR_FORCE, '1');
  assert.equal(env.NPM_CONFIG_COLOR, 'always');
  assert.equal(env.NTH_TERM_WORKSPACE, 'main work');
  assert.equal(env.GIT_CONFIG_COUNT, String(GIT_COLOR_DEFAULTS.length));
  assert.equal(env.GIT_CONFIG_KEY_0, 'color.ui');
  assert.equal(env.GIT_CONFIG_VALUE_0, 'always');
  assert.equal(env.GIT_CONFIG_KEY_3, 'color.status.branch');
  assert.equal(env.GIT_CONFIG_VALUE_3, 'green bold');
  assert.equal(env.GIT_CONFIG_VALUE_8, 'magenta bold');
});

test('appendGitConfigEnv preserves existing git config slots', () => {
  const env = {
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'user.name',
    GIT_CONFIG_VALUE_0: 'NthTerm',
  };

  appendGitConfigEnv(env, [['color.ui', 'always']]);

  assert.equal(env.GIT_CONFIG_COUNT, '2');
  assert.equal(env.GIT_CONFIG_KEY_1, 'color.ui');
  assert.equal(env.GIT_CONFIG_VALUE_1, 'always');
});
