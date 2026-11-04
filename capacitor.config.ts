import { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config — RA-PBI-04 (Isnildo)
 * Configuración crítica para que AR.js acceda a la cámara desde el WebView Android.
 */
const config: CapacitorConfig = {
  appId: 'co.edu.unipacifico.webar',
  appName: 'WebAR UnPa',
  webDir: 'dist/webar-matrices-binarias/browser',
  server: {
    androidScheme: 'https',
    // allowNavigation permite cargar CDN de AR.js y A-Frame en el WebView
    allowNavigation: [
      'aframe.io',
      'raw.githack.com',
      'cdn.jsdelivr.net',
    ],
  },
  android: {
    allowMixedContent: true,   // Necesario para AR.js sobre HTTP en desarrollo
    captureInput: true,
    webContentsDebuggingEnabled: true, // Quitar en producción (RA-PBI-17)
  },
  plugins: {
    Camera: {
      // Permisos de cámara para AR — RA-PBI-04
    },
  },
};

export default config;
