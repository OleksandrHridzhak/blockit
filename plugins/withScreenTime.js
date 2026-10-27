const { withEntitlementsPlist, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const GROUP = 'group.com.hridzhak.blockit.2WT689Y795';
const TARGETS = [
  ['BlockitShield', 'ShieldConfigurationExtension', 'com.apple.ManagedSettingsUI.shield-configuration-service'],
  ['BlockitAction', 'ShieldActionExtension', 'com.apple.ManagedSettings.shield-action-service'],
  ['BlockitMonitor', 'DeviceActivityMonitorExtension', 'com.apple.deviceactivity.monitor-extension'],
];
module.exports = function withScreenTime(config) {
  // EAS must discover extension credentials before CNG generates Xcode targets.
  config.extra ??= {};
  config.extra.eas ??= {};
  config.extra.eas.build ??= {};
  config.extra.eas.build.experimental ??= {};
  config.extra.eas.build.experimental.ios ??= {};
  const iosBuild = config.extra.eas.build.experimental.ios;
  const names = new Set(TARGETS.map(([name]) => name));
  iosBuild.appExtensions = [
    ...(iosBuild.appExtensions || []).filter(extension => !names.has(extension.targetName)),
    ...TARGETS.map(([targetName]) => ({
      targetName,
      bundleIdentifier: `${config.ios.bundleIdentifier}.${targetName}`,
      entitlements: {
        'com.apple.developer.family-controls': true,
        'com.apple.security.application-groups': [GROUP],
      },
    })),
  ];
  config = withEntitlementsPlist(config, c => {
    c.modResults['com.apple.developer.family-controls'] = true;
    c.modResults['com.apple.security.application-groups'] = [GROUP];
    return c;
  });
  return withXcodeProject(config, c => {
    const project = c.modResults;
    const root = c.modRequest.platformProjectRoot;
    const sourceRoot = c.modRequest.projectRoot;
    // xcode.addTargetDependency silently does nothing if these sections are absent
    // (a fresh Expo template has no target dependencies).
    project.hash.project.objects.PBXTargetDependency ??= {};
    project.hash.project.objects.PBXContainerItemProxy ??= {};
    for (const [name, className, point] of TARGETS) {
      const folder = path.join(root, name);
      fs.mkdirSync(folder, { recursive: true });
      fs.copyFileSync(path.join(sourceRoot, 'ios-native', 'screen-time', `${className}.swift`), path.join(folder, `${className}.swift`));
      fs.copyFileSync(path.join(sourceRoot, 'modules', 'blockit-bridge', 'ios', 'ScreenTimeStore.swift'), path.join(folder, 'ScreenTimeStore.swift'));
      fs.copyFileSync(path.join(sourceRoot, 'modules', 'blockit-bridge', 'ios', 'AccessWindow.swift'), path.join(folder, 'AccessWindow.swift'));
      fs.copyFileSync(path.join(sourceRoot, 'modules', 'blockit-bridge', 'ios', 'PauseHistory.swift'), path.join(folder, 'PauseHistory.swift'));
      const plist = require('@expo/plist').default;
      fs.writeFileSync(path.join(folder, 'Info.plist'), plist.build({
        CFBundleDisplayName: name, CFBundleExecutable: '$(EXECUTABLE_NAME)',
        CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)', CFBundleInfoDictionaryVersion: '6.0',
        CFBundleName: '$(PRODUCT_NAME)', CFBundlePackageType: 'XPC!',
        CFBundleShortVersionString: '$(MARKETING_VERSION)', CFBundleVersion: '$(CURRENT_PROJECT_VERSION)',
        NSExtension: { NSExtensionPointIdentifier: point, NSExtensionPrincipalClass: `$(PRODUCT_MODULE_NAME).${className}` },
      }));
      fs.writeFileSync(path.join(folder, `${name}.entitlements`), plist.build({
        'com.apple.developer.family-controls': true, 'com.apple.security.application-groups': [GROUP],
      }));
      const existing = Object.entries(project.pbxNativeTargetSection()).find(([key, value]) => !key.endsWith('_comment') && value.name?.replaceAll('"', '') === name);
      if (existing) continue;
      const target = project.addTarget(name, 'app_extension', name, `${c.ios.bundleIdentifier}.${name}`);
      const group = project.addPbxGroup([], name, name);
      project.addToPbxGroup(group.uuid, project.getFirstProject().firstProject.mainGroup);
      project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
      project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
      project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
      for (const file of [`${className}.swift`, 'ScreenTimeStore.swift', 'AccessWindow.swift', 'PauseHistory.swift']) project.addSourceFile(`${name}/${file}`, { target: target.uuid, sourceTree: 'SOURCE_ROOT' }, group.uuid);
      const list = project.pbxXCConfigurationList()[target.pbxNativeTarget.buildConfigurationList];
      for (const entry of list.buildConfigurations) Object.assign(project.pbxXCBuildConfigurationSection()[entry.value].buildSettings, {
        INFOPLIST_FILE: `${name}/Info.plist`, CODE_SIGN_ENTITLEMENTS: `${name}/${name}.entitlements`,
        IPHONEOS_DEPLOYMENT_TARGET: '16.0', SWIFT_VERSION: '5.0', TARGETED_DEVICE_FAMILY: '"1,2"',
        SKIP_INSTALL: 'YES', APPLICATION_EXTENSION_API_ONLY: 'YES', GENERATE_INFOPLIST_FILE: 'NO',
        MARKETING_VERSION: c.version || '0.2.0', CURRENT_PROJECT_VERSION: c.ios.buildNumber || '1',
        LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"', CODE_SIGN_STYLE: 'Automatic',
      });
    }
    return c;
  });
};



