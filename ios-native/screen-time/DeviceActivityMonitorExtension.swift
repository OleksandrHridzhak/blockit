import DeviceActivity
import Foundation

final class DeviceActivityMonitorExtension: DeviceActivityMonitor {
  override init() {
    super.init()
    ScreenTimeStore.trace("monitor-loaded")
  }
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    ScreenTimeStore.trace("interval-start", id: activity.rawValue, detail: activity.rawValue.hasSuffix(".expiry") ? "expiry" : "access")
    if activity.rawValue.hasSuffix(".expiry") {
      expireGrant(id: String(activity.rawValue.dropLast(".expiry".count)))
      return
    }
    do { try ScreenTimeStore.activateCountdown(id: activity.rawValue) }
    catch { ScreenTimeStore.recordFailure(error) }
  }
  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    ScreenTimeStore.trace("interval-end", id: activity.rawValue)
    if activity.rawValue.hasSuffix(".expiry-backup") {
      expireGrant(id: String(activity.rawValue.dropLast(".expiry-backup".count)))
      return
    }
    guard !activity.rawValue.hasSuffix(".expiry") else { return }
    // Ignore delayed callbacks from a replaced session.
    try? ScreenTimeStore.transaction {
      if let grant = ScreenTimeStore.read("grant", ScreenTimeStore.Grant.self),
         (grant.monitorID ?? grant.id) == activity.rawValue, grant.until <= Date().timeIntervalSince1970 {
        ScreenTimeStore.defaults.removeObject(forKey: "grant")
        ScreenTimeStore.trace("shield-restored", id: grant.id, detail: "access-interval-ended")
      }
      if ScreenTimeStore.read("scheduledGrant", ScreenTimeStore.ScheduledGrant.self)?.window.requestID == activity.rawValue {
        ScreenTimeStore.clearRequest()
      }
      ScreenTimeStore.apply()
    }
  }

  override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
    super.eventDidReachThreshold(event, activity: activity)
    ScreenTimeStore.trace("usage-threshold", id: activity.rawValue)
    guard event.rawValue == "access-used" else { return }
    expireGrant(id: activity.rawValue)
  }

  private func expireGrant(id: String) {
    do {
      try ScreenTimeStore.transaction {
        guard let grant = ScreenTimeStore.read("grant", ScreenTimeStore.Grant.self), (grant.monitorID ?? grant.id) == id else {
          ScreenTimeStore.trace("expiry-stale", id: id)
          return
        }
        guard grant.until <= Date().timeIntervalSince1970 else {
          ScreenTimeStore.trace("expiry-early", id: id, detail: "remaining=\(grant.until - Date().timeIntervalSince1970)")
          return
        }
        ScreenTimeStore.defaults.removeObject(forKey: "grant")
        ScreenTimeStore.apply()
        ScreenTimeStore.trace("shield-restored", id: id)
      }
    } catch { ScreenTimeStore.recordFailure(error) }
  }
}
