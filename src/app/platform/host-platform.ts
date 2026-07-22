export type HostPlatformId = 'win32' | 'darwin' | 'linux';

export function detectHostPlatform(
  desktopPlatform?: string | null,
  navigatorHint?: string | null
): HostPlatformId {
  const desktop = (desktopPlatform || '').trim().toLowerCase();
  if (desktop === 'win32' || desktop === 'darwin' || desktop === 'linux') {
    return desktop;
  }

  const hint = (navigatorHint || '').toLowerCase();
  if (hint.includes('mac')) {
    return 'darwin';
  }
  if (hint.includes('linux') || hint.includes('x11')) {
    return 'linux';
  }
  if (hint.includes('win')) {
    return 'win32';
  }

  return 'linux';
}

export function readDesktopPlatform(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return (window as Window & { nthTermDesktop?: { platform?: string } }).nthTermDesktop?.platform;
}

export function readNavigatorPlatformHint(): string {
  if (typeof navigator === 'undefined') {
    return '';
  }

  const uaNavigator = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };

  return uaNavigator.userAgentData?.platform || navigator.platform || navigator.userAgent || '';
}

export function resolveHostPlatform(): HostPlatformId {
  return detectHostPlatform(readDesktopPlatform(), readNavigatorPlatformHint());
}
