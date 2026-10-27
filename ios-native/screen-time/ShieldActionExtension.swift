import ManagedSettings
import UserNotifications
import Foundation

final class ShieldActionExtension: ShieldActionDelegate {
  override func handle(action: ShieldAction, for application: ApplicationToken,
                       completionHandler: @escaping (ShieldActionResponse) -> Void) {
    guard action == .primaryButtonPressed else {
      if action == .secondaryButtonPressed { try? ScreenTimeStore.transaction {
        if let grant = ScreenTimeStore.read("grant", ScreenTimeStore.Grant.self),
           grant.token == application && grant.until > Date().timeIntervalSince1970 { return }
        let request = try ScreenTimeStore.request(for: application)
        ScreenTimeStore.record(request, outcome: "dismissed")
        ScreenTimeStore.clearRequest()
      } }
      ScreenTimeStore.stopUnusedMonitoring()
      completionHandler(.close)
      return
    }
    do {
      let alreadyOpen = try ScreenTimeStore.transaction { () -> Bool in
        ScreenTimeStore.apply()
        guard let grant = ScreenTimeStore.read("grant", ScreenTimeStore.Grant.self) else { return false }
        return grant.token == application && grant.until > Date().timeIntervalSince1970
      }
      if alreadyOpen {
        completionHandler(.none)
        return
      }
      let request = try ScreenTimeStore.transaction { try ScreenTimeStore.request(for: application) }
      if request.mode == "countdown" {
        // A manual recovery needs fresh active monitoring, just like finishing
        // in the host. Never reuse an unacknowledged future registration.
        if request.readyAt <= Date().timeIntervalSince1970 {
          try ScreenTimeStore.finish(id: request.id, answer: "")
          completionHandler(.none)
        } else {
          _ = try ScreenTimeStore.scheduleCountdown(request)
          finishAfterNotification(completionHandler) { callback in ScreenTimeStore.notify(request, completion: callback) }
        }
      } else {
        finishAfterNotification(completionHandler) { callback in ScreenTimeStore.notify(request, completion: callback) }
      }
    } catch {
      ScreenTimeStore.recordFailure(error)
      finishAfterNotification(completionHandler) { callback in ScreenTimeStore.notifyFailure(completion: callback) }
    }
  }

  // Give iOS time to accept the notification before completing the extension,
  // but always redraw the shield if the notification service does not respond.
  private func finishAfterNotification(_ completion: @escaping (ShieldActionResponse) -> Void,
                                       submit: (@escaping (Error?) -> Void) -> Void) {
    let lock = NSLock()
    var finished = false
    let finish = {
      lock.lock()
      guard !finished else { lock.unlock(); return }
      finished = true
      lock.unlock()
      completion(.defer)
    }
    DispatchQueue.global().asyncAfter(deadline: .now() + 2) { finish() }
    submit { _ in finish() }
  }
}
