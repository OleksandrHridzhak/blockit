import DeviceActivity
import Foundation

final class DeviceActivityMonitorExtension: DeviceActivityMonitor {
  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    // Ignore delayed callbacks from a replaced session.
    try? ScreenTimeStore.transaction {
      guard let grant = ScreenTimeStore.read("grant", ScreenTimeStore.Grant.self),
            grant.id == activity.rawValue else { return }
      ScreenTimeStore.defaults.removeObject(forKey: "grant")
      ScreenTimeStore.apply()
    }
  }
}
