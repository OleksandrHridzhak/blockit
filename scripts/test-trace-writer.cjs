const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
if (process.platform !== 'darwin') {
  console.log('Bounded trace writer regression requires the macOS Swift runner.');
  process.exit(0);
}
const source = fs.readFileSync(path.join(__dirname, '../modules/blockit-bridge/ios/ScreenTimeStore.swift'), 'utf8');
const record = source.indexOf('  struct MonitorTrace: Codable {');
const start = source.indexOf('  private final class TraceWriter {');
const end = source.indexOf('  private static let traceWriter:', start);
if (record < 0 || start < 0 || end < 0) throw Error('Production trace writer missing');
const implementation = source.slice(record, end).replace('private final class TraceWriter', 'final class TraceWriter');
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'blockit-trace-writer-'));
const program = `import Foundation
enum ScreenTimeStore {
${implementation}
}
let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
defer { try? FileManager.default.removeItem(at: folder) }
// Existing history must not increase the cost or be removed by a new writer.
for i in 0..<100 { try Data("{}".utf8).write(to: folder.appendingPathComponent("legacy-\\(i).json")) }
let first = try ScreenTimeStore.TraceWriter(folder: folder, process: "action")
for i in 0..<500 { first.write("event-\\(i)", id: "12345678abcdef", detail: String(repeating: "x", count: 2000)) }
DispatchQueue.concurrentPerform(iterations: 100) { i in first.write("race-\\(i)", id: "12345678abcdef", detail: "ok") }
let second = try ScreenTimeStore.TraceWriter(folder: folder, process: "monitor")
for i in 0..<100 { second.write("other-\\(i)", id: "abcdefghijk", detail: "ok") }
let files = try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)
assert(files.count == 148, "Repeated/concurrent writes must use 24 slots per process and preserve legacy files")
let records = files.filter { $0.lastPathComponent.hasPrefix("ring-") }
assert(records.count == 48)
for file in records {
  let value = try JSONDecoder().decode(ScreenTimeStore.MonitorTrace.self, from: Data(contentsOf: file))
  assert(value.request.count == 8 && value.detail.count <= 512)
  assert(value.process == "action" || value.process == "monitor")
}
print("PASS: actual trace writer stays bounded across 700 writes, concurrent callers, legacy history and separate processes")
`;
fs.writeFileSync(path.join(folder, 'main.swift'), program);
const binary = path.join(folder, 'trace-writer-tests');
execFileSync('xcrun', ['swiftc', path.join(folder, 'main.swift'), '-o', binary], { stdio: 'inherit' });
execFileSync(binary, [], { stdio: 'inherit' });
