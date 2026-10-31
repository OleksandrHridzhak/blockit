const fs = require('node:fs');
const path = require('node:path');
const xcode = require('xcode');
const signing = JSON.parse(fs.readFileSync(path.join(process.env.RUNNER_TEMP, 'blockit-signing', 'targets.json'), 'utf8'));
const projectPath = 'ios/Blockit.xcodeproj/project.pbxproj';
const project = xcode.project(projectPath);
project.parseSync();
const configured = new Set();
for (const [id, target] of Object.entries(project.pbxNativeTargetSection())) {
  if (id.endsWith('_comment')) continue;
  const name = target.name?.replaceAll('"', '');
  const profile = signing.targets[name];
  if (!profile) continue;
  const list = project.pbxXCConfigurationList()[target.buildConfigurationList];
  for (const entry of list.buildConfigurations) {
    Object.assign(project.pbxXCBuildConfigurationSection()[entry.value].buildSettings, {
      CODE_SIGN_STYLE: 'Manual', DEVELOPMENT_TEAM: signing.team,
      CODE_SIGN_IDENTITY: `"${signing.certificate}"`,
      PROVISIONING_PROFILE_SPECIFIER: `"${profile.name}"`,
      PROVISIONING_PROFILE: `"${profile.uuid}"`,
    });
  }
  configured.add(name);
}
if (configured.size !== 4) throw new Error('All four Blockit targets must have signing profiles');
fs.writeFileSync(projectPath, project.writeSync());
console.log('Configured manual App Store signing for:', [...configured].join(', '));
