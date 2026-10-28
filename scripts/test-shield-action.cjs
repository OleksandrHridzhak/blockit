const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
if (process.platform !== 'darwin') {
  console.log('Shield action concurrency regression requires the macOS Swift runner.');
  process.exit(0);
}
const source = fs.readFileSync(path.join(__dirname, '../ios-native/screen-time/ShieldActionExtension.swift'), 'utf8');
const start = source.indexOf('  private final class ActionReply {');
if (start < 0) throw Error('ActionReply implementation missing');
const gate = source.slice(start, source.lastIndexOf('\n}')).replace('private final class', 'final class');
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'blockit-shield-action-'));
const test = `import Foundation
enum ShieldActionResponse { case none, close, \`defer\` }
enum ScreenTimeStore {
  static let lock = NSLock()
  static var messages: [String] = []
  static func trace(_ event: String, detail: String) { lock.lock(); messages.append(detail); lock.unlock() }
  static func contains(_ text: String) -> Bool { lock.lock(); defer { lock.unlock() }; return messages.contains { $0.contains(text) } }
}
${gate}
final class Result {
  let lock = NSLock()
  var values: [ShieldActionResponse] = []
  func record(_ value: ShieldActionResponse) { lock.lock(); values.append(value); lock.unlock() }
}
let result = Result()
let answered = DispatchSemaphore(value: 0)
let blockedIPC = DispatchSemaphore(value: 0)
let lateWorker = DispatchGroup()
let reply = ActionReply { result.record($0); answered.signal() }
lateWorker.enter()
DispatchQueue.global().async { blockedIPC.wait(); reply.send(.defer, reason: "late-worker"); lateWorker.leave() }
DispatchQueue.global().asyncAfter(deadline: .now() + 0.05) { reply.send(.none, reason: "deadline") }
assert(answered.wait(timeout: .now() + 2) == .success, "Blocked IPC must not block the response")
assert(reply.finished)
blockedIPC.signal()
assert(lateWorker.wait(timeout: .now() + 2) == .success)
DispatchQueue.concurrentPerform(iterations: 500) { _ in reply.send(.close, reason: "racing-response") }
assert(result.values == [.none], "Deadline must keep the shield; late work must never answer again")
let normal = Result()
let completed = ActionReply { normal.record($0) }
completed.send(.defer, reason: "normal")
completed.send(.none, reason: "late-deadline")
assert(normal.values == [.defer], "A completed pause must ignore its later deadline")
let probe = Result()
let silent = ActionReply { probe.record($0) }
silent.disableTrace()
silent.send(.defer, reason: "probe-without-logger")
assert(probe.values == [.defer] && !ScreenTimeStore.contains("probe-without-logger"), "Probe must answer without invoking the custom logger")
print("PASS: actual shield reply implementation answers during blocked work and rejects concurrent/late replies")
`;
fs.writeFileSync(path.join(folder, 'main.swift'), test);
const binary = path.join(folder, 'shield-action-tests');
execFileSync('xcrun', ['swiftc', path.join(folder, 'main.swift'), '-o', binary], { stdio: 'inherit' });
execFileSync(binary, [], { stdio: 'inherit' });
