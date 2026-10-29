// Initialize capture before Router loads screens and their side effects.
require('./src/features/diagnostics/runtime').installDiagnostics();
require('expo-router/entry');
