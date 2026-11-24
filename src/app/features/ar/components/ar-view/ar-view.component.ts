import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
  inject,
} from '@angular/core';

import { CameraPermissionService } from '../../services/camera-permission.service';

type ArWindow = Window & {
  AFRAME?: unknown;
  ARjs?: unknown;
};

type ArScene = HTMLElement & {
  pause?: () => void;
  renderer?: {
    setAnimationLoop: (callback: (() => void) | null) => void;
    dispose: () => void;
  };
  systems?: {
    arjs?: {
      _arSession?: {
        arSource?: {
          dispose: () => void;
          onResize: () => void;
          copyElementSizeTo: (element: HTMLElement) => void;
        };
      };
    };
  };
};

@Component({
  selector: 'app-ar-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div #mount id="ar-mount" aria-hidden="true"></div>
    <div
      id="ar-status"
      [attr.data-state]="statusState"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >{{ statusMsg }}</div>
  `,
  styles: [`
    app-ar-view {
      position: fixed;
      inset: 0;
      z-index: 1;
      display: block;
      width: 100%;
      height: 100%;
      height: 100dvh;
      overflow: hidden;
      background: transparent;
    }

    #ar-mount,
    #ar-mount a-scene {
      display: block;
      width: 100%;
      height: 100%;
    }

    #ar-mount .a-canvas {
      width: 100% !important;
      height: 100% !important;
    }

    body {
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
    }

    #arjs-video {
      position: fixed !important;
      inset: 0;
      z-index: 0 !important;
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      object-fit: cover;
    }

    #ar-status {
      position: fixed;
      top: max(10px, env(safe-area-inset-top));
      left: 50%;
      z-index: 9999;
      transform: translateX(-50%);
      max-width: 90vw;
      padding: 10px 20px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      font-family: sans-serif;
      font-size: 20px;
      text-align: center;
      pointer-events: none;
    }

    #ar-status[data-state='error'] {
      background: rgba(153, 27, 27, 0.95);
    }

    #error-popup {
      display: none !important;
    }
  `],
})
export class ArViewComponent implements AfterViewInit, OnDestroy {
  protected readonly arAvailable = Boolean(
    (window as ArWindow).AFRAME && (window as ArWindow).ARjs,
  );

  protected readonly salones = [
    '101', '102', '103', '104', '105',
    '201', '202', '203', '204', '205',
    '301', '302', '303', '304', '305',
  ];

  protected statusMsg = this.arAvailable
    ? 'Iniciando cámara...'
    : 'No se pudieron cargar A-Frame o AR.js.';
  protected statusState: 'loading' | 'ready' | 'error' = this.arAvailable
    ? 'loading'
    : 'error';

  @ViewChild('mount', { static: true })
  private mountRef?: ElementRef<HTMLDivElement>;

  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly cameraPermission = inject(CameraPermissionService);
  private readonly listeners = new AbortController();
  private readonly markerTimers = new Map<string, number>();
  private readonly detectedSalons = new Set<string>();
  private currentSalon?: string;
  private scene?: ArScene;

  async ngAfterViewInit(): Promise<void> {
    const mount = this.mountRef?.nativeElement;
    if (!this.arAvailable || !mount) {
      return;
    }

    const permission = await this.cameraPermission.request();
    if (permission === 'denied') {
      this.setStatus(
        'Permiso de cámara denegado. Habilítalo en Configuración y vuelve a intentarlo.',
        'error',
      );
      return;
    }
    if (permission === 'error') {
      this.setStatus(
        'No se pudo solicitar el permiso de cámara. Revisa la configuración de Android.',
        'error',
      );
      return;
    }

    if (this.listeners.signal.aborted) return;

    this.ngZone.runOutsideAngular(() => {
      const signal = this.listeners.signal;
      window.addEventListener('camera-init', this.onCameraInit, { signal });
      window.addEventListener('camera-error', this.onCameraError, { signal });

      const scene = document.createElement('a-scene');
      scene.setAttribute('embedded', '');
      scene.setAttribute(
        'arjs',
        'sourceType: webcam; sourceWidth: 1280; sourceHeight: 960; ' +
        'canvasWidth: 640; canvasHeight: 480; maxDetectionRate: 20; ' +
        'patternRatio: 0.5; detectionMode: mono; labelingMode: black_region',
      );
      scene.setAttribute(
        'renderer',
        'alpha: true; maxCanvasWidth: 720; maxCanvasHeight: 1280',
      );
      scene.setAttribute('vr-mode-ui', 'enabled: false');

      for (const salon of this.salones) {
        const marker = document.createElement('a-marker');
        marker.setAttribute('type', 'pattern');
        marker.setAttribute('url', `assets/markers/pattern-${salon}.patt`);
        marker.setAttribute('minConfidence', '0.75');
        marker.setAttribute('smooth', 'true');
        marker.setAttribute('smoothCount', '5');
        marker.setAttribute('smoothTolerance', '0.01');
        marker.setAttribute('smoothThreshold', '2');
        marker.addEventListener('markerFound', () => {
          this.onMarkerFound(salon);
        }, { signal });
        marker.addEventListener('markerLost', () => {
          this.onMarkerLost(salon);
        }, { signal });

        const label = document.createElement('a-text');
        label.setAttribute('value', `Salon ${salon}`);
        label.setAttribute('position', '0 0 0.05');
        label.setAttribute('rotation', '-30 0 0');
        label.setAttribute('align', 'center');
        label.setAttribute('color', this.colorFor(salon));
        label.setAttribute('scale', '1.4 1.4 1.4');
        label.setAttribute('side', 'double');

        marker.appendChild(label);
        scene.appendChild(marker);
      }

      const camera = document.createElement('a-entity');
      camera.setAttribute('camera', '');
      scene.appendChild(camera);

      this.scene = scene as ArScene;
      mount.replaceChildren(scene);
    });
  }

  ngOnDestroy(): void {
    this.listeners.abort();
    this.clearDetection();

    const scene = this.scene;
    if (scene) {
      scene.pause?.();
      scene.renderer?.setAnimationLoop(null);

      const arSource = scene.systems?.arjs?._arSession?.arSource;
      if (arSource) {
        // AR.js keeps resize callbacks that would access the disposed source.
        arSource.onResize = () => {};
        arSource.copyElementSizeTo = () => {};
        arSource.dispose?.();
      }

      scene.renderer?.dispose?.();
      document.body.style.removeProperty('width');
      document.body.style.removeProperty('height');
      document.body.style.removeProperty('margin-left');
      document.body.style.removeProperty('margin-top');
    }

    document.getElementById('error-popup')?.remove();
  }

  private readonly onMarkerFound = (salon: string): void => {
    const previousTimer = this.markerTimers.get(salon);
    if (previousTimer) window.clearTimeout(previousTimer);

    // Descarta detecciones transitorias antes de actualizar el banner.
    const timer = window.setTimeout(() => {
      this.markerTimers.delete(salon);
      this.detectedSalons.add(salon);
      this.currentSalon = salon;
      this.setStatus(`Salón ${salon} detectado`, 'ready');
    }, 120);
    this.markerTimers.set(salon, timer);
  };

  private readonly onMarkerLost = (salon: string): void => {
    const timer = this.markerTimers.get(salon);
    if (timer) window.clearTimeout(timer);
    this.markerTimers.delete(salon);
    this.detectedSalons.delete(salon);

    if (this.currentSalon !== salon) return;

    const nextSalon = Array.from(this.detectedSalons).at(-1);
    if (nextSalon) {
      this.currentSalon = nextSalon;
      this.setStatus(`Salón ${nextSalon} detectado`, 'ready');
      return;
    }

    this.currentSalon = undefined;
    this.setStatus('Apunta al marcador de un salón', 'ready');
  };

  private readonly onCameraInit = (): void => {
    this.clearDetection();
    this.setStatus('Apunta al marcador de un salón', 'ready');
  };

  private readonly onCameraError = (): void => {
    this.clearDetection();
    this.setStatus(
      'No se pudo acceder a la cámara. Verifica el permiso y vuelve a intentarlo.',
      'error',
    );
  };

  private clearDetection(): void {
    for (const timer of this.markerTimers.values()) {
      window.clearTimeout(timer);
    }
    this.markerTimers.clear();
    this.detectedSalons.clear();
    this.currentSalon = undefined;
  }

  private setStatus(
    message: string,
    state: 'loading' | 'ready' | 'error',
  ): void {
    this.ngZone.run(() => {
      this.statusMsg = message;
      this.statusState = state;
      this.cdr.markForCheck();
    });
  }

  private colorFor(salon: string): string {
    if (salon.startsWith('1')) return '#0a709c';
    if (salon.startsWith('2')) return '#e8c843';
    return '#ffffff';
  }
}
