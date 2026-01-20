import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.healthhub.app',
  appName: 'Health Hub',
  webDir: 'out',
  server: {
    url: 'http://192.168.100.74:3000',
    cleartext: true
  }
};

export default config;
