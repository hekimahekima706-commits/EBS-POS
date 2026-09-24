import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tz.co.ebsbiz.app',
  appName: 'EBS — Enterprise Business System',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    Camera: {
      presentationStyle: 'fullscreen'
    }
  }
};

export default config;
