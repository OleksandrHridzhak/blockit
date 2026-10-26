import ManagedSettings
import ManagedSettingsUI
import UIKit

final class ShieldConfigurationExtension: ShieldConfigurationDataSource {
  override func configuration(shielding application: Application) -> ShieldConfiguration {
    let policy = ScreenTimeStore.policy
    let request = ScreenTimeStore.pending
    let matching = request?.token == application.token ? request : nil
    let seconds = matching.map { max(0, Int(ceil($0.readyAt - Date().timeIntervalSince1970))) }
    let subtitle: String
    let button: String
    if let seconds = seconds, policy.mode == "countdown" {
      subtitle = seconds > 0
        ? "Зачекай ще \(seconds) с. Потім торкнися кнопки знову."
        : "Пауза завершилась. Можеш відкрити цей застосунок на 15 хвилин."
      button = seconds > 0 ? "Перевірити паузу" : "Відкрити на 15 хвилин"
    } else {
      subtitle = policy.mode == "countdown"
        ? "Зроби паузу на \(policy.seconds) с перед відкриттям."
        : "Пауза й коротке завдання в Blockit перед відкриттям. Якщо сповіщення не з’явиться, відкрий Blockit самостійно."
      button = policy.mode == "countdown" ? "Почати паузу" : "Перейти до завдання"
    }
    return ShieldConfiguration(
      backgroundBlurStyle: .systemUltraThinMaterialDark, backgroundColor: UIColor(white: 18.0 / 255.0, alpha: 1),
      icon: UIImage(systemName: "pause")?.withTintColor(UIColor(white: 250.0 / 255.0, alpha: 1), renderingMode: .alwaysOriginal),
      title: .init(text: "Мить для себе", color: UIColor(white: 250.0 / 255.0, alpha: 1)),
      subtitle: .init(text: subtitle, color: UIColor(white: 142.0 / 255.0, alpha: 1)),
      primaryButtonLabel: .init(text: button, color: UIColor(white: 18.0 / 255.0, alpha: 1)),
      primaryButtonBackgroundColor: UIColor(white: 250.0 / 255.0, alpha: 1),
      secondaryButtonLabel: .init(text: "Не відкривати", color: UIColor(white: 250.0 / 255.0, alpha: 1)))
  }
}
