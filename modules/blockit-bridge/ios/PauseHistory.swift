import Foundation

// Pure data reducer shared by the host and extensions. Call under the App Group lock.
enum PauseHistory {
  struct Event: Codable {
    let id: String
    let appId: String
    let groupName: String
    let timestampMs: Double
    let outcome: String
  }
  static func recording(_ outcome: String, requestID: String, groupID: String,
                        groupName: String, timestampMs: Double, in events: [Event]) -> [Event] {
    guard ["intervened", "dismissed", "continued"].contains(outcome) else { return events }
    let id = "\(requestID):\(outcome)"
    guard !events.contains(where: { $0.id == id }) else { return events }
    if outcome != "intervened", events.contains(where: {
      $0.id == "\(requestID):continued" || $0.id == "\(requestID):dismissed"
    }) { return events }
    let event = Event(id: id, appId: groupID, groupName: groupName, timestampMs: timestampMs, outcome: outcome)
    return Array(([event] + events).prefix(2000))
  }
}
