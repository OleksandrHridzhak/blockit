import Foundation

// Monitoring intervals and the actual access deadline are independent.
struct AccessWindow: Codable {
  static let duration: TimeInterval = 15 * 60 + 5
  let requestID: String
  let startsAt: TimeInterval
  let endsAt: TimeInterval

  static func pauseDeadline(mode: String, seconds: Int, now: TimeInterval) -> TimeInterval {
    mode == "countdown" ? now + Double(seconds) : now
  }

  static func microlearningDeadline(existing: TimeInterval, seconds: Int, now: TimeInterval) -> TimeInterval {
    existing == 0 ? now + Double(seconds) : existing
  }
  static func isMicrolearning(_ mode: String) -> Bool {
    mode == "microlearning" || mode == "microlearning-v2"
  }

  init(requestID: String, readyAt: TimeInterval, now: TimeInterval, sessionMinutes: Int = 15) {
    self.requestID = requestID
    // DeviceActivity date components have whole-second precision. Rounding down
    // could deliver the only start callback before our persisted deadline.
    startsAt = ceil(max(readyAt, now))
    endsAt = startsAt + TimeInterval(max(1, min(1440, sessionMinutes)) * 60)
  }

  // A host-confirmed grant starts a fresh, already-active monitoring interval.
  // It must not reuse the future interval registered by the shield extension.
  init(activeRequestID: String, now: TimeInterval, sessionMinutes: Int) {
    requestID = activeRequestID + ".active"
    startsAt = floor(now)
    endsAt = startsAt + TimeInterval(max(1, min(1440, sessionMinutes)) * 60)
  }

  var expiryMonitorID: String { requestID + ".expiry" }
  var monitorEndsAt: TimeInterval { max(endsAt, startsAt + Self.duration) }
  var expiryMonitorEndsAt: TimeInterval { endsAt + Self.duration }
  var usageSeconds: Int { max(1, Int(endsAt - startsAt)) }
  var accessInterval: MonitoringInterval { MonitoringInterval(startsAt: startsAt, endsAt: monitorEndsAt) }
  var expiryInterval: MonitoringInterval { MonitoringInterval(startsAt: endsAt, endsAt: expiryMonitorEndsAt) }

  func canActivate(requestID: String?, now: TimeInterval) -> Bool {
    requestID == self.requestID && now >= startsAt && now < endsAt
  }
}

struct MonitoringInterval {
  let startsAt: TimeInterval
  let endsAt: TimeInterval

  func components(at timestamp: TimeInterval, calendar: Calendar) -> DateComponents {
    // Use the documented time-of-day form for short schedules, including on
    // iOS 16. Full dates are needed only when a time-of-day pair is ambiguous.
    let fields: Set<Calendar.Component> = endsAt - startsAt >= 86400
      ? [.year, .month, .day, .hour, .minute, .second] : [.hour, .minute, .second]
    return calendar.dateComponents(fields, from: Date(timeIntervalSince1970: timestamp))
  }

  func matches(_ interval: DateInterval?) -> Bool {
    guard let interval else { return false }
    return abs(interval.start.timeIntervalSince1970 - startsAt) < 2
      && abs(interval.end.timeIntervalSince1970 - endsAt) < 2
  }
}
