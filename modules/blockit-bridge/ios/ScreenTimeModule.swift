import ExpoModulesCore
import FamilyControls
import SwiftUI
import UserNotifications
import UIKit

public class ScreenTimeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BlockitScreenTime")
    AsyncFunction("getStatus") { () async throws -> [String: Any] in
      try ScreenTimeStore.transaction { ScreenTimeStore.apply() }
      let notifications = await UNUserNotificationCenter.current().notificationSettings()
      let authorization = AuthorizationCenter.shared.authorizationStatus
      let grant = ScreenTimeStore.read("grant", ScreenTimeStore.Grant.self)
      return [
        "available": true,
        "authorization": authorization == .approved ? "approved" : authorization == .denied ? "denied" : "notDetermined",
        "notifications": notifications.authorizationStatus == .authorized || notifications.authorizationStatus == .provisional,
        "count": ScreenTimeStore.selection.applicationTokens.count,
        "enabled": ScreenTimeStore.policy.enabled,
        "seconds": ScreenTimeStore.policy.seconds,
        "mode": ScreenTimeStore.policy.mode,
        "grantUntil": (grant?.until ?? 0) * 1000
      ]
    }
    AsyncFunction("requestAuthorization") { () async throws in
      try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
    }
    AsyncFunction("requestNotifications") { () async throws -> Bool in
      try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound])
    }
    AsyncFunction("savePolicy") { (enabled: Bool, seconds: Int, mode: String) throws in
      guard [10, 20, 30, 60].contains(seconds), ["countdown", "reflection", "typing"].contains(mode) else {
        throw ScreenTimeStore.Failure.answer
      }
      try ScreenTimeStore.transaction {
        ScreenTimeStore.resetAccess()
        ScreenTimeStore.write("policy", ScreenTimeStore.Policy(enabled: enabled, seconds: seconds, mode: mode))
        ScreenTimeStore.apply()
      }
    }
    AsyncFunction("getPending") { () -> [String: Any]? in
      guard let request = ScreenTimeStore.pending else { return nil }
      return ["id": request.id, "readyAt": request.readyAt * 1000, "mode": request.mode]
    }
    AsyncFunction("finish") { (id: String, answer: String) throws in
      try ScreenTimeStore.transaction { try ScreenTimeStore.finish(id: id, answer: answer) }
    }
    AsyncFunction("cancelRequest") { try ScreenTimeStore.transaction { ScreenTimeStore.clearRequest() } }
    AsyncFunction("endAccess") { try ScreenTimeStore.transaction { ScreenTimeStore.resetAccess() } }
    AsyncFunction("pickApps") { (promise: Promise) in
      guard AuthorizationCenter.shared.authorizationStatus == .approved else {
        promise.reject("NO_AUTH", "Спочатку дозволь доступ до Екранного часу.")
        return
      }
      guard let presenter = self.appContext?.utilities?.currentViewController(), presenter.presentedViewController == nil else {
        promise.reject("PICKER_BUSY", "Закрий відкрите вікно й спробуй знову.")
        return
      }
      let picker = UIHostingController(rootView: AppSelectionSheet { selection in
        if let selection = selection {
          do {
            try ScreenTimeStore.transaction {
              ScreenTimeStore.resetAccess()
              // Picker may include category/domain tokens; this release accepts apps only.
              var appsOnly = FamilyActivitySelection()
              appsOnly.applicationTokens = selection.applicationTokens
              ScreenTimeStore.write("selection", appsOnly)
              ScreenTimeStore.apply()
            }
          } catch {
            presenter.dismiss(animated: true) { promise.reject("SAVE_FAILED", error.localizedDescription) }
            return
          }
        }
        presenter.dismiss(animated: true) { promise.resolve(selection != nil) }
      })
      picker.isModalInPresentation = true
      presenter.present(picker, animated: true)
    }.runOnQueue(.main)
  }
}

private struct AppSelectionSheet: View {
  @State private var selection = ScreenTimeStore.selection
  let onDone: (FamilyActivitySelection?) -> Void
  var body: some View {
    NavigationStack {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Обери застосунки")
        .toolbar {
          ToolbarItem(placement: .cancellationAction) { Button("Скасувати") { onDone(nil) } }
          ToolbarItem(placement: .confirmationAction) { Button("Зберегти") { onDone(selection) } }
        }
        .safeAreaInset(edge: .bottom) {
          Text("Обирай окремі застосунки всередині категорій. Категорії та сайти не додаються.")
            .font(.footnote).padding().background(.regularMaterial)
        }
    }
  }
}
