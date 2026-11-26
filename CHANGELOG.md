# Changelog — WebAR: matrices binarias

Todos los cambios notables de este proyecto se documentan en este archivo.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versionado semántico: `vMAYOR.MENOR.PARCHE`

---

## [Sin lanzar]

### Agregado
- Integración técnica de `ArViewComponent` con A-Frame 1.3.0 y AR.js 3.4.5, lista para revisión de RA-PBI-03.
- Suite Jasmine/Karma con cinco casos para estados de cámara, marcadores, UTF-8 y limpieza de recursos.
- Configuración `ChromeHeadlessNoSandbox` para ejecutar pruebas en Windows.
- Auditoría CVE local y hashes SRI SHA-384 para A-Frame y AR.js.
- Paquete PBI-05 con APK `1.0-pbi05`, marcador 101, checksum y script de preparación.
- Migración PostgreSQL PBI-07 con `pattern_marker_id`, seed idempotente, `DATABASE_URL` y verificador.

### Corregido
- Banner de Angular en español con tildes Unicode y metaetiqueta UTF-8 existente.
- Etiquetas AR sin diacríticos, escala 1.4 y banner de 20 px para mejorar la lectura.
- Detección 640×480 a 20 FPS, cámara ideal 1280×960, confianza 0.75 y confirmación de eventos para reducir falsos positivos.
- Renderizador limitado a 720×1280 para reducir consumo de CPU.
- Dimensionamiento fullscreen del video, lienzo y contenedor en viewport móvil.
- Liberación de cámara, render loop y callbacks de redimensión de AR.js al destruir la vista.

### Pendiente
- Validar AC-1 a AC-6 con cámara real, marcadores impresos, HTTPS y Android físico.
- Registrar evidencia, tester, versión de APK y aceptación del Product Owner antes de cerrar RA-PBI-03.
- Crear endpoint `GET /api/rooms/:barcode/schedule`.
- Compilar APK de prueba de concepto.

---

<!-- Ejemplo de entrada futura:

## [1.0.0] — 2026-12-10

### Agregado
- APK firmado listo para instalación
- Marcadores Barcode laminados en 5 salones del campus
- Overlay institucional con colores UnPa

### Modificado
- ...

### Corregido
- ...

-->
