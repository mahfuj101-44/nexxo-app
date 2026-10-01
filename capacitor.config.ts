import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexxo.enterprise',
  appName: 'NEXXO Enterprise Network',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: [
      'accounts.google.com',
      '*.google.com',
      '*.googleusercontent.com',
      '*.firebaseapp.com',
      'gold-terminus-p9brs.firebaseapp.com',
      'apis.google.com',
      'identitytoolkit.googleapis.com'
    ]
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
