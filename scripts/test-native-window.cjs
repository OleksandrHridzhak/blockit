const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
if (process.platform !== 'darwin') {
  console.log('Native Swift regression tests run on the macOS EAS builder.');
  process.exit(0);
}
const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'blockit-window-')), 'window-tests');
execFileSync('xcrun', ['swiftc', 'modules/blockit-bridge/ios/AccessWindow.swift', 'modules/blockit-bridge/ios/PauseHistory.swift', 'scripts/swift-tests/main.swift', '-o', output], { stdio: 'inherit' });
execFileSync(output, [], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join(__dirname, 'test-shield-action.cjs')], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join(__dirname, 'test-monitor-registration.cjs')], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join(__dirname, 'test-trace-writer.cjs')], { stdio: 'inherit' });
