import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.chezsanji.app',
  appName: 'Chez Sanji',
  webDir: 'dist',
  backgroundColor: '#f4f1ea',
  server: {
    androidScheme: 'https',
  },
}

export default config
