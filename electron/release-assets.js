'use strict';

/**
 * Filenames produced by electron-builder for the configured Win/mac targets
 * using package.json build.artifactName: ${productName}-${version}-${os}-${arch}.${ext}
 */
function expectedReleaseAssetNames(version, productName = 'NthTerm') {
  if (typeof version !== 'string' || !version.trim()) {
    throw new TypeError('version is required');
  }

  const name = productName || 'NthTerm';
  return [
    `${name}-${version}-win-x64.exe`,
    `${name}-${version}-win-x64.zip`,
    `${name}-${version}-mac-arm64.dmg`,
    `${name}-${version}-mac-arm64.zip`,
    `${name}-${version}-mac-x64.dmg`,
    `${name}-${version}-mac-x64.zip`,
  ];
}

module.exports = {
  expectedReleaseAssetNames,
};
