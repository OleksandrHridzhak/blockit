import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity
import UserNotifications
import CryptoKit
import Darwin

// Compiled into the host module and all three extensions. Only opaque tokens
// cross processes; no bundle identifiers or installed-app scraping.
enum ScreenTimeStore {
  static let group = "group.com.hridzhak.blockit.2WT689Y795"
  static var defaults: UserDefaults { UserDefaults(suiteName: group)! }
  static let settings = ManagedSettingsStore(named: .init("blockit"))
  static let center = DeviceActivityCenter()
  static let sessionSeconds = AccessWindow.duration
  static let phrase = "Я обираю відкрити свідомо"
  static var shieldProbeMode: String {
    let mode = defaults.string(forKey: "shieldProbeMode") ?? "normal"
    return ["screen", "notification"].contains(mode) ? mode : "normal"
  }
  static var shieldProbeEnabled: Bool { shieldProbeMode != "normal" }
  static func setShieldProbeMode(_ mode: String) throws {
    guard ["normal", "screen", "notification"].contains(mode) else { throw Failure.invalidRequest }
    try transaction {
      guard shieldProbeMode != mode else { return }
      defaults.set(mode, forKey: "shieldProbeMode")
      defaults.set(0, forKey: "shieldProbeCount")
      clearRequest()
      defaults.removeObject(forKey: "grant")
      defaults.removeObject(forKey: "lastFailure")
      apply()
    }
    // Do not call DeviceActivity while configuring this isolation test.
    // Old callbacks cannot grant access after the pending request is cleared.
  }
  // Separate atomic files intentionally avoid the state lock: they show whether
  // an extension callback arrived even if another process holds that lock.
  struct MonitorTrace: Codable {
    let timestamp: Double
    let event: String
    let request: String
    let detail: String
    var process: String? = nil
  }
  // Fixed slots: a trace write must never enumerate/sort the accumulated log.
  // This code runs inside small extension processes, including during a tap.
  private final class TraceWriter {
    private let folder: URL
    private let process: String
    private let lock = NSLock()
    private var nextSlot = 0
    init(folder: URL, process: String) throws {
      self.folder = folder
      self.process = process
      try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    }
    func write(_ event: String, id: String, detail: String) {
      autoreleasepool {
        lock.lock()
        let slot = nextSlot
        nextSlot = (nextSlot + 1) % 24
        lock.unlock()
        do {
          let value = MonitorTrace(timestamp: Date().timeIntervalSince1970, event: event,
            request: String(id.prefix(8)), detail: String(detail.prefix(512)), process: process)
          let file = folder.appendingPathComponent("ring-\(process)-\(slot).json")
          try JSONEncoder().encode(value).write(to: file, options: .atomic)
        } catch { /* Best-effort diagnostics must not change protection. */ }
      }
    }
  }
  private static let traceWriter: TraceWriter? = autoreleasepool {
    guard let root = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) else { return nil }
    return try? TraceWriter(folder: root.appendingPathComponent("monitor-trace", isDirectory: true),
      process: Bundle.main.bundleIdentifier ?? "unknown")
  }
  static func trace(_ event: String, id: String = "", detail: String = "") {
    traceWriter?.write(event, id: id, detail: detail)
  }
  static func monitorTrace() -> [MonitorTrace] {
    guard let root = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group),
          let files = try? FileManager.default.contentsOfDirectory(at: root.appendingPathComponent("monitor-trace"), includingPropertiesForKeys: nil) else { return [] }
    return files.compactMap { file in
      guard let data = try? Data(contentsOf: file) else { return nil }
      return try? JSONDecoder().decode(MonitorTrace.self, from: data)
    }.sorted { $0.timestamp > $1.timestamp }.prefix(60).map { $0 }
  }
  // Host and extensions are separate processes. Serialize read-modify-write
  // transactions with an App Group file lock rather than a process-local queue.
  static func transaction<T>(_ body: () throws -> T) throws -> T {
    guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) else {
      throw Failure.sharedStore
    }
    let descriptor = open(container.appendingPathComponent("state.lock").path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
    guard descriptor >= 0 else { throw Failure.sharedStore }
    defer { close(descriptor) }
    guard flock(descriptor, LOCK_EX) == 0 else { throw Failure.sharedStore }
    defer { flock(descriptor, LOCK_UN) }
    // Flush/refresh CFPreferences at the process boundary while holding the lock.
    defaults.synchronize()
    defer { defaults.synchronize() }
    return try body()
  }
  struct Policy: Codable {
    var enabled = true
    var seconds = 20
    var mode = "countdown"
  }
  struct AppRule: Codable {
    var seconds: Int
    var mode: String
    var sessionMinutes: Int? = nil
  }
  struct AppGroup: Codable {
    var id: String
    var name: String
    var seconds: Int
    var mode: String
    var tokens: Set<ApplicationToken>
    var sessionMinutes: Int? = nil
  }
  struct Request: Codable {
    let id: String
    let token: ApplicationToken
    let createdAt: Double
    var readyAt: Double
    let mode: String
    var groupID: String? = nil
    var groupName: String? = nil
    var sessionMinutes: Int? = nil
    var learningSeconds: Int? = nil
  }
  struct Grant: Codable {
    let id: String
    let token: ApplicationToken
    let until: Double
    var monitorID: String? = nil
  }
  struct ScheduledGrant: Codable {
    let token: ApplicationToken
    let window: AccessWindow
  }
  struct LastFailure: Codable {
    let message: String
    let detail: String
  }
  struct ProtectionOverride: Codable {
    let until: Double // Zero means disabled until manually resumed.
    let monitorID: String?
  }
  static var protectionOverrides: [String: ProtectionOverride] {
    read("protectionOverrides", [String: ProtectionOverride].self) ?? [:]
  }
  static func overrideTokens(_ scope: String) -> Set<ApplicationToken> {
    if scope.hasPrefix("app:"), let token = selectedToken(id: String(scope.dropFirst(4))) { return [token] }
    if scope.hasPrefix("group:"), let group = groups.first(where: { $0.id == String(scope.dropFirst(6)) && $0.id != "legacy" }) { return group.tokens }
    return []
  }
  static var suspendedTokens: Set<ApplicationToken> {
    protectionOverrides.reduce(into: Set<ApplicationToken>()) { tokens, entry in
      if entry.value.until == 0 || entry.value.until > Date().timeIntervalSince1970 {
        tokens.formUnion(overrideTokens(entry.key))
      }
    }
  }
  static func setProtectionOverride(scope: String, minutes: Int) throws {
    defer { stopUnusedMonitoring() }
    guard minutes >= -1 && minutes <= 1440 else { throw Failure.answer }
    try transaction { guard !overrideTokens(scope).isEmpty else { throw Failure.invalidRequest } }
    let window = minutes > 0 ? AccessWindow(activeRequestID: "quick." + UUID().uuidString, now: Date().timeIntervalSince1970, sessionMinutes: minutes) : nil
    let until = window?.endsAt ?? 0
    let monitorID = window?.requestID
    // Register and verify automatic restoration before removing any shield.
    // DeviceActivity IPC must stay outside the cross-process lock.
    if let monitorID, let window {
      let interval = window.expiryInterval
      let calendar = Calendar.current
      let fullDate = minutes == 1440
      let fields: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]
      let schedule = DeviceActivitySchedule(
        intervalStart: fullDate ? calendar.dateComponents(fields, from: Date(timeIntervalSince1970: interval.startsAt)) : interval.components(at: interval.startsAt, calendar: calendar),
        intervalEnd: fullDate ? calendar.dateComponents(fields, from: Date(timeIntervalSince1970: interval.endsAt)) : interval.components(at: interval.endsAt, calendar: calendar), repeats: false)
      do {
        try center.startMonitoring(DeviceActivityName(window.expiryMonitorID), during: schedule)
        let active = window.accessInterval
        let activeSchedule = DeviceActivitySchedule(
          intervalStart: active.components(at: active.startsAt, calendar: calendar),
          intervalEnd: active.components(at: active.endsAt, calendar: calendar), repeats: false)
        try center.startMonitoring(DeviceActivityName(monitorID), during: activeSchedule)
        guard interval.matches(center.schedule(for: DeviceActivityName(window.expiryMonitorID))?.nextInterval),
              active.matches(center.schedule(for: DeviceActivityName(monitorID))?.nextInterval) else { throw Failure.monitoringUnavailable }
      } catch {
        center.stopMonitoring([DeviceActivityName(monitorID), DeviceActivityName(window.expiryMonitorID)])
        throw error
      }
    }
    try transaction {
      let tokens = overrideTokens(scope)
      guard !tokens.isEmpty else { throw Failure.invalidRequest }
      var saved = protectionOverrides
      if minutes == 0 { saved.removeValue(forKey: scope) }
      else { saved[scope] = ProtectionOverride(until: until, monitorID: monitorID) }
      write("protectionOverrides", saved)
      if let request = pending, tokens.contains(request.token) { clearRequest() }
      if let grant = read("grant", Grant.self), tokens.contains(grant.token) { defaults.removeObject(forKey: "grant") }
      apply()
      trace("protection-override", id: monitorID ?? "manual", detail: "minutes=\(minutes)")
    }
  }
  static func recordFailure(_ error: Error) {
    try? transaction {
      let nativeError = error as NSError
      write("lastFailure", LastFailure(
        message: "Не вдалося надати доступ. Відкрий Blockit і спробуй ще раз.",
        detail: "\(nativeError.domain):\(nativeError.code) \(nativeError.localizedDescription)"))
    }
  }
  static func read<T: Decodable>(_ key: String, _ type: T.Type) -> T? {
    guard let data = defaults.data(forKey: key) else { return nil }
    return try? JSONDecoder().decode(type, from: data)
  }
  static func write<T: Encodable>(_ key: String, _ value: T) {
    guard let data = try? JSONEncoder().encode(value) else { return }
    defaults.set(data, forKey: key)
  }
  static var policy: Policy { read("policy", Policy.self) ?? Policy() }
  static var selection: FamilyActivitySelection {
    read("selection", FamilyActivitySelection.self) ?? FamilyActivitySelection()
  }
  static var appRules: [String: AppRule] { read("appRules", [String: AppRule].self) ?? [:] }
  // Preserve selections from earlier releases without guessing application names.
  static var groups: [AppGroup] {
    if let saved = read("groups", [AppGroup].self) { return saved }
    guard !selection.applicationTokens.isEmpty else { return [] }
    return [AppGroup(id: "legacy", name: "Мої застосунки", seconds: policy.seconds,
                     mode: policy.mode, tokens: selection.applicationTokens)]
  }
  static func group(for token: ApplicationToken) -> AppGroup? {
    groups.first { $0.tokens.contains(token) }
  }
  // All callers hold the cross-process lock. One application belongs to one group.
  static func saveGroup(_ group: AppGroup) {
    var saved = groups
    saved.removeAll { $0.id == group.id }
    for index in saved.indices { saved[index].tokens.subtract(group.tokens) }
    if group.id != "legacy" {
      let ids = Set(group.tokens.map(applicationID))
      write("appRules", appRules.filter { !ids.contains($0.key) })
    }
    saved.append(group)
    saveGroups(saved)
  }
  static func saveGroups(_ saved: [AppGroup]) {
    resetAccess()
    write("groups", saved)
    var selected = FamilyActivitySelection()
    selected.applicationTokens = saved.reduce(into: Set<ApplicationToken>()) { $0.formUnion($1.tokens) }
    write("selection", selected)
    pruneAppRules()
    apply()
  }
  static var history: [PauseHistory.Event] { read("screenTimeHistory", [PauseHistory.Event].self) ?? [] }
  static func record(_ request: Request, outcome: String) {
    write("screenTimeHistory", PauseHistory.recording(outcome, requestID: request.id,
      groupID: request.groupID ?? "legacy", groupName: request.groupName ?? "Мої застосунки",
      timestampMs: Date().timeIntervalSince1970 * 1000, in: history))
  }
  static func applicationID(_ token: ApplicationToken) -> String {
    guard let encoded = try? JSONEncoder().encode(token) else { return "" }
    return SHA256.hash(data: encoded).map { String(format: "%02x", $0) }.joined()
  }
  static func selectedToken(id: String) -> ApplicationToken? {
    selection.applicationTokens.first { applicationID($0) == id }
  }
  static func rule(for token: ApplicationToken) -> AppRule {
    if let group = group(for: token), group.id != "legacy" { return AppRule(seconds: group.seconds, mode: group.mode, sessionMinutes: group.sessionMinutes) }
    if let rule = appRules[applicationID(token)] { return rule }
    if let group = group(for: token) { return AppRule(seconds: group.seconds, mode: group.mode, sessionMinutes: group.sessionMinutes) }
    return AppRule(seconds: policy.seconds, mode: policy.mode)
  }
  static func pruneAppRules() {
    let selectedIDs = Set(selection.applicationTokens.map(applicationID))
    write("appRules", appRules.filter { selectedIDs.contains($0.key) })
  }
  static var pending: Request? {
    guard let request = read("request", Request.self),
          Date().timeIntervalSince1970 >= request.createdAt,
          Date().timeIntervalSince1970 < max(request.createdAt, request.readyAt) + 600,
          selection.applicationTokens.contains(request.token), policy.enabled else { return nil }
    return request
  }
  static func clearRequest() {
    defaults.removeObject(forKey: "request")
    defaults.removeObject(forKey: "scheduledGrant")
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["blockit.request"])
    UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: ["blockit.request"])
  }
  static func resetAccess() {
    // Re-shield before cancelling the expiry callback.
    defaults.removeObject(forKey: "grant")
    defaults.removeObject(forKey: "lastFailure")
    apply()
    clearRequest()
  }
  // Never call DeviceActivity IPC with the cross-process file lock held:
  // starting/stopping a monitor can synchronously launch an extension callback.
  static func stopUnusedMonitoring() {
    let activities = center.activities
    guard let keep = try? transaction({ () -> Set<String> in
      var ids = Set<String>()
      if let request = pending { ids.insert(request.id) }
      if let grant = read("grant", Grant.self) { ids.insert(grant.monitorID ?? grant.id) }
      if let scheduled = read("scheduledGrant", ScheduledGrant.self) { ids.insert(scheduled.window.requestID) }
      let requestIDs = ids
      ids.formUnion(requestIDs.map { $0 + ".expiry" })
      for value in protectionOverrides.values {
        if value.until > Date().timeIntervalSince1970, let monitorID = value.monitorID {
          ids.insert(monitorID); ids.insert(monitorID + ".expiry")
        }
      }
      return ids
    }) else { return }
    let unused = activities.filter { !keep.contains($0.rawValue) }
    if !unused.isEmpty { center.stopMonitoring(unused) }
  }
  static func apply() {
    let overrides = protectionOverrides.filter {
      ($0.value.until == 0 || $0.value.until > Date().timeIntervalSince1970) && !overrideTokens($0.key).isEmpty
    }
    write("protectionOverrides", overrides)
    guard policy.enabled else { settings.clearAllSettings(); return }
    var tokens = selection.applicationTokens
    tokens.subtract(suspendedTokens)
    if !shieldProbeEnabled, let grant = read("grant", Grant.self), grant.until > Date().timeIntervalSince1970 {
      tokens.remove(grant.token)
    } else {
      if let grant = read("grant", Grant.self) { trace("expired-grant-reconciled", id: grant.id) }
      defaults.removeObject(forKey: "grant")
    }
    // Keep an existing shield stable while handling a button or a delayed
    // monitor callback. Publish only an actual change to the guarded tokens.
    let shielded: Set<ApplicationToken>? = tokens.isEmpty ? nil : tokens
    if settings.shield.applications != shielded { settings.shield.applications = shielded }
    // Categories and websites are deliberately not supported in this release.
    if settings.shield.applicationCategories != nil { settings.shield.applicationCategories = nil }
    if settings.shield.webDomains != nil { settings.shield.webDomains = nil }
  }
  static func request(for token: ApplicationToken) throws -> Request {
    guard !shieldProbeEnabled, policy.enabled, selection.applicationTokens.contains(token), !suspendedTokens.contains(token) else { throw Failure.invalidRequest }
    if let existing = pending, existing.token == token { return existing }
    clearRequest()
    defaults.removeObject(forKey: "lastFailure")
    let now = Date().timeIntervalSince1970
    let appRule = rule(for: token)
    let source = group(for: token)
    let request = Request(id: UUID().uuidString, token: token, createdAt: now,
                          readyAt: AccessWindow.isMicrolearning(appRule.mode) ? 0 : AccessWindow.pauseDeadline(mode: appRule.mode, seconds: appRule.seconds, now: now), mode: appRule.mode,
                          groupID: source?.id, groupName: source?.name, sessionMinutes: appRule.sessionMinutes,
                          learningSeconds: AccessWindow.isMicrolearning(appRule.mode) ? appRule.seconds : nil)
    write("request", request)
    record(request, outcome: "intervened")
    return request
  }
  static func startMicrolearning(id: String) throws -> Request {
    try transaction {
      guard var request = pending, request.id == id, AccessWindow.isMicrolearning(request.mode),
            let seconds = request.learningSeconds, (1...86400).contains(seconds) else { throw Failure.invalidRequest }
      if request.readyAt == 0 {
        request.readyAt = AccessWindow.microlearningDeadline(existing: request.readyAt, seconds: seconds, now: Date().timeIntervalSince1970)
        write("request", request)
      }
      return request
    }
  }
  static func schedule(_ window: AccessWindow, token: ApplicationToken, trackUsage: Bool) throws {
    let calendar = Calendar.current
    func schedule(for interval: MonitoringInterval) -> DeviceActivitySchedule {
      DeviceActivitySchedule(intervalStart: interval.components(at: interval.startsAt, calendar: calendar),
        intervalEnd: interval.components(at: interval.endsAt, calendar: calendar), repeats: false)
    }
    func verify(_ id: DeviceActivityName, interval: MonitoringInterval) throws {
      let next = center.schedule(for: id)?.nextInterval
      trace("schedule-readback", id: window.requestID,
        detail: "role=\(id.rawValue.hasSuffix(".expiry") ? "expiry" : "access") start=\(next?.start.timeIntervalSince1970 ?? 0) end=\(next?.end.timeIntervalSince1970 ?? 0)")
      guard interval.matches(next) else { throw Failure.monitoringUnavailable }
    }
    trace("schedule", id: window.requestID, detail: "start=\(window.startsAt) expiry=\(window.endsAt)")
    // Calendar expiry remains a wall-clock fallback when the user leaves the app.
    let expiry = DeviceActivityName(window.expiryMonitorID)
    let access = DeviceActivityName(window.requestID)
    do {
      trace("monitor-register-start", id: window.requestID, detail: "expiry")
      try center.startMonitoring(expiry, during: schedule(for: window.expiryInterval))
      trace("monitor-register-end", id: window.requestID, detail: "expiry")
      trace("monitor-register-start", id: window.requestID, detail: "access")
      if trackUsage {
        // Build 23's action process stops between `schedule` and the first
        // registration trace, where the usage event used to be constructed.
        // Keep this preparation in the host. Shield actions need only calendar
        // start + expiry callbacks; they must not construct a usage event.
        trace("usage-event-start", id: window.requestID)
        let threshold = DateComponents(minute: window.usageSeconds / 60, second: window.usageSeconds % 60)
        let event: DeviceActivityEvent
        if #available(iOS 17.4, *) {
          event = DeviceActivityEvent(applications: [token], threshold: threshold, includesPastActivity: false)
        } else {
          event = DeviceActivityEvent(applications: [token], threshold: threshold)
        }
        trace("usage-event-end", id: window.requestID)
        try center.startMonitoring(access, during: schedule(for: window.accessInterval), events: [.init("access-used"): event])
      } else {
        try center.startMonitoring(access, during: schedule(for: window.accessInterval))
      }
      trace("monitor-register-end", id: window.requestID, detail: "access")
      try verify(access, interval: window.accessInterval)
      try verify(expiry, interval: window.expiryInterval)
      trace("scheduled", id: window.requestID, detail: "usageSeconds=\(window.usageSeconds)")
    } catch {
      trace("schedule-failed", id: window.requestID, detail: error.localizedDescription)
      center.stopMonitoring([expiry, access])
      throw error
    }
  }
  // Returns true only for a newly scheduled pause, to avoid duplicate notifications.
  static func scheduleCountdown(_ request: Request) throws -> Bool {
    defer { stopUnusedMonitoring() }
    let existing = try transaction { read("scheduledGrant", ScheduledGrant.self) }
    if existing?.window.requestID == request.id,
       center.activities.contains(.init(request.id)),
       center.activities.contains(.init(existing!.window.expiryMonitorID)) { return false }
    let scheduled = try transaction { () throws -> ScheduledGrant in
      guard pending?.id == request.id, request.mode == "countdown" else { throw Failure.invalidRequest }
      let value = ScheduledGrant(token: request.token, window: AccessWindow(
        requestID: request.id, readyAt: request.readyAt, now: Date().timeIntervalSince1970, sessionMinutes: request.sessionMinutes ?? 15))
      write("scheduledGrant", value)
      return value
    }
    do { try schedule(scheduled.window, token: scheduled.token, trackUsage: false) }
    catch {
      try? transaction {
        if read("scheduledGrant", ScheduledGrant.self)?.window.requestID == request.id {
          defaults.removeObject(forKey: "scheduledGrant")
        }
      }
      throw error
    }
    let current = try transaction {
      let current = pending?.id == request.id || read("grant", Grant.self)?.id == request.id
      if current { defaults.removeObject(forKey: "lastFailure") }
      return current
    }
    guard current else { throw Failure.invalidRequest }
    return true
  }
  // Called by DeviceActivity at the START of the access interval (after the pause).
  @discardableResult
  static func activateCountdown(id: String) throws -> Bool {
    try transaction {
      guard !shieldProbeEnabled, let scheduled = read("scheduledGrant", ScheduledGrant.self),
            scheduled.window.requestID == id,
            let request = pending, request.mode == "countdown",
            scheduled.window.canActivate(requestID: request.id, now: Date().timeIntervalSince1970),
            scheduled.token == request.token else { return false }
      write("grant", Grant(id: id, token: scheduled.token, until: scheduled.window.endsAt))
      trace("grant-opened", id: id, detail: "expiry=\(scheduled.window.endsAt)")
      record(request, outcome: "continued")
      clearRequest()
      defaults.removeObject(forKey: "lastFailure")
      apply()
      return true
    }
  }
  static func notify(_ request: Request, completion: @escaping (Error?) -> Void) {
    let content = UNMutableNotificationContent()
    let seconds = max(0, Int(ceil(request.readyAt - Date().timeIntervalSince1970)))
    content.title = AccessWindow.isMicrolearning(request.mode) ? "Коротка пауза з Microlearning" : request.mode == "countdown" ? "Пауза почалася" : "Завдання перед відкриттям"
    content.body = request.mode == "countdown"
      ? "Доступ має відкритися приблизно через \(seconds) с. Торкнися, щоб відкрити Blockit."
      : AccessWindow.isMicrolearning(request.mode) ? "Торкнися сповіщення, щоб почати паузу в Blockit." : "Торкнися цього сповіщення, щоб перейти до завдання в Blockit. Якщо потрібно — відкрий Blockit вручну."
    content.threadIdentifier = "blockit.pause"
    content.userInfo = ["blockitRequest": request.id]
    // Stable identifier replaces duplicates; notification delivery is never the timer.
    UNUserNotificationCenter.current().add(
      UNNotificationRequest(identifier: "blockit.request", content: content, trigger: nil),
      withCompletionHandler: completion)
  }
  static func notifyFailure(completion: @escaping (Error?) -> Void) {
    let content = UNMutableNotificationContent()
    content.title = "Доступ поки закритий"
    content.body = "Не вдалося запланувати доступ. Відкрий Blockit і спробуй ще раз."
    UNUserNotificationCenter.current().add(
      UNNotificationRequest(identifier: "blockit.request", content: content, trigger: nil),
      withCompletionHandler: completion)
  }
  static func finish(id: String, answer: String, trackUsage: Bool = false) throws {
    defer { stopUnusedMonitoring() }
    // A countdown may have completed automatically while Blockit was open.
    if try transaction({
      guard let grant = read("grant", Grant.self) else { return false }
      return grant.id == id && grant.until > Date().timeIntervalSince1970
    }) { return }
    let request = try transaction { () throws -> Request in
      let request = try validateFinish(id: id, answer: answer)
      defaults.removeObject(forKey: "grant")
      apply()
      return request
    }
    let window = AccessWindow(activeRequestID: id, now: Date().timeIntervalSince1970, sessionMinutes: request.sessionMinutes ?? 15)
    // Registration is outside the shared lock, and must succeed before unshielding.
    try schedule(window, token: request.token, trackUsage: trackUsage)
    try transaction {
      // Another completion (or the original start callback) may have won while
      // DeviceActivity IPC was in flight. Finishing the same request is idempotent.
      if let grant = read("grant", Grant.self), grant.id == id,
         grant.until > Date().timeIntervalSince1970 { return }
      _ = try validateFinish(id: id, answer: answer)
      write("grant", Grant(id: id, token: request.token, until: window.endsAt, monitorID: window.requestID))
      trace("grant-opened", id: id, detail: "expiry=\(window.endsAt)")
      record(request, outcome: "continued")
      clearRequest()
      defaults.removeObject(forKey: "lastFailure")
      apply()
    }
  }
  private static func validateFinish(id: String, answer: String) throws -> Request {
    guard !shieldProbeEnabled, AuthorizationCenter.shared.authorizationStatus == .approved,
          let request = pending, request.id == id,
          (!(request.mode == "countdown" || AccessWindow.isMicrolearning(request.mode)) || (request.readyAt > 0 && Date().timeIntervalSince1970 >= request.readyAt)) else { throw Failure.invalidRequest }
    switch request.mode {
    case "typing": guard answer.trimmingCharacters(in: .whitespacesAndNewlines) == phrase else { throw Failure.answer }
    case "reflection": guard ["reply", "task", "rest"].contains(answer) else { throw Failure.answer }
    case "countdown", "microlearning", "microlearning-v2": break
    default: throw Failure.answer
    }
    return request
  }
  enum Failure: LocalizedError {
    case invalidRequest, answer, sharedStore, monitoringUnavailable
    var errorDescription: String? {
      switch self {
      case .invalidRequest: return "Пауза ще триває або запит застарів. Повернися до заблокованого застосунку й спробуй знову."
      case .answer: return "Заверши завдання, щоб отримати доступ."
      case .sharedStore: return "Немає доступу до спільних налаштувань. Потрібна збірка з дозволами Family Controls та App Group."
      case .monitoringUnavailable: return "iOS не підтвердила час повторного блокування. Доступ залишено закритим. Спробуй ще раз або надішли діагностику."
      }
    }
  }
}

