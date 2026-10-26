import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity
import UserNotifications
import Darwin

// Compiled into the host module and all three extensions. Only opaque tokens
// cross processes; no bundle identifiers or installed-app scraping.
enum ScreenTimeStore {
  static let group = "group.com.hridzhak.blockit"
  static var defaults: UserDefaults { UserDefaults(suiteName: group)! }
  static let settings = ManagedSettingsStore(named: .init("blockit"))
  static let center = DeviceActivityCenter()
  static let sessionSeconds: TimeInterval = 15 * 60 + 5
  static let phrase = "Я обираю відкрити свідомо"
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
  struct Request: Codable {
    let id: String
    let token: ApplicationToken
    let createdAt: Double
    let readyAt: Double
    let mode: String
  }
  struct Grant: Codable {
    let id: String
    let token: ApplicationToken
    let until: Double
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
  static var pending: Request? {
    guard let request = read("request", Request.self),
          Date().timeIntervalSince1970 >= request.createdAt,
          Date().timeIntervalSince1970 - request.createdAt < 600,
          selection.applicationTokens.contains(request.token), policy.enabled else { return nil }
    return request
  }
  static func clearRequest() {
    defaults.removeObject(forKey: "request")
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["blockit.request"])
    UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: ["blockit.request"])
  }
  static func resetAccess() {
    // Re-shield before cancelling the expiry callback.
    defaults.removeObject(forKey: "grant")
    apply()
    center.stopMonitoring()
    clearRequest()
  }
  static func apply() {
    guard policy.enabled else { settings.clearAllSettings(); return }
    var tokens = selection.applicationTokens
    if let grant = read("grant", Grant.self), grant.until > Date().timeIntervalSince1970 {
      tokens.remove(grant.token)
    } else { defaults.removeObject(forKey: "grant") }
    settings.shield.applications = tokens.isEmpty ? nil : tokens
    // Categories and websites are deliberately not supported in this release.
    settings.shield.applicationCategories = nil
    settings.shield.webDomains = nil
  }
  static func request(for token: ApplicationToken) -> Request {
    if let existing = pending, existing.token == token { return existing }
    clearRequest()
    let now = Date().timeIntervalSince1970
    let request = Request(id: UUID().uuidString, token: token, createdAt: now,
                          readyAt: now + Double(policy.seconds), mode: policy.mode)
    write("request", request)
    return request
  }
  static func notify(_ request: Request, completion: @escaping (Error?) -> Void) {
    let content = UNMutableNotificationContent()
    content.title = request.mode == "countdown" ? "Пауза перед відкриттям" : "Завдання перед відкриттям"
    content.body = "Торкнися, щоб продовжити в Blockit. Або відкрий Blockit самостійно."
    content.threadIdentifier = "blockit.pause"
    content.userInfo = ["blockitRequest": request.id]
    // Stable identifier replaces duplicates; notification delivery is never the timer.
    UNUserNotificationCenter.current().add(
      UNNotificationRequest(identifier: "blockit.request", content: content, trigger: nil),
      withCompletionHandler: completion)
  }
  static func finish(id: String, answer: String) throws {
    guard AuthorizationCenter.shared.authorizationStatus == .approved,
          let request = pending, request.id == id,
          Date().timeIntervalSince1970 >= request.readyAt else { throw Failure.invalidRequest }
    switch request.mode {
    case "typing": guard answer.trimmingCharacters(in: .whitespacesAndNewlines) == phrase else { throw Failure.answer }
    case "reflection": guard ["reply", "task", "rest"].contains(answer) else { throw Failure.answer }
    case "countdown": break
    default: throw Failure.answer
    }
    // One active grant. The previous app is shielded before its monitor is removed.
    defaults.removeObject(forKey: "grant")
    apply()
    center.stopMonitoring()
    let end = Date().addingTimeInterval(sessionSeconds)
    let components: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]
    let schedule = DeviceActivitySchedule(
      intervalStart: Calendar.current.dateComponents(components, from: Date()),
      intervalEnd: Calendar.current.dateComponents(components, from: end), repeats: false)
    // Registration must succeed before access can be granted. Never rely on a JS timer.
    try center.startMonitoring(.init(request.id), during: schedule)
    write("grant", Grant(id: request.id, token: request.token, until: end.timeIntervalSince1970))
    clearRequest()
    apply()
  }
  enum Failure: LocalizedError {
    case invalidRequest, answer, sharedStore
    var errorDescription: String? {
      switch self {
      case .invalidRequest: return "Пауза ще триває або запит застарів. Повернися до заблокованого застосунку й спробуй знову."
      case .answer: return "Заверши завдання, щоб отримати доступ."
      case .sharedStore: return "Немає доступу до спільних налаштувань. Потрібна збірка з дозволами Family Controls та App Group."
      }
    }
  }
}
