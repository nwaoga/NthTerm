const GIT_COLOR_DEFAULTS = [
  ['color.ui', 'always'],
  ['color.status', 'always'],
  ['color.status.header', 'bold'],
  ['color.status.branch', 'green bold'],
  ['color.status.nobranch', 'red bold'],
  ['color.status.localBranch', 'green bold'],
  ['color.status.remoteBranch', 'yellow bold'],
  ['color.status.changed', 'red bold'],
  ['color.status.untracked', 'magenta bold'],
  ['color.status.added', 'green bold'],
  ['color.status.updated', 'green bold'],
  ['color.branch', 'green bold'],
  ['color.diff.meta', 'yellow bold'],
  ['color.diff.frag', 'cyan bold'],
  ['color.grep.match', 'yellow bold'],
];

function appendGitConfigEnv(env, entries) {
  const existingCount = Number.parseInt(env.GIT_CONFIG_COUNT || '0', 10) || 0;

  entries.forEach(([key, value], index) => {
    const slot = existingCount + index;
    env[`GIT_CONFIG_KEY_${slot}`] = key;
    env[`GIT_CONFIG_VALUE_${slot}`] = value;
  });

  env.GIT_CONFIG_COUNT = String(existingCount + entries.length);
}

function buildTerminalSpawnEnv(processEnv = process.env, options = {}) {
  const env = {
    ...processEnv,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    FORCE_COLOR: '1',
    CLICOLOR: '1',
    CLICOLOR_FORCE: '1',
    NPM_CONFIG_COLOR: 'always',
    GCM_COLOR: 'always',
  };

  appendGitConfigEnv(env, GIT_COLOR_DEFAULTS);

  if (options.workspaceName) {
    env.NTH_TERM_WORKSPACE = options.workspaceName;
  }

  return env;
}

module.exports = {
  GIT_COLOR_DEFAULTS,
  appendGitConfigEnv,
  buildTerminalSpawnEnv,
};
