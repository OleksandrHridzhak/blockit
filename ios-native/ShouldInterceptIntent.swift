import AppIntents
import Foundation
import UIKit

private let kStorePrefix = "blockit.v1."

@available(iOS 16.0, *)
enum GuardedAppEnum: String, AppEnum {
  case instagram
  case tiktok
  case youtube
  case x
  case reddit
  case facebook
  case telegram
  case threads

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Guarded App"

  static var caseDisplayRepresentations: [GuardedAppEnum: DisplayRepresentation] = [
    .instagram: "Instagram",
    .tiktok: "TikTok",
    .youtube: "YouTube",
    .x: "X (Twitter)",
    .reddit: "Reddit",
    .facebook: "Facebook",
    .telegram: "Telegram",
    .threads: "Threads",
  ]
}

@available(iOS 16.0, *)
private func shouldInterceptAppId(_ appId: String) -> Bool {
  let defaults = UserDefaults.standard
  let enabledKey = "\(kStorePrefix)enabled.\(appId)"
  if defaults.object(forKey: enabledKey) != nil && !defaults.bool(forKey: enabledKey) {
    return false
  }
  let bypassUntilMs = defaults.double(forKey: "\(kStorePrefix)bypass.\(appId)")
  let nowMs = Date().timeIntervalSince1970 * 1000.0
  if bypassUntilMs > nowMs {
    return false
  }
  return true
}

/// Primary one-step action for Shortcuts Automation:
/// When "Instagram is opened", run this action. Because `openAppWhenRun = true`,
/// iOS immediately brings Blockit to the foreground and routes straight to `/intervene?app=instagram`.
@available(iOS 16.0, *)
struct ShouldInterceptIntent: AppIntent {
  static var title: LocalizedStringResource = "Intercept App with Blockit"
  static var description = IntentDescription(
    "One-step action for Shortcuts Automations: opens Blockit to pause the selected app."
  )
  // Must be true so iOS brings Blockit to the foreground when triggered from Shortcuts!
  static var openAppWhenRun: Bool = true

  @Parameter(title: "App")
  var app: GuardedAppEnum

  @MainActor
  func perform() async throws -> some IntentResult & ReturnsValue<Bool> {
    let appId = app.rawValue
    let defaults = UserDefaults.standard

    defaults.set(appId, forKey: "\(kStorePrefix)pending.app")
    defaults.set(Date().timeIntervalSince1970 * 1000.0, forKey: "\(kStorePrefix)pending.ts")

    return .result(value: shouldInterceptAppId(appId))
  }
}

/// Optional silent background check for users who build a 2-step "If -> Open URL" automation
/// to avoid any app-switch during an active bypass window.
@available(iOS 16.0, *)
struct CheckBypassIntent: AppIntent {
  static var title: LocalizedStringResource = "Check If App Should Be Paused (Silent)"
  static var description = IntentDescription(
    "Silent background check: returns true if the app should be paused, or false if an active bypass window is running."
  )
  static var openAppWhenRun: Bool = false

  @Parameter(title: "App")
  var app: GuardedAppEnum

  func perform() async throws -> some IntentResult & ReturnsValue<Bool> {
    return .result(value: shouldInterceptAppId(app.rawValue))
  }
}

@available(iOS 16.0, *)
struct GetDailySummaryIntent: AppIntent {
  static var title: LocalizedStringResource = "Get Today's Blockit Stats"
  static var description = IntentDescription(
    "Returns a concise summary of today's mindful pauses, exits, and saved minutes for widgets or Shortcuts."
  )
  static var openAppWhenRun: Bool = false

  func perform() async throws -> some IntentResult & ReturnsValue<String> {
    let raw = UserDefaults.standard.string(forKey: "\(kStorePrefix)widget.snapshot")
    guard
      let raw,
      let data = raw.data(using: .utf8),
      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
      return .result(value: "0 pauses today · 0m saved")
    }
    let attempts = json["attemptsToday"] as? Int ?? 0
    let exits = json["mindfulExitsToday"] as? Int ?? 0
    let saved = json["savedMinutesToday"] as? Int ?? 0
    return .result(value: "\(exits)/\(attempts) mindful exits · \(saved)m saved")
  }
}

@available(iOS 16.0, *)
struct BlockitShortcutsProvider: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: ShouldInterceptIntent(),
      phrases: [
        "Intercept \(\.$app) with \(.applicationName)",
        "Pause \(\.$app) in \(.applicationName)",
      ],
      shortTitle: "Intercept App",
      systemImageName: "hand.raised.fill"
    )
    AppShortcut(
      intent: GetDailySummaryIntent(),
      phrases: [
        "Show today's stats in \(.applicationName)",
        "How much time did \(.applicationName) save today",
      ],
      shortTitle: "Today's Stats",
      systemImageName: "chart.bar.fill"
    )
  }
}
