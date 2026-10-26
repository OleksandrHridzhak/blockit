import ManagedSettings
import UserNotifications

final class ShieldActionExtension: ShieldActionDelegate {
  override func handle(action: ShieldAction, for application: ApplicationToken,
                       completionHandler: @escaping (ShieldActionResponse) -> Void) {
    guard action == .primaryButtonPressed else {
      try? ScreenTimeStore.transaction { ScreenTimeStore.clearRequest() }
      completionHandler(.close)
      return
    }
    guard let request = try? ScreenTimeStore.transaction({ ScreenTimeStore.request(for: application) }) else {
      completionHandler(.close)
      return
    }
    if request.mode == "countdown", Date().timeIntervalSince1970 >= request.readyAt {
      do {
        try ScreenTimeStore.transaction { try ScreenTimeStore.finish(id: request.id, answer: "") }
        completionHandler(.none)
      } catch {
        ScreenTimeStore.notify(request) { _ in completionHandler(.defer) }
      }
      return
    }
    // Wait for registration completion before the extension can be terminated.
    ScreenTimeStore.notify(request) { _ in completionHandler(.defer) }
  }
}
