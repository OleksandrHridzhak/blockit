import DeviceActivity
import Foundation

final class DeviceActivityMonitorExtension: DeviceActivityMonitor {
  override init() {
    super.init()
    ScreenTimeStore.trace("monitor-loaded")
  }
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    if reconcileQuickAction(activity) { return }
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
    if reconcileQuickAction(activity) { return }
    ScreenTimeStore.trace("interval-end", id: activity.rawValue)
    if activity.rawValue.hasSuffix(".expiry-backup") {
      expireGrant(id: String(activity.rawValue.dropLast(".expiry-backup".count)))
      return
    }
    guard !activity.rawValue.hasSuffix(".expiry") else { return }
    // Ignore delayed callbacks from a replaced session.
    try? ScreenTimeStore.transaction {
      var changed = false
      if let grant = ScreenTimeStore.read("grant", ScreenTimeStore.Grant.self),
         (grant.monitorID ?? grant.id) == activity.rawValue, grant.until <= Date().timeIntervalSince1970 {
        ScreenTimeStore.defaults.removeObject(forKey: "grant")
        ScreenTimeStore.trace("shield-restored", id: grant.id, detail: "access-interval-ended")
        changed = true
      }
      if ScreenTimeStore.read("scheduledGrant", ScreenTimeStore.ScheduledGrant.self)?.window.requestID == activity.rawValue {
        ScreenTimeStore.clearRequest()
        changed = true
      }
      // An old monitor ending while a new shield action runs owns no current
      // state. Do not touch ManagedSettings or redraw the new session's shield.
      guard changed else {
        ScreenTimeStore.trace("interval-end-stale", id: activity.rawValue)
        return
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

  private func reconcileQuickAction(_ activity: DeviceActivityName) -> Bool {
    guard activity.rawValue.hasPrefix("quick.") else { return false }
    do {
      try ScreenTimeStore.transaction { ScreenTimeStore.apply() }
      ScreenTimeStore.trace("quick-action-reconciled", id: activity.rawValue)
    } catch { ScreenTimeStore.recordFailure(error) }
    return true
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
