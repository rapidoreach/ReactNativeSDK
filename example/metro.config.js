const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

function escapeRegex(string) {
  return string.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

const root = path.resolve(__dirname, '..');
const pkg = require('../package.json');
const peerDependencies = Object.keys(pkg.peerDependencies ?? {});

const config = {
  projectRoot: __dirname,
  watchFolders: [root],
  resolver: {
    blockList:
      peerDependencies.length > 0
        ? new RegExp(
            peerDependencies
              .map(
                (name) =>
                  `^${escapeRegex(
                    path.join(root, 'node_modules', name)
                  )}[\\\\/].*$`
              )
              .join('|')
          )
        : undefined,
    extraNodeModules: peerDependencies.reduce((acc, name) => {
      acc[name] = path.join(__dirname, 'node_modules', name);
      return acc;
    }, {}),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
