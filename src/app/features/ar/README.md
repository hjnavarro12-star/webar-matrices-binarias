# Módulo AR — `src/app/features/ar/`

Este directorio contiene el módulo de Realidad Aumentada de WebAR: matrices binarias.

## Estructura

```
ar/
├── components/
│   ├── ar-view/           # Componente principal — renderiza la escena A-Frame + AR.js
│   └── schedule-overlay/  # Overlay Ionic con el horario del salón detectado
├── services/
│   └── ar.service.ts      # Escucha eventos markerFound/markerLost, llama a la API
├── models/
│   └── schedule.model.ts  # Interfaces: Room, ScheduleEntry, RoomSchedule, ArState
└── poc/
    └── index.html         # Prueba HTML pura (sin Angular) para validar AR.js en Chrome
```

## Estado de implementación

| Artefacto | PBI | Estado |
|-----------|-----|--------|
| `poc/index.html` | RA-PBI-02 | Pendiente de verificación documentada |
| `ArViewComponent` | RA-PBI-03 | En revisión técnica; validación física y aceptación del PO pendientes |
| `ArService` | RA-PBI-09 | Pendiente — Sprint RA-2 |
| `ScheduleOverlayComponent` | RA-PBI-10 | Pendiente — Sprint RA-2 |

## Cómo empezar (RA-PBI-02)

1. Descargar marcadores SVG: https://github.com/nicolocarpignoli/artoolkit-barcode-markers-collection
2. Imprimir `3x3_HAMMING63/marker-1.svg`, `marker-2.svg`, `marker-3.svg` en papel A4
3. Abrir `poc/index.html` en Chrome (puede requerir servidor local para acceso a cámara)
4. Apuntar cámara al marcador → verificar que aparece texto

## Integración Angular (RA-PBI-03)

**Estado:** implementación técnica disponible para revisión; el PBI no está cerrado.

La estrategia implementada evita HTML dinámico interpolado y reduce la interferencia de Angular:

- A-Frame 1.3.0 y AR.js 3.4.5 se cargan de forma ordenada en `src/index.html`, con SRI SHA-384 y `crossorigin="anonymous"`.
- La escena y los marcadores se crean imperativamente dentro de `NgZone.runOutsideAngular`.
- El componente usa `OnPush`, `ViewEncapsulation.None` y cambio de detección explícito al actualizar el estado.
- El host, el video, el lienzo y el `body` se dimensionan al viewport; el renderizador usa alfa para mostrar la cámara detrás de las etiquetas.
- Los eventos `camera-init`, `camera-error`, `markerFound` y `markerLost` actualizan un banner accesible en español UTF-8 con tildes.
- Las etiquetas AR usan `Salon` sin diacríticos por compatibilidad de la fuente; se centran sobre el marcador con rotación de −30° y escala 1.4 para evitar inclinar la cámara.
- La detección procesa 640×480 a 20 FPS, solicita cámara 1280×960, usa confianza 0.75 y confirma eventos durante 120 ms para reducir falsos positivos.
- El renderizador limita el canvas a 720×1280 y el banner usa 20 px para reducir CPU y mejorar accesibilidad.
- Al destruir el componente se pausa la escena, se detiene el render loop, se libera la cámara y se neutralizan los callbacks de redimensión de AR.js.

### Pruebas automatizadas

```bash
npm test
npm run build:dev
npm run build
```

En equipos sin Chrome instalado, defina `CHROME_BIN` con la ruta de un ejecutable Chromium o Chrome. La configuración `karma.conf.js` utiliza `ChromeHeadlessNoSandbox` para facilitar la ejecución en Windows.

### Validación pendiente

Los criterios AC-1 a AC-6 requieren HTTPS, cámara real, marcadores impresos y dispositivo Android físico. La evidencia, el tester, la versión de APK y la aceptación del Product Owner deben registrarse antes de cerrar RA-PBI-03.
