import ExpoModulesCore
import FamilyControls
import ManagedSettings
import SwiftUI
import UserNotifications
import UIKit

public class ScreenTimeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BlockitScreenTime")
    AsyncFunction("setShieldProbeMode") { (mode: String) throws in
      try ScreenTimeStore.setShieldProbeMode(mode)
    }
    AsyncFunction("getProtectionOverrides") { () throws -> [String: Double] in
      try ScreenTimeStore.transaction {
        ScreenTimeStore.apply()
        return ScreenTimeStore.protectionOverrides.mapValues { $0.until * 1000 }
      }
    }
    AsyncFunction("setProtectionOverride") { (scope: String, minutes: Int) throws in
      try ScreenTimeStore.setProtectionOverride(scope: scope, minutes: minutes)
    }
    AsyncFunction("getDiagnostics") { () throws -> String in
      // Do not reconcile access here: inspecting a failure must preserve it.
      let grant = ScreenTimeStore.read("grant", ScreenTimeStore.Grant.self)
      let activities = ScreenTimeStore.center.activities.map { activity -> [String: Any] in
        let next = ScreenTimeStore.center.schedule(for: activity)?.nextInterval
        return ["id": String(activity.rawValue.prefix(8)), "kind": activity.rawValue.contains(".expiry") ? "expiry" : "access",
                "start": next?.start.timeIntervalSince1970 ?? 0, "end": next?.end.timeIntervalSince1970 ?? 0,
                "events": ScreenTimeStore.center.events(for: activity).count]
      }
      let traces = ScreenTimeStore.monitorTrace().map { ["time": $0.timestamp, "event": $0.event, "request": $0.request, "detail": $0.detail, "process": $0.process ?? "unknown"] as [String: Any] }
      let data: [String: Any] = ["ios": UIDevice.current.systemVersion,
        "build": Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "",
        "supportsResponseProbe": true,
        "shieldProbeMode": ScreenTimeStore.shieldProbeMode,
        "shieldProbeCount": ScreenTimeStore.defaults.integer(forKey: "shieldProbeCount"),
        "now": Date().timeIntervalSince1970, "grantUntil": grant?.until ?? 0,
        "grantMonitor": grant?.monitorID ?? grant?.id ?? "",
        "shieldedApps": ScreenTimeStore.settings.shield.applications?.count ?? 0,
        "lastError": ScreenTimeStore.read("lastFailure", ScreenTimeStore.LastFailure.self)?.detail ?? "",
        "activities": activities, "trace": traces]
      return String(data: try JSONSerialization.data(withJSONObject: data, options: [.prettyPrinted, .sortedKeys]), encoding: .utf8) ?? ""
    }
    View(FamilyActivityLabelView.self) {
      ViewName("FamilyActivityLabel")
      Prop("tokenId") { (view: FamilyActivityLabelView, tokenID: String) in
        view.setTokenID(tokenID)
      }
    }
    AsyncFunction("getStatus") { () async throws -> [String: Any] in
      let readyID = try ScreenTimeStore.transaction { () -> String? in
        guard let request = ScreenTimeStore.pending, request.mode == "countdown",
          request.readyAt <= Date().timeIntervalSince1970,
          ScreenTimeStore.read("scheduledGrant", ScreenTimeStore.ScheduledGrant.self)?.window.requestID == request.id else { return nil }
        return request.id
      }
      if let id = readyID {
        try ScreenTimeStore.finish(id: id, answer: "", trackUsage: true)
      }
      try ScreenTimeStore.transaction { ScreenTimeStore.apply() }
      let notifications = await UNUserNotificationCenter.current().notificationSettings()
      let authorization = AuthorizationCenter.shared.authorizationStatus
      let grant = ScreenTimeStore.read("grant", ScreenTimeStore.Grant.self)
      return [
        "available": true,
        "supportsCustomSessions": true, "supportsShortSessions": true, "supportsSecondSessions": true,
        "supportsMicrolearning": true,
        "supportsMicrolearningV2": true,
        "authorization": authorization == .approved ? "approved" : authorization == .denied ? "denied" : "notDetermined",
        "notifications": notifications.authorizationStatus == .authorized || notifications.authorizationStatus == .provisional,
        "count": ScreenTimeStore.selection.applicationTokens.count,
        "enabled": ScreenTimeStore.policy.enabled,
        "seconds": ScreenTimeStore.policy.seconds,
        "mode": ScreenTimeStore.policy.mode,
        "grantUntil": (grant?.until ?? 0) * 1000,
        "lastError": ScreenTimeStore.read("lastFailure", ScreenTimeStore.LastFailure.self)?.message ?? ""
      ]
    }
    AsyncFunction("requestAuthorization") { () async throws in
      try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
    }
    AsyncFunction("requestNotifications") { () async throws -> Bool in
      try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound])
    }
    AsyncFunction("getSelectedApps") { () throws -> [[String: Any]] in
      try ScreenTimeStore.transaction {
        (ScreenTimeStore.groups.first { $0.id == "legacy" }?.tokens ?? [])
          .map { token -> [String: Any] in
            let rule = ScreenTimeStore.rule(for: token)
            let group = ScreenTimeStore.group(for: token)
            return ["id": ScreenTimeStore.applicationID(token), "seconds": rule.seconds, "mode": rule.mode, "sessionMinutes": rule.sessionMinutes ?? 15,
                    "groupId": group?.id ?? "legacy", "groupName": group?.name ?? "Мої застосунки"]
          }
          .sorted { ($0["id"] as? String ?? "") < ($1["id"] as? String ?? "") }
      }
    }
    AsyncFunction("saveAppRule") { (tokenID: String, seconds: Int, mode: String, sessionMinutes: Double?) throws in
      defer { ScreenTimeStore.stopUnusedMonitoring() }
      guard (1...86400).contains(seconds), ["countdown", "reflection", "typing", "microlearning", "microlearning-v2"].contains(mode), AccessWindow.isValidSessionMinutes(sessionMinutes ?? 15) else {
        throw ScreenTimeStore.Failure.answer
      }
      try ScreenTimeStore.transaction {
        guard let token = ScreenTimeStore.selectedToken(id: tokenID), ScreenTimeStore.group(for: token)?.id == "legacy" else { throw ScreenTimeStore.Failure.invalidRequest }
        var rules = ScreenTimeStore.appRules
        rules[tokenID] = ScreenTimeStore.AppRule(seconds: seconds, mode: mode, sessionMinutes: sessionMinutes ?? 15)
        ScreenTimeStore.resetAccess()
        ScreenTimeStore.write("appRules", rules)
        ScreenTimeStore.apply()
      }
    }
    AsyncFunction("removeSelectedApp") { (tokenID: String) throws in
      defer { ScreenTimeStore.stopUnusedMonitoring() }
      try ScreenTimeStore.transaction {
        guard let token = ScreenTimeStore.selectedToken(id: tokenID),
              var group = ScreenTimeStore.groups.first(where: { $0.id == "legacy" }),
              group.tokens.contains(token) else { throw ScreenTimeStore.Failure.invalidRequest }
        group.tokens.remove(token)
        ScreenTimeStore.saveGroup(group)
      }
    }
    AsyncFunction("savePolicy") { (enabled: Bool, seconds: Int, mode: String) throws in
      defer { ScreenTimeStore.stopUnusedMonitoring() }
      guard (1...86400).contains(seconds), ["countdown", "reflection", "typing", "microlearning", "microlearning-v2"].contains(mode) else {
        throw ScreenTimeStore.Failure.answer
      }
      try ScreenTimeStore.transaction {
        ScreenTimeStore.resetAccess()
        ScreenTimeStore.write("policy", ScreenTimeStore.Policy(enabled: enabled, seconds: seconds, mode: mode))
        ScreenTimeStore.apply()
      }
    }
    AsyncFunction("getGroups") { () throws -> [[String: Any]] in
      try ScreenTimeStore.transaction {
        ScreenTimeStore.groups.filter { $0.id != "legacy" }.map { group in
          ["id": group.id, "name": group.name, "seconds": group.seconds, "mode": group.mode, "sessionMinutes": group.sessionMinutes ?? 15,
           "appIds": group.tokens.map(ScreenTimeStore.applicationID).sorted()] as [String: Any]
        }
      }
    }
    AsyncFunction("getHistory") { () throws -> [[String: Any]] in
      try ScreenTimeStore.transaction {
        ScreenTimeStore.history.map { event in
          ["id": event.id, "appId": event.appId, "groupName": event.groupName,
           "timestampMs": event.timestampMs, "outcome": event.outcome] as [String: Any]
        }
      }
    }
    AsyncFunction("saveGroup") { (id: String, name: String, seconds: Int, mode: String, sessionMinutes: Double?) throws in
      try self.validateGroup(id: id, name: name, seconds: seconds, mode: mode)
      guard AccessWindow.isValidSessionMinutes(sessionMinutes ?? 15) else { throw ScreenTimeStore.Failure.answer }
      defer { ScreenTimeStore.stopUnusedMonitoring() }
      try ScreenTimeStore.transaction {
        guard var group = ScreenTimeStore.groups.first(where: { $0.id == id }) else { throw ScreenTimeStore.Failure.invalidRequest }
        group.name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        group.seconds = seconds
        group.mode = mode
        group.sessionMinutes = sessionMinutes ?? 15
        ScreenTimeStore.saveGroup(group)
      }
    }
    AsyncFunction("deleteGroup") { (id: String) throws in
      defer { ScreenTimeStore.stopUnusedMonitoring() }
      try ScreenTimeStore.transaction { ScreenTimeStore.saveGroups(ScreenTimeStore.groups.filter { $0.id != id }) }
    }
    AsyncFunction("pickGroupApps") { (id: String, name: String, seconds: Int, mode: String, sessionMinutes: Double?, promise: Promise) in
      do {
        try self.validateGroup(id: id, name: name, seconds: seconds, mode: mode)
        guard AccessWindow.isValidSessionMinutes(sessionMinutes ?? 15) else { throw ScreenTimeStore.Failure.answer }
        let tokens = try ScreenTimeStore.transaction { ScreenTimeStore.groups.first(where: { $0.id == id })?.tokens ?? [] }
        self.presentPicker(group: ScreenTimeStore.AppGroup(id: id, name: name.trimmingCharacters(in: .whitespacesAndNewlines), seconds: seconds, mode: mode, tokens: tokens, sessionMinutes: sessionMinutes ?? 15), promise: promise)
      } catch { promise.reject("INVALID_GROUP", error.localizedDescription) }
    }.runOnQueue(.main)
    AsyncFunction("getPending") { () throws -> [String: Any]? in
      try ScreenTimeStore.transaction {
        guard let request = ScreenTimeStore.pending else { return nil }
        return ["id": request.id, "readyAt": request.readyAt * 1000, "mode": request.mode, "sessionMinutes": request.sessionMinutes ?? 15,
                "appId": ScreenTimeStore.applicationID(request.token),
                "groupName": request.groupName ?? "Мої застосунки", "groupId": request.groupID ?? "legacy"]
      }
    }
    AsyncFunction("getActiveAccess") { () throws -> [String: Any]? in
      try ScreenTimeStore.transaction {
        guard let grant = ScreenTimeStore.read("grant", ScreenTimeStore.Grant.self),
              grant.until > Date().timeIntervalSince1970 else { return nil }
        return ["id": grant.id, "readyAt": 0, "mode": "countdown",
          "appId": ScreenTimeStore.applicationID(grant.token),
          "sessionMinutes": max(1, ceil(grant.until - Date().timeIntervalSince1970)) / 60]
      }
    }
    AsyncFunction("startMicrolearning") { (id: String) throws -> [String: Any] in
      let request = try ScreenTimeStore.startMicrolearning(id: id)
      return ["id": request.id, "readyAt": request.readyAt * 1000, "mode": request.mode,
              "sessionMinutes": request.sessionMinutes ?? 15, "groupId": request.groupID ?? "legacy",
              "groupName": request.groupName ?? "Мої застосунки", "appId": ScreenTimeStore.applicationID(request.token)]
    }
    AsyncFunction("finish") { (id: String, answer: String) throws in
      do { try ScreenTimeStore.finish(id: id, answer: answer, trackUsage: true) }
      catch { ScreenTimeStore.recordFailure(error); throw error }
    }
    AsyncFunction("cancelRequest") {
      defer { ScreenTimeStore.stopUnusedMonitoring() }
      try ScreenTimeStore.transaction {
        if let request = ScreenTimeStore.pending { ScreenTimeStore.record(request, outcome: "dismissed") }
        ScreenTimeStore.clearRequest()
      }
    }
    AsyncFunction("endAccess") {
      defer { ScreenTimeStore.stopUnusedMonitoring() }
      try ScreenTimeStore.transaction { ScreenTimeStore.resetAccess() }
    }
    AsyncFunction("pickApps") { (promise: Promise) in
      let group = ScreenTimeStore.groups.first(where: { $0.id == "legacy" })
        ?? ScreenTimeStore.AppGroup(id: "legacy", name: "Мої застосунки", seconds: 20, mode: "countdown", tokens: [])
      self.presentPicker(group: group, promise: promise)
    }.runOnQueue(.main)
  }
  private func validateGroup(id: String, name: String, seconds: Int, mode: String) throws {
    guard !id.isEmpty, id.count <= 80, !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
          name.count <= 60, (1...86400).contains(seconds),
          ["countdown", "reflection", "typing", "microlearning", "microlearning-v2"].contains(mode) else { throw ScreenTimeStore.Failure.answer }
  }
  private func presentPicker(group: ScreenTimeStore.AppGroup, promise: Promise) {
      guard AuthorizationCenter.shared.authorizationStatus == .approved else {
        promise.reject("NO_AUTH", "Спочатку дозволь доступ до Екранного часу.")
        return
      }
      guard let presenter = self.appContext?.utilities?.currentViewController(), presenter.presentedViewController == nil else {
        promise.reject("PICKER_BUSY", "Закрий відкрите вікно й спробуй знову.")
        return
      }
      var initial = FamilyActivitySelection()
      initial.applicationTokens = group.tokens
      let picker = UIHostingController(rootView: AppSelectionSheet(selection: initial) { selection in
        if let selection = selection {
          do {
            try ScreenTimeStore.transaction {
              var updated = group
              updated.tokens = selection.applicationTokens
              ScreenTimeStore.saveGroup(updated)
            }
            ScreenTimeStore.stopUnusedMonitoring()
          } catch {
            presenter.dismiss(animated: true) { promise.reject("SAVE_FAILED", error.localizedDescription) }
            return
          }
        }
        presenter.dismiss(animated: true) { promise.resolve(selection != nil) }
      })
      picker.isModalInPresentation = true
      presenter.present(picker, animated: true)
  }
}

private final class FamilyActivityLabelView: ExpoView {
  private var hostingController: UIHostingController<FamilyAppLabelContent>
  private var tokenID = ""

  required init(appContext: AppContext? = nil) {
    hostingController = UIHostingController(rootView: FamilyAppLabelContent(token: nil))
    super.init(appContext: appContext)
    hostingController.view.backgroundColor = .clear
    hostingController.view.translatesAutoresizingMaskIntoConstraints = true
    addSubview(hostingController.view)
  }

  func setTokenID(_ value: String) {
    guard tokenID != value else { return }
    tokenID = value
    hostingController.rootView = FamilyAppLabelContent(token: ScreenTimeStore.selectedToken(id: value))
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    hostingController.view.frame = bounds
  }
}

private struct FamilyAppLabelContent: View {
  let token: ApplicationToken?

  var body: some View {
    Group {
      if let token {
        Label(token)
      } else {
        Label("Застосунок", systemImage: "app")
      }
    }
    .labelStyle(BlockitAppLabelStyle())
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

private struct BlockitAppLabelStyle: LabelStyle {
  func makeBody(configuration: Configuration) -> some View {
    HStack(spacing: 14) {
      configuration.icon
        .scaleEffect(1.7)
        .frame(width: 44, height: 44)
        .accessibilityHidden(true)
      configuration.title
        .font(.body)
        .fixedSize(horizontal: false, vertical: true)
    }
  }
}

private struct AppSelectionSheet: View {
  @State var selection: FamilyActivitySelection
  @State private var pickerID = UUID()
  let onDone: (FamilyActivitySelection?) -> Void
  var body: some View {
    NavigationStack {
      FamilyActivityPicker(selection: $selection)
        .id(pickerID)
        .navigationTitle("Обери застосунки")
        .toolbar {
          ToolbarItem(placement: .cancellationAction) { Button("Скасувати") { onDone(nil) } }
          ToolbarItem(placement: .confirmationAction) { Button("Зберегти") { onDone(selection) } }
        }
        .safeAreaInset(edge: .bottom) {
          VStack(spacing: 8) {
            Button {
              pickerID = UUID()
            } label: {
              Label("Перезавантажити список", systemImage: "arrow.clockwise")
                .frame(maxWidth: .infinity, minHeight: 44)
            }
            Text("Обирай окремі застосунки всередині категорій. Категорії та сайти не додаються.")
              .font(.footnote)
          }
          .padding().background(.regularMaterial)
        }
    }
  }
}
