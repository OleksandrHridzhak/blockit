import AppIntents
import Foundation

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
struct ShouldInterceptIntent: AppIntent {
  static var title: LocalizedStringResource = "Should Intercept App"
  static var description = IntentDescription(
    "Returns true when Blockit should pause the user before opening the selected app, or false when an active bypass window allows immediate access."
  )
  static var openAppWhenRun: Bool = false

  @Parameter(title: "App")
  var app: GuardedAppEnum

  func perform() async throws -> some IntentResult & ReturnsValue<Bool> {
    let appId = app.rawValue
    let defaults = UserDefaults.standard

    // If explicitly disabled in Blockit, do not intercept
    let enabledKey = "\(kStorePrefix)enabled.\(appId)"
    if defaults.object(forKey: enabledKey) != nil && !defaults.bool(forKey: enabledKey) {
      return .result(value: false)
    }

    let bypassUntilMs = defaults.double(forKey: "\(kStorePrefix)bypass.\(appId)")
    let nowMs = Date().timeIntervalSince1970 * 1000.0

    if bypassUntilMs > nowMs {
      return .result(value: false)
    }

    return .result(value: true)
  }
}

@available(iOS 16.0, *)
struct BlockitShortcutsProvider: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: ShouldInterceptIntent(),
      phrases: [
        "Check if \(\.$app) should be intercepted in \(.applicationName)",
        "Should \(.applicationName) pause \(\.$app)",
      ],
      shortTitle: "Should Intercept App",
      systemImageName: "hand.raised.fill"
    )
  }
}
