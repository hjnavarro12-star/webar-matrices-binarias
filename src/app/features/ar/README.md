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
| `poc/index.html` | RA-PBI-02 | ⏳ Pendiente — abrir en Chrome y verificar detección |
| `ArViewComponent` | RA-PBI-03 | ⏳ Pendiente — Sprint RA-1 |
| `ArService` | RA-PBI-09 | ⏳ Pendiente — Sprint RA-2 |
| `ScheduleOverlayComponent` | RA-PBI-10 | ⏳ Pendiente — Sprint RA-2 |

## Cómo empezar (RA-PBI-02)

1. Descargar marcadores SVG: https://github.com/nicolocarpignoli/artoolkit-barcode-markers-collection
2. Imprimir `3x3_HAMMING63/marker-1.svg`, `marker-2.svg`, `marker-3.svg` en papel A4
3. Abrir `poc/index.html` en Chrome (puede requerir servidor local para acceso a cámara)
4. Apuntar cámara al marcador → verificar que aparece texto

## Integración Angular (RA-PBI-03)

A-Frame no es compatible directamente con las plantillas Angular porque Angular sanitiza el HTML.
La estrategia recomendada:

```typescript
// En ArViewComponent
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

arHtml: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(`
  <a-scene embedded arjs="...">
    <!-- escena AR aquí -->
  </a-scene>
`);
```

Si esta estrategia falla: usar `<iframe>` apuntando a `poc/index.html` servida localmente.
