import ExpoModulesCore
import Foundation

private let kStorePrefix = "blockit.v1."

public class BlockitBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BlockitBridge")

    Function("getString") { (key: String) -> String? in
      UserDefaults.standard.string(forKey: kStorePrefix + key)
    }

    Function("setString") { (key: String, value: String) in
      UserDefaults.standard.set(value, forKey: kStorePrefix + key)
    }

    Function("remove") { (key: String) in
      UserDefaults.standard.removeObject(forKey: kStorePrefix + key)
    }

    Function("setBypassUntil") { (appId: String, epochMs: Double) in
      let cleanId = appId.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
      UserDefaults.standard.set(epochMs, forKey: "\(kStorePrefix)bypass.\(cleanId)")
    }

    Function("getBypassUntil") { (appId: String) -> Double in
      let cleanId = appId.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
      return UserDefaults.standard.double(forKey: "\(kStorePrefix)bypass.\(cleanId)")
    }

    Function("setAppEnabled") { (appId: String, enabled: Bool) in
      let cleanId = appId.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
      UserDefaults.standard.set(enabled, forKey: "\(kStorePrefix)enabled.\(cleanId)")
    }

    Function("setWidgetSnapshot") { (json: String) in
      UserDefaults.standard.set(json, forKey: "\(kStorePrefix)widget.snapshot")
    }

    Function("getWidgetSnapshot") { () -> String? in
      UserDefaults.standard.string(forKey: "\(kStorePrefix)widget.snapshot")
    }

    Function("consumePendingInterceptApp") { () -> String? in
      let defaults = UserDefaults.standard
      guard let appId = defaults.string(forKey: "\(kStorePrefix)pending.app") else {
        return nil
      }
      let ts = defaults.double(forKey: "\(kStorePrefix)pending.ts")
      defaults.removeObject(forKey: "\(kStorePrefix)pending.app")
      defaults.removeObject(forKey: "\(kStorePrefix)pending.ts")
      let nowMs = Date().timeIntervalSince1970 * 1000.0
      // Only honor pending intercepts triggered within the last 15 seconds
      if nowMs - ts <= 15_000 {
        return appId
      }
      return nil
    }
  }
}
