import ManagedSettings
import UserNotifications
import Foundation

final class ShieldActionExtension: ShieldActionDelegate {
  override func handle(action: ShieldAction, for application: ApplicationToken,
                       completionHandler: @escaping (ShieldActionResponse) -> Void) {
    let startedAt = Date().timeIntervalSince1970
    ScreenTimeStore.trace("shield-action", detail: action == .primaryButtonPressed ? "primary" : "secondary-or-other")
    let respond: (ShieldActionResponse) -> Void = { response in
      ScreenTimeStore.trace("shield-action-response", detail: "response=\(String(describing: response)) elapsedMs=\(Int((Date().timeIntervalSince1970 - startedAt) * 1000))")
      completionHandler(response)
    }
    guard action == .primaryButtonPressed else {
      if action == .secondaryButtonPressed { try? ScreenTimeStore.transaction {
        if let grant = ScreenTimeStore.read("grant", ScreenTimeStore.Grant.self),
           grant.token == application && grant.until > Date().timeIntervalSince1970 { return }
        let request = try ScreenTimeStore.request(for: application)
        ScreenTimeStore.record(request, outcome: "dismissed")
        ScreenTimeStore.clearRequest()
      } }
      ScreenTimeStore.stopUnusedMonitoring()
      respond(.close)
      return
    }
    do {
      let alreadyOpen = try ScreenTimeStore.transaction { () -> Bool in
        guard let grant = ScreenTimeStore.read("grant", ScreenTimeStore.Grant.self) else { return false }
        guard grant.token == application && grant.until > Date().timeIntervalSince1970 else { return false }
        // Only reconcile a real active grant. Rewriting an unchanged shield
        // while its primary button is handling a tap can replace that UI.
        ScreenTimeStore.apply()
        return true
      }
      if alreadyOpen {
        respond(.none)
        return
      }
      let request = try ScreenTimeStore.transaction { try ScreenTimeStore.request(for: application) }
      ScreenTimeStore.trace("shield-request", id: request.id, detail: "mode=\(request.mode)")
      if request.mode == "countdown" {
        // A manual recovery needs fresh active monitoring, just like finishing
        // in the host. Never reuse an unacknowledged future registration.
        if request.readyAt <= Date().timeIntervalSince1970 {
          try ScreenTimeStore.finish(id: request.id, answer: "")
          respond(.none)
        } else {
          ScreenTimeStore.trace("shield-schedule-start", id: request.id)
          _ = try ScreenTimeStore.scheduleCountdown(request)
          ScreenTimeStore.trace("shield-schedule-end", id: request.id)
          finishAfterNotification(respond) { callback in ScreenTimeStore.notify(request, completion: callback) }
        }
      } else {
        finishAfterNotification(respond) { callback in ScreenTimeStore.notify(request, completion: callback) }
      }
    } catch {
      ScreenTimeStore.recordFailure(error)
      ScreenTimeStore.trace("shield-action-error", detail: error.localizedDescription)
      finishAfterNotification(respond) { callback in ScreenTimeStore.notifyFailure(completion: callback) }
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
