const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  MAC_TRAFFIC_LIGHT_POSITION,
  createBrowserWindowOptions,
  createDarwinApplicationMenuTemplate,
  resolveAppIconPath,
} = require('./window-chrome');

test('Windows window options use acrylic overlay chrome', () => {
  const options = createBrowserWindowOptions({
    platform: 'win32',
    icon: undefined,
    preloadPath: path.join(__dirname, 'preload.js'),
  });

  assert.equal(options.titleBarStyle, 'hidden');
  assert.equal(options.backgroundMaterial, 'acrylic');
  assert.equal(options.backgroundColor, '#00000000');
  assert.ok(options.titleBarOverlay);
  assert.equal(options.vibrancy, undefined);
  assert.equal(options.trafficLightPosition, undefined);
});

test('macOS window options use inset traffic lights and vibrancy', () => {
  const options = createBrowserWindowOptions({
    platform: 'darwin',
    icon: undefined,
    preloadPath: path.join(__dirname, 'preload.js'),
  });

  assert.equal(options.titleBarStyle, 'hiddenInset');
  assert.deepEqual(options.trafficLightPosition, MAC_TRAFFIC_LIGHT_POSITION);
  assert.equal(options.vibrancy, 'under-window');
  assert.equal(options.backgroundMaterial, undefined);
  assert.equal(options.titleBarOverlay, undefined);
});

test('darwin application menu template includes standard roles', () => {
  const template = createDarwinApplicationMenuTemplate();
  const roles = template.map((item) => item.role);

  assert.deepEqual(roles, ['appMenu', 'fileMenu', 'editMenu', 'viewMenu', 'windowMenu']);
});

test('resolveAppIconPath prefers platform-appropriate branding assets', () => {
  const rootDir = path.join(__dirname, '..');
  const windowsIcon = resolveAppIconPath({ platform: 'win32', rootDir, electronDir: __dirname });
  const macIcon = resolveAppIconPath({ platform: 'darwin', rootDir, electronDir: __dirname });

  assert.match(windowsIcon || '', /icon\.(ico|png)$/);
  assert.match(macIcon || '', /icon\.(icns|png)$/);
});
