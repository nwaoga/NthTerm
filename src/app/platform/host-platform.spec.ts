import { detectHostPlatform } from './host-platform';

describe('detectHostPlatform', () => {
  it('prefers the Electron desktop platform when provided', () => {
    expect(detectHostPlatform('darwin', 'Win32')).toBe('darwin');
    expect(detectHostPlatform('win32', 'MacIntel')).toBe('win32');
    expect(detectHostPlatform('linux', 'MacIntel')).toBe('linux');
  });

  it('falls back to navigator hints', () => {
    expect(detectHostPlatform(undefined, 'MacIntel')).toBe('darwin');
    expect(detectHostPlatform(undefined, 'Win32')).toBe('win32');
    expect(detectHostPlatform(undefined, 'Linux x86_64')).toBe('linux');
  });
});
