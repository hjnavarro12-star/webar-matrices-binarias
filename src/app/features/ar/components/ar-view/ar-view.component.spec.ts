import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { ArService } from '../../services/ar.service';
import { CameraPermissionService } from '../../services/camera-permission.service';
import { ArViewComponent } from './ar-view.component';

type ArWindow = Window & {
  AFRAME?: unknown;
  ARjs?: unknown;
};

type TestScene = HTMLElement & {
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

describe('ArViewComponent', () => {
  const arWindow = window as ArWindow;
  const originalAframe = arWindow.AFRAME;
  const originalArjs = arWindow.ARjs;
  const salones = [
    '101', '102', '103', '104', '105',
    '201', '202', '203', '204', '205',
    '301', '302', '303', '304', '305',
  ];

  let fixture: ComponentFixture<ArViewComponent> | undefined;
  let permissionRequest: jasmine.Spy;
  let markerFound: jasmine.Spy;
  let markerLost: jasmine.Spy;

  beforeEach(async () => {
    arWindow.AFRAME = {};
    arWindow.ARjs = {};
    permissionRequest = jasmine.createSpy('permissionRequest')
      .and.returnValue(Promise.resolve('granted'));
    markerFound = jasmine.createSpy('markerFound');
    markerLost = jasmine.createSpy('markerLost');

    await TestBed.configureTestingModule({
      imports: [ArViewComponent],
      providers: [
        { provide: CameraPermissionService, useValue: { request: permissionRequest } },
        { provide: ArService, useValue: { markerFound, markerLost } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    fixture = undefined;
    arWindow.AFRAME = originalAframe;
    arWindow.ARjs = originalArjs;
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('height');
    document.body.style.removeProperty('margin-left');
    document.body.style.removeProperty('margin-top');
    document.getElementById('error-popup')?.remove();
  });

  function render(): ComponentFixture<ArViewComponent> {
    fixture = TestBed.createComponent(ArViewComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('muestra un error y no crea la escena cuando faltan las librerías AR', () => {
    arWindow.AFRAME = undefined;
    arWindow.ARjs = undefined;

    const view = render();
    const status = view.nativeElement.querySelector('#ar-status') as HTMLElement;

    expect(status.textContent?.trim()).toBe('No se pudieron cargar A-Frame o AR.js.');
    expect(status.dataset['state']).toBe('error');
    expect(view.nativeElement.querySelector('a-scene')).toBeNull();
  });

  it('solicita permiso de cámara antes de crear la escena', async () => {
    const view = render();
    await view.whenStable();
    view.detectChanges();

    expect(permissionRequest).toHaveBeenCalledTimes(1);
    expect(view.nativeElement.querySelector('a-scene')).not.toBeNull();
  });

  it('no crea la escena cuando el permiso de cámara es denegado', async () => {
    permissionRequest.and.returnValue(Promise.resolve('denied'));

    const view = render();
    await view.whenStable();
    view.detectChanges();

    const status = view.nativeElement.querySelector('#ar-status') as HTMLElement;
    expect(view.nativeElement.querySelector('a-scene')).toBeNull();
    expect(status.textContent?.trim()).toBe(
      'Permiso de cámara denegado. Habilítalo en Configuración y vuelve a intentarlo.',
    );
    expect(status.dataset['state']).toBe('error');
  });

  it('crea la escena embebida con los quince marcadores y etiquetas AR sin diacríticos', async () => {
    const view = render();
    await view.whenStable();
    view.detectChanges();
    const scene = view.nativeElement.querySelector('a-scene') as HTMLElement;
    const markers = Array.from(scene.querySelectorAll('a-marker'));
    const labels = Array.from(scene.querySelectorAll('a-text'));
    const status = view.nativeElement.querySelector('#ar-status') as HTMLElement;

    expect(status.textContent?.trim()).toBe('Iniciando cámara...');
    expect(status.dataset['state']).toBe('loading');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(view.nativeElement.querySelector('#ar-mount')?.getAttribute('aria-hidden')).toBe('true');
    expect(scene.getAttribute('embedded')).toBe('');
    expect(scene.getAttribute('arjs')).toBe(
      'sourceType: webcam; sourceWidth: 1280; sourceHeight: 960; ' +
      'canvasWidth: 640; canvasHeight: 480; maxDetectionRate: 20; ' +
      'patternRatio: 0.5; detectionMode: mono; labelingMode: black_region',
    );
    expect(scene.getAttribute('renderer')).toBe(
      'alpha: true; maxCanvasWidth: 720; maxCanvasHeight: 1280',
    );
    expect(scene.getAttribute('vr-mode-ui')).toBe('enabled: false');
    expect(markers.map(marker => marker.getAttribute('data-salon'))).toEqual(salones);
    expect(markers.map(marker => marker.getAttribute('url'))).toEqual(
      salones.map(salon => `assets/markers/pattern-${salon}.patt`),
    );
    expect(labels.map(label => label.getAttribute('value'))).toEqual(
      salones.map(salon => `Salon ${salon}`),
    );
    expect(labels[0].getAttribute('position')).toBe('0 0 0.05');
    expect(labels[0].getAttribute('rotation')).toBe('-30 0 0');
    expect(labels[0].getAttribute('scale')).toBe('1.4 1.4 1.4');
    expect(labels[0].getAttribute('side')).toBe('double');
    expect(markers[0].getAttribute('minConfidence')).toBe('0.75');
    expect(markers[0].getAttribute('smooth')).toBe('true');
    expect(markers[0].getAttribute('smoothCount')).toBe('5');
    expect(markers[0].getAttribute('smoothTolerance')).toBe('0.01');
    expect(markers[0].getAttribute('smoothThreshold')).toBe('2');
    expect(scene.querySelector('a-entity')?.getAttribute('camera')).toBe('');
  });

  it('actualiza el estado cuando la cámara inicia o falla', async () => {
    const view = render();
    await view.whenStable();
    view.detectChanges();
    const status = view.nativeElement.querySelector('#ar-status') as HTMLElement;

    window.dispatchEvent(new CustomEvent('camera-init'));
    view.detectChanges();

    expect(status.textContent?.trim()).toBe('Apunta al marcador de un salón');
    expect(status.dataset['state']).toBe('ready');

    window.dispatchEvent(new CustomEvent('camera-error'));
    view.detectChanges();

    expect(status.textContent?.trim()).toBe(
      'No se pudo acceder a la cámara. Verifica el permiso y vuelve a intentarlo.',
    );
    expect(status.dataset['state']).toBe('error');
  });

  it('actualiza el banner al encontrar y perder un marcador', fakeAsync(() => {
    const view = render();
    tick();
    view.detectChanges();
    const marker = view.nativeElement.querySelector('a-marker') as HTMLElement;
    const status = view.nativeElement.querySelector('#ar-status') as HTMLElement;

    marker.dispatchEvent(new CustomEvent('markerFound'));
    tick(120);
    view.detectChanges();

    expect(status.textContent?.trim()).toBe('Salón 101 detectado');
    expect(status.dataset['state']).toBe('ready');
    expect(status.dataset['salon']).toBe('101');
    expect(markerFound).toHaveBeenCalledOnceWith('101');

    marker.dispatchEvent(new CustomEvent('markerLost'));
    view.detectChanges();

    expect(status.textContent?.trim()).toBe('Apunta al marcador de un salón');
    expect(status.dataset['state']).toBe('ready');
    expect(status.dataset['salon']).toBeUndefined();
    expect(markerLost).toHaveBeenCalledTimes(1);

    marker.dispatchEvent(new CustomEvent('markerFound'));
    marker.dispatchEvent(new CustomEvent('markerLost'));
    tick(120);
    view.detectChanges();

    expect(status.textContent?.trim()).toBe('Apunta al marcador de un salón');
    expect(status.dataset['state']).toBe('ready');
    expect(markerFound).toHaveBeenCalledTimes(1);
  }));

  it('consulta el siguiente salón cuando el marcador actual desaparece', fakeAsync(() => {
    const view = render();
    tick();
    view.detectChanges();
    const markers = view.nativeElement.querySelectorAll('a-marker');

    markers[0].dispatchEvent(new CustomEvent('markerFound'));
    markers[1].dispatchEvent(new CustomEvent('markerFound'));
    tick(120);
    markers[0].dispatchEvent(new CustomEvent('markerLost'));
    view.detectChanges();

    expect(markerFound.calls.allArgs()).toEqual([['101'], ['102']]);
    expect(markerLost).not.toHaveBeenCalled();
  }));

  it('pausa la escena, detiene la cámara y neutraliza los callbacks de AR.js al destruirse', async () => {
    const view = render();
    await view.whenStable();
    view.detectChanges();
    const scene = view.nativeElement.querySelector('a-scene') as TestScene;
    const pause = jasmine.createSpy('pause');
    const setAnimationLoop = jasmine.createSpy('setAnimationLoop');
    const disposeRenderer = jasmine.createSpy('disposeRenderer');
    const disposeSource = jasmine.createSpy('disposeSource');
    const onResize = jasmine.createSpy('onResize');
    const copyElementSizeTo = jasmine.createSpy('copyElementSizeTo');
    const arSource = { dispose: disposeSource, onResize, copyElementSizeTo };

    Object.assign(scene, {
      pause,
      renderer: { setAnimationLoop, dispose: disposeRenderer },
      systems: { arjs: { _arSession: { arSource } } },
    });
    document.body.style.width = '640px';
    document.body.style.height = '480px';
    document.body.style.marginLeft = '-125px';
    const popup = document.createElement('div');
    popup.id = 'error-popup';
    document.body.appendChild(popup);

    view.destroy();
    fixture = undefined;

    expect(pause).toHaveBeenCalledTimes(1);
    expect(setAnimationLoop).toHaveBeenCalledOnceWith(null);
    expect(disposeSource).toHaveBeenCalledTimes(1);
    expect(disposeRenderer).toHaveBeenCalledTimes(1);
    expect(onResize).not.toHaveBeenCalled();
    expect(copyElementSizeTo).not.toHaveBeenCalled();
    expect(document.body.style.width).toBe('');
    expect(document.body.style.height).toBe('');
    expect(document.body.style.marginLeft).toBe('');
    expect(document.getElementById('error-popup')).toBeNull();

    expect(() => {
      scene.systems!.arjs!._arSession!.arSource!.onResize();
      scene.systems!.arjs!._arSession!.arSource!.copyElementSizeTo(document.body);
    }).not.toThrow();
  });
});
