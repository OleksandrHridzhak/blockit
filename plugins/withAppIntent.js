const { withXcodeProject, withDangerousMod, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SWIFT_FILE_NAME = 'ShouldInterceptIntent.swift';

/**
 * Copies `ios-native/ShouldInterceptIntent.swift` into the generated iOS main target
 * directory (`ios/<ProjectName>/ShouldInterceptIntent.swift`) and registers it in
 * the main application target's PBXSourcesBuildPhase so Xcode's `appintentsmetadataprocessor`
 * emits `Metadata.appintents` inside `Blockit.app`.
 */
function withAppIntent(config) {
  config = withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const projectName = modConfig.modRequest.projectName;
      const srcPath = path.join(projectRoot, 'ios-native', SWIFT_FILE_NAME);
      const destDir = path.join(modConfig.modRequest.platformProjectRoot, projectName);
      const destPath = path.join(destDir, SWIFT_FILE_NAME);

      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(srcPath, destPath);
      return modConfig;
    },
  ]);

  config = withXcodeProject(config, (modConfig) => {
    const project = modConfig.modResults;
    const projectName = modConfig.modRequest.projectName;
    const fileRelativePath = `${projectName}/${SWIFT_FILE_NAME}`;

    IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
      filepath: fileRelativePath,
      groupName: projectName,
      project,
    });

    return modConfig;
  });

  return config;
}

module.exports = withAppIntent;
