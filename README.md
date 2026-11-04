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
├── docs/                        # Documentación técnica
│   ├── README.md                # (este índice)
│   ├── documento-profesor.md    # Documento formal para el profesor
│   ├── stack-tecnico.md         # Justificación del stack
│   └── sprints/
│       └── SCRUM-plan.md        # Plan completo: sprints, PBIs, DoDs
│
├── notes/                       # Notas de trabajo privadas (no en git)
│   ├── Clase.txt                # Transcripción de requisitos del profesor
│   ├── seminario 2.txt          # Apuntes de clase
│   ├── investigacion-ra-resultado.md  # Informe técnico de investigación
│   ├── Llamada con DARWIN y 3 personas más.vtt  # Transcripción de reunión
│   └── trello-estructura.md     # Estructura del tablero Trello
│
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
# Configurar .env con credenciales del VPS PostgreSQL
npm run start
```

---

## Licencia

Proyecto académico de la Universidad del Pacífico — ver [LICENSE](LICENSE) para términos completos.  
Uso no comercial libre con atribución. Uso comercial requiere autorización escrita.
