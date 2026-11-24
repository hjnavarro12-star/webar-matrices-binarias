import { Injectable } from '@angular/core';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export type CameraPermissionResult = 'granted' | 'denied' | 'error';

@Injectable({
  providedIn: 'root',
})
export class CameraPermissionService {
  async request(): Promise<CameraPermissionResult> {
    if (!Capacitor.isNativePlatform()) return 'granted';

    try {
      const permission = await Camera.requestPermissions({ permissions: ['camera'] });
      return permission.camera === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'error';
    }
  }
}
