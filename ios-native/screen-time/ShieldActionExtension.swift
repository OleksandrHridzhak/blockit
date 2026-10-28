import ManagedSettings
import UserNotifications
import Foundation

final class ShieldActionExtension: ShieldActionDelegate {
  // DeviceActivity IPC can stall. Keep it off the system's callback queue
  // and serialize repeated taps instead of starting concurrent registrations.
  private static let worker = DispatchQueue(label: "blockit.shield-action", qos: .userInitiated)

  override func handle(action: ShieldAction, for application: ApplicationToken,
                       completionHandler: @escaping (ShieldActionResponse) -> Void) {
    let reply = ActionReply(completionHandler)
    // Arm BEFORE any shared-state lock, notification or DeviceActivity call.
    // .none keeps the existing shield if a system service is unresponsive.
    DispatchQueue.global(qos: .userInteractive).asyncAfter(deadline: .now() + 1.5) {
      reply.send(.none, reason: "deadline")
    }
    Self.worker.async {
      guard !reply.finished else { return }
      ScreenTimeStore.trace("shield-action", detail: action == .primaryButtonPressed ? "primary" : "secondary-or-other")
      switch action {
      case .primaryButtonPressed:
        Self.startPause(for: application, reply: reply)
      case .secondaryButtonPressed:
        try? ScreenTimeStore.transaction {
          guard !reply.finished else { return }
          if let grant = ScreenTimeStore.read("grant", ScreenTimeStore.Grant.self),
             grant.token == application && grant.until > Date().timeIntervalSince1970 { return }
          let request = try ScreenTimeStore.request(for: application)
          ScreenTimeStore.record(request, outcome: "dismissed")
          ScreenTimeStore.clearRequest()
        }
        reply.send(.close, reason: "secondary")
      @unknown default:
        reply.send(.none, reason: "unknown-action")
      }
    }
  }

  private static func startPause(for application: ApplicationToken, reply: ActionReply) {
    do {
      let alreadyOpen = try ScreenTimeStore.transaction { () -> Bool in
        guard !reply.finished else { return false }
        guard let grant = ScreenTimeStore.read("grant", ScreenTimeStore.Grant.self),
              grant.token == application && grant.until > Date().timeIntervalSince1970 else { return false }
        ScreenTimeStore.apply()
        return true
      }
      guard !reply.finished else { return }
      if alreadyOpen { reply.send(.none, reason: "active-grant"); return }
      let request = try ScreenTimeStore.transaction { () throws -> ScreenTimeStore.Request in
        guard !reply.finished else { throw ScreenTimeStore.Failure.invalidRequest }
        return try ScreenTimeStore.request(for: application)
      }
      guard !reply.finished else { return }
      ScreenTimeStore.trace("shield-request", id: request.id, detail: "mode=\(request.mode)")
      // Submit recovery guidance BEFORE slow IPC. The host can recover this
      // same persisted request if registration is interrupted.
      let delivery = DispatchGroup()
      delivery.enter()
      ScreenTimeStore.notify(request) { error in
        ScreenTimeStore.trace("shield-notification", id: request.id, detail: error == nil ? "accepted" : "failed")
        delivery.leave()
      }
      guard !reply.finished else { return }
      if request.mode == "countdown" {
        if request.readyAt <= Date().timeIntervalSince1970 {
          try ScreenTimeStore.finish(id: request.id, answer: "")
          reply.send(.none, reason: "pause-completed")
          return
        }
        ScreenTimeStore.trace("shield-schedule-start", id: request.id)
        _ = try ScreenTimeStore.scheduleCountdown(request)
        ScreenTimeStore.trace("shield-schedule-end", id: request.id)
      }
      delivery.notify(queue: .global(qos: .userInitiated)) {
        reply.send(.defer, reason: "pause-ready")
      }
    } catch {
      guard !reply.finished else { return }
      ScreenTimeStore.recordFailure(error)
      ScreenTimeStore.trace("shield-action-error", detail: error.localizedDescription)
      guard !reply.finished else { return }
      ScreenTimeStore.notifyFailure { _ in reply.send(.defer, reason: "failure-notified") }
    }
  }

  // The deadline, notification and worker may race; exactly one answers iOS.
  private final class ActionReply {
    private let lock = NSLock()
    private var callback: ((ShieldActionResponse) -> Void)?
    private let startedAt = Date().timeIntervalSince1970
    init(_ callback: @escaping (ShieldActionResponse) -> Void) { self.callback = callback }
    var finished: Bool {
      lock.lock()
      defer { lock.unlock() }
      return callback == nil
    }
    func send(_ response: ShieldActionResponse, reason: String) {
      lock.lock()
      guard let callback = callback else { lock.unlock(); return }
      self.callback = nil
      lock.unlock()
      callback(response)
      // Best-effort logging AFTER the response; disk IO must not delay it.
      ScreenTimeStore.trace("shield-action-response", detail: "response=\(String(describing: response)) reason=\(reason) elapsedMs=\(Int((Date().timeIntervalSince1970 - startedAt) * 1000))")
    }
  }
}
