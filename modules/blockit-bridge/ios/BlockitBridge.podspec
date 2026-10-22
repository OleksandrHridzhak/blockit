require 'json'

Pod::Spec.new do |s|
  s.name           = 'BlockitBridge'
  s.version        = '0.1.0'
  s.summary        = 'Native UserDefaults bridge for Blockit'
  s.description    = 'Shares bypass & rule state between React Native and iOS App Intents'
  s.author         = 'Blockit'
  s.homepage       = 'https://github.com/OleksandrHridzhak/blockit'
  s.platforms      = { :ios => '16.0' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
end
