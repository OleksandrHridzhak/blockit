const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
if (process.platform !== 'darwin') {
  console.log('Monitor registration regression requires the macOS Swift runner.');
  process.exit(0);
}
const source = fs.readFileSync(path.join(__dirname, '../modules/blockit-bridge/ios/ScreenTimeStore.swift'), 'utf8');
const start = source.indexOf('  static func schedule(_ window:');
const end = source.indexOf('  // Returns true only for a newly scheduled pause', start);
if (start < 0 || end < 0) throw Error('Production registration method missing');
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'blockit-registration-'));
const test = `import Foundation
typealias ApplicationToken = String
struct DeviceActivityName: Hashable { let rawValue: String; init(_ value: String) { rawValue = value } }
struct DeviceActivityEvent {
  struct Name: Hashable { let rawValue: String; init(_ value: String) { rawValue = value } }
  static var forbidden = false
  static var creations = 0
  init(applications: Set<ApplicationToken>, threshold: DateComponents, includesPastActivity: Bool = false) {
    precondition(!Self.forbidden, "Shield registration must never construct a usage event")
    Self.creations += 1
  }
}
struct DeviceActivitySchedule {
  let intervalStart: DateComponents; let intervalEnd: DateComponents; let repeats: Bool
  var nextInterval: DateInterval? {
    let calendar = Calendar.current
    func date(_ c: DateComponents) -> Date {
      if c.year != nil { return calendar.date(from: c)! }
      return calendar.date(bySettingHour: c.hour!, minute: c.minute!, second: c.second!, of: Date())!
    }
    let start = date(intervalStart)
    var end = date(intervalEnd)
    if end <= start { end = calendar.date(byAdding: .day, value: 1, to: end)! }
    return DateInterval(start: start, end: end)
  }
}
enum InjectedFailure: Error { case unavailable }
final class FakeCenter {
  var entries: [DeviceActivityName: (DeviceActivitySchedule, [DeviceActivityEvent.Name: DeviceActivityEvent])] = [:]
  var failID: DeviceActivityName? = nil
  var corruptReadback = false
  func startMonitoring(_ id: DeviceActivityName, during schedule: DeviceActivitySchedule,
                       events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]) throws {
    if id == failID { throw InjectedFailure.unavailable }
    entries[id] = (schedule, events)
  }
  func schedule(for id: DeviceActivityName) -> DeviceActivitySchedule? { corruptReadback ? nil : entries[id]?.0 }
  func stopMonitoring(_ ids: [DeviceActivityName]) { for id in ids { entries.removeValue(forKey: id) } }
}
enum ScreenTimeStore {
  static let center = FakeCenter()
  enum Failure: Error { case monitoringUnavailable }
  static func trace(_ event: String, id: String = "", detail: String = "") {}
${source.slice(start, end)}
}
let now = Calendar.current.date(bySettingHour: 12, minute: 0, second: 0, of: Date())!.timeIntervalSince1970
let window = AccessWindow(requestID: "test", readyAt: now + 20, now: now, sessionMinutes: 1)
let access = DeviceActivityName(window.requestID)
let expiry = DeviceActivityName(window.expiryMonitorID)
let center = ScreenTimeStore.center
DeviceActivityEvent.forbidden = true
try ScreenTimeStore.schedule(window, token: "opaque", trackUsage: false)
assert(DeviceActivityEvent.creations == 0)
assert(center.entries.count == 2 && center.entries[access]!.1.isEmpty && center.entries[expiry]!.1.isEmpty)
center.entries.removeAll()
DeviceActivityEvent.forbidden = false
try ScreenTimeStore.schedule(window, token: "opaque", trackUsage: true)
assert(DeviceActivityEvent.creations == 1 && center.entries[access]!.1.count == 1 && center.entries[expiry]!.1.isEmpty)
for failure in [expiry, access] {
  center.entries.removeAll(); center.failID = failure
  do { try ScreenTimeStore.schedule(window, token: "opaque", trackUsage: false); fatalError("Expected registration failure") }
  catch { assert(center.entries.isEmpty, "Partial registration must be cleaned up") }
}
center.failID = nil; center.corruptReadback = true
do { try ScreenTimeStore.schedule(window, token: "opaque", trackUsage: false); fatalError("Expected readback failure") }
catch { assert(center.entries.isEmpty) }
print("PASS: production scheduler avoids usage-event construction for shield timers, retains host events, cleans failed registrations")
`;
fs.writeFileSync(path.join(folder, 'main.swift'), test);
const binary = path.join(folder, 'registration-tests');
execFileSync('xcrun', ['swiftc', 'modules/blockit-bridge/ios/AccessWindow.swift', path.join(folder, 'main.swift'), '-o', binary], { stdio: 'inherit' });
execFileSync(binary, [], { stdio: 'inherit' });
