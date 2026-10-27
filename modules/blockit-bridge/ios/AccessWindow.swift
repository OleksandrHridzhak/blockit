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

  var expiryMonitorID: String { requestID + ".expiry" }
  var monitorEndsAt: TimeInterval { max(endsAt, startsAt + Self.duration) }
  var expiryMonitorEndsAt: TimeInterval { endsAt + Self.duration }
  var usageSeconds: Int { max(1, Int(endsAt - startsAt)) }

  func canActivate(requestID: String?, now: TimeInterval) -> Bool {
    requestID == self.requestID && now >= startsAt && now < endsAt
  }
}
