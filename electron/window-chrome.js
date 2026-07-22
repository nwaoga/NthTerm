const path = require('node:path');
const fs = require('node:fs');

const DEFAULT_TITLE_BAR_THEME = {
  windowBackground: '#00000000',
  color: '#00000000',
  symbolColor: '#dbe7f5',
  height: 66,
};

/** Keep traffic lights vertically centered in the 66px toolbar. */
const MAC_TRAFFIC_LIGHT_POSITION = { x: 14, y: 22 };

function resolveAppIconPath(options = {}) {
  const platform = options.platform || process.platform;
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const electronDir = options.electronDir || __dirname;

  const candidates =
    platform === 'darwin'
      ? [
          path.join(rootDir, 'build', 'icon.icns'),
          path.join(rootDir, 'build', 'icon.png'),
          path.join(electronDir, 'icon.png'),
        ]
      : [
          path.join(rootDir, 'build', 'icon.ico'),
          path.join(rootDir, 'build', 'icon.png'),
          path.join(electronDir, 'icon.ico'),
        ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function createBrowserWindowOptions(options = {}) {
  const platform = options.platform || process.platform;
  const theme = options.theme || DEFAULT_TITLE_BAR_THEME;
  const icon = options.icon !== undefined ? options.icon : resolveAppIconPath({ platform, ...options });
  const preloadPath = options.preloadPath;
  const isWin = platform === 'win32';
  const isMac = platform === 'darwin';

  return {
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#00000000',
    ...(isWin ? { backgroundMaterial: 'acrylic' } : {}),
    ...(isMac ? { vibrancy: 'under-window', visualEffectState: 'active' } : {}),
    ...(icon ? { icon } : {}),
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac ? { trafficLightPosition: { ...MAC_TRAFFIC_LIGHT_POSITION } } : {}),
    ...(isWin
      ? {
          titleBarOverlay: {
            color: theme.color,
            symbolColor: theme.symbolColor,
            height: theme.height,
          },
        }
      : {}),
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  };
}

function createDarwinApplicationMenuTemplate() {
  return [
    { role: 'appMenu' },
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ];
}

module.exports = {
  DEFAULT_TITLE_BAR_THEME,
  MAC_TRAFFIC_LIGHT_POSITION,
  resolveAppIconPath,
  createBrowserWindowOptions,
  createDarwinApplicationMenuTemplate,
};
