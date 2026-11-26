# WebAR: matrices binarias

**Módulo de Realidad Aumentada para identificación de salones**  
Universidad del Pacífico — Buenaventura, Colombia  
Programa de Ingeniería de Sistemas · Seminario de Actualización II · 2026

---

## ¿Qué es este proyecto?

WebAR es una aplicación Android independiente que permite a cualquier persona apuntar el celular hacia la puerta de un salón de la Universidad del Pacífico y ver el horario de ese salón en pantalla, superpuesto sobre la cámara en tiempo real.

Funciona mediante **marcadores Barcode** (matrices binarias impresas) pegados en cada puerta. La app reconoce el patrón único del marcador e inmediatamente consulta el horario correspondiente desde la base de datos.

> **Criterio de aprobación del profesor Lucio:**  
> El profesor instala la APK, camina por los salones del bloque demo, apaga el celular, cambia de salón, lo enciende, y en cada puerta marcada aparece el horario correcto. Sin GPS, sin QR, sin tomar fotos.

---

## Equipo

| Rol | Nombre | GitHub |
|-----|--------|--------|
| Product Owner + Scrum Master | Harvi Jessy Navarro Gutierrez | hjnavarro12-star |
| Frontend (Angular/Ionic/A-Frame) | Yeison Stiven Lozano Angulo | lozanoangulo |
| Backend (Express/PostgreSQL) | Darwin Andrés Murillo Torres | dandresmurillo |
| Mobile/QA (Capacitor/Android) | Isnildo Equia Perteaga | isnildoper20-droid |

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Detección RA | AR.js | 3.4.8 |
| Motor de escena 3D/AR | A-Frame | 1.5.x |
| Framework UI | Angular + Ionic | 21 + 8 |
| Empaquetado Android | Capacitor | 8 |
| Lenguaje | TypeScript | 5.9 strict |
| Estilos | SCSS | — |
| Backend | Express + Node.js | 4.21 + LTS |
| Base de datos | PostgreSQL | VPS propio |
| Marcadores | Barcode 3x3_HAMMING63 | hasta 64 únicos |

---

## Estructura del repositorio

```
WebAR/
├── src/                         # Código fuente Angular + Ionic
│   ├── app/
│   │   └── features/
│   │       └── ar/              # Módulo AR (a implementar en Sprint RA-1)
│   │           ├── components/  # ArViewComponent, ScheduleOverlayComponent
│   │           ├── services/    # ArService
│   │           ├── models/      # Schedule, Room interfaces
│   │           └── poc/         # index.html puro para prueba inicial
│   └── assets/
│       └── markers/             # SVG de marcadores Barcode para imprimir
│
├── server/                      # Backend Express + PostgreSQL
│   └── src/
│       └── routes/              # Rutas de la API (rooms, schedules)
│
├── .gitignore
├── CHANGELOG.md
├── LICENSE
├── package.json                 # Dependencias del proyecto Angular/Ionic
└── README.md
```

---

## Cronograma

| Sprint | Período | Objetivo | Estado |
|--------|---------|----------|--------|
| Sprint RA-1 | 26 oct – 8 nov 2026 | APK detecta marcadores Barcode en celular físico | ⏳ En curso |
| Sprint RA-2 | 9 nov – 22 nov 2026 | Overlay con horario real desde BD | ⏳ Pendiente |
| Sprint RA-3 | 23 nov – 10 dic 2026 | APK firmado + marcadores en campus + demo | ⏳ Pendiente |

---

## Instalación y desarrollo

```bash
# Clonar e instalar dependencias
git clone <repo-url>
cd WebAR
npm install

# Desarrollo web local
npm run start

# Build para Android
npm run build
npx cap sync android
# Abrir Android Studio y generar APK
```

### Backend (server/)
```bash
cd server
npm install
# Configurar .env con PostgreSQL local o DATABASE_URL de Neon
npm run migrate
npm run db:seed
npm run db:verify
npm test
npm run start
```

API desplegada: https://webar-matrices-binarias-production.up.railway.app

Endpoint de horarios:

```http
GET https://webar-matrices-binarias-production.up.railway.app/api/rooms/pattern-101/schedule
```

También acepta barcodes legacy del 1 al 64. Devuelve `room`, `pattern_marker_id` y `schedule`.

`npm run db:seed` carga 45 horarios de prueba deterministas, con tres horarios y tres materias distintas por cada uno de los quince salones. Es idempotente y no elimina horarios existentes.

### Actualizar horarios (RA-PBI-12)

```http
PUT /api/rooms/1/schedule
Authorization: Bearer <JWT con role admin>
Content-Type: application/json

{ "schedule": [{ "day": "lunes", "start_time": "07:00", "end_time": "09:00", "subject": "Cálculo I", "teacher": "Prof. García" }] }
```

Responde `200 { "updated": true }`. El reemplazo es transaccional, valida los campos y requiere `JWT_SECRET` configurado. La colección Postman incluye el `PUT`, la verificación posterior y el rechazo sin token; use `server/postman/webar-api-local.postman_environment.json` y complete `adminToken`.

El `PUT` está desplegado en Railway y verificado públicamente. La APK debug actualizada está en `dist/pbi12/webar-pbi12-debug.apk` (`versionCode 6`, `versionName 1.0-pbi12`); consume los horarios de Railway/Neon en tiempo de ejecución.

---

## Licencia

Proyecto académico de la Universidad del Pacífico — ver [LICENSE](LICENSE) para términos completos.  
Uso no comercial libre con atribución. Uso comercial requiere autorización escrita.
