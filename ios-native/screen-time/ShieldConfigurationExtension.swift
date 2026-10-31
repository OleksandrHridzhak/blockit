import ManagedSettings
import ManagedSettingsUI
import UIKit
import ImageIO

final class ShieldConfigurationExtension: ShieldConfigurationDataSource {
  // Decode only the size displayed by the shield, keeping extension memory small.
  private static let mascot: UIImage? = {
    guard let url = Bundle.main.url(forResource: "BlockitShieldMascot", withExtension: "png"),
          let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: 384,
          ] as CFDictionary) else { return nil }
    return UIImage(cgImage: image, scale: 3, orientation: .up).withRenderingMode(.alwaysOriginal)
  }()
  override func configuration(shielding application: Application) -> ShieldConfiguration {
    // Preserve the response-only probe's deliberate no-IO behavior.
    if ScreenTimeStore.shieldProbeMode != "response" {
      ScreenTimeStore.trace("shield-configuration", detail: "mode=\(ScreenTimeStore.shieldProbeMode) pending=\(ScreenTimeStore.pending?.id ?? "none") failure=\(ScreenTimeStore.read("lastFailure", ScreenTimeStore.LastFailure.self) != nil)")
    }
    if ScreenTimeStore.shieldProbeEnabled {
      if ScreenTimeStore.shieldProbeMode == "response" {
        return makeConfiguration(subtitle: "Кнопка лише відповідає системі. Текст залишається незмінним, таймер не запускається.", button: "Перевірити відгук", title: "Тест без змін екрана")
      }
      let count = ScreenTimeStore.defaults.integer(forKey: "shieldProbeCount")
      return makeConfiguration(subtitle: "Тестових натискань: \(count). Таймер не запускається, блокування залишається ввімкненим.", button: "Змінити текст", title: "Тест кнопки")
    }
    let policy = application.token.map { ScreenTimeStore.rule(for: $0) }
      ?? ScreenTimeStore.AppRule(seconds: ScreenTimeStore.policy.seconds, mode: ScreenTimeStore.policy.mode)
    let request = ScreenTimeStore.pending
    let matching = request?.token == application.token ? request : nil
    let failure = ScreenTimeStore.read("lastFailure", ScreenTimeStore.LastFailure.self)
    let subtitle: String
    let button: String
    if let failure = failure {
      subtitle = failure.message
      button = "Спробувати ще раз"
    } else if let matching = matching, policy.mode == "countdown" {
      let ready = Date().timeIntervalSince1970 >= matching.readyAt
      subtitle = ready
        ? "Пауза завершилася. Натисни «Розблокувати». Якщо не спрацьовує, відкрий Blockit вручну."
        : "Пауза триває. Доступ має відкритися після завершення. Якщо потрібно, відкрий Blockit вручну."
      button = ready ? "Розблокувати" : "Пауза триває"
    } else if matching != nil && AccessWindow.isMicrolearning(policy.mode) {
      subtitle = "Торкнися сповіщення Blockit, щоб почати паузу. Якщо його немає — відкрий Blockit вручну."
      button = "Надіслати сповіщення ще раз"
    } else if matching != nil {
      subtitle = "Торкнися сповіщення Blockit, щоб виконати завдання. Якщо його немає — відкрий Blockit вручну."
      button = "Надіслати сповіщення ще раз"
    } else if AccessWindow.isMicrolearning(policy.mode) {
      subtitle = "Натисни «Розблокувати», а потім торкнися сповіщення Blockit, щоб почати паузу."
      button = "Розблокувати"
    } else {
      subtitle = policy.mode == "countdown"
        ? "Натисни кнопку, щоб почати паузу на \(policy.seconds) с. Доступ має відкритися після неї."
        : "Натисни кнопку, потім торкнися сповіщення Blockit, щоб перейти до завдання. Якщо сповіщення немає — відкрий Blockit вручну."
      button = "Розблокувати"
    }
    return makeConfiguration(subtitle: subtitle, button: button)
  }
  private func makeConfiguration(subtitle: String, button: String, title: String = "Мить для себе") -> ShieldConfiguration {
    ShieldConfiguration(
      backgroundBlurStyle: nil, backgroundColor: .white,
      icon: Self.mascot,
      title: .init(text: title, color: UIColor(white: 28.0 / 255.0, alpha: 1)),
      subtitle: .init(text: subtitle, color: UIColor(white: 96.0 / 255.0, alpha: 1)),
      primaryButtonLabel: .init(text: button, color: .white),
      primaryButtonBackgroundColor: UIColor(red: 46.0 / 255.0, green: 125.0 / 255.0, blue: 60.0 / 255.0, alpha: 1),
      secondaryButtonLabel: .init(text: "Не відкривати", color: UIColor(white: 96.0 / 255.0, alpha: 1)))
  }
}
