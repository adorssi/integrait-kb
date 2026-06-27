# 🏭 Software Factory — IT Knowledge Base (MVP v1.0)
> Sistema de gestión de incidentes para empresa de servicios IT.
> Permite administrar técnicos, clientes, incidentes y soluciones.
>
> ⚠️ FASE ACTUAL: MVP — CRUD funcional sin integración de IA.
> La integración con IA (chat semántico + embeddings) está planificada para una fase posterior.
> No implementar nada relacionado con IA, embeddings o búsqueda semántica en esta fase.

---

## 📦 Stack Tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend | React 18 + TypeScript + Tailwind CSS | Tipado fuerte, ecosistema maduro |
| Backend | Node.js + Express + TypeScript | Mismo lenguaje full-stack, fácil mantenimiento |
| Base de datos | PostgreSQL 16 | Robusto, open source, preparado para crecer |
| ORM | Prisma | Type-safe, migraciones automáticas |
| Autenticación | JWT + bcrypt | Estándar, sin dependencias externas |
| Testing | Vitest (unit) + Supertest (integration) | Rápido, compatible con TypeScript |

> Sin Docker por ahora. Desarrollo local directo.
> PostgreSQL instalado localmente o via `brew`/`apt`.

---

## 🎯 Alcance del MVP

### ✅ Incluido en esta fase

**Gestión de técnicos (solo ADMIN)**
- Crear técnico (nombre, email, password, rol)
- Listar técnicos
- Editar técnico
- Desactivar técnico (soft delete — nunca borrar)

**Gestión de clientes (solo ADMIN)**
- Crear cliente (nombre, contacto, notas de infraestructura)
- Listar clientes
- Editar cliente
- Desactivar cliente (soft delete)

**Gestión de incidentes (ADMIN y TECHNICIAN)**
- Crear incidente (título, descripción, cliente, prioridad, tags)
- Asignar técnico a un incidente
- Cambiar estado: OPEN → IN_PROGRESS → RESOLVED
- Listar incidentes con filtros: por cliente, por estado, por técnico, por prioridad
- Ver detalle de un incidente

**Gestión de soluciones**
- Registrar solución a un incidente (descripción, tiempo empleado)
- Un incidente resuelto debe tener siempre una solución registrada
- Ver historial de soluciones por cliente

**Autenticación**
- Login con email + password
- JWT con expiración de 8 horas
- Control de acceso por rol (ADMIN / TECHNICIAN)

### ❌ Fuera de alcance en esta fase
- Chat con IA
- Búsqueda semántica
- Embeddings
- Integración con Ollama o cualquier modelo de lenguaje
- Notificaciones por email
- Reportes exportables
- API pública

---

## 🗂️ Estructura de Carpetas

```
it-knowledge-base/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Lógica de endpoints
│   │   ├── services/        # Lógica de negocio
│   │   ├── repositories/    # Acceso a base de datos (via Prisma)
│   │   ├── middlewares/     # Auth, validación, error handling
│   │   ├── models/          # Tipos e interfaces TypeScript
│   │   ├── routes/          # Definición de rutas Express
│   │   └── utils/           # Helpers compartidos
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── .env
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes reutilizables (botones, inputs, tablas)
│   │   ├── pages/           # Vistas: Login, Clientes, Técnicos, Incidentes, Detalle
│   │   ├── hooks/           # Custom hooks (useAuth, useIncidents, etc.)
│   │   ├── services/        # Llamadas a la API REST
│   │   └── types/           # Tipos TypeScript compartidos con backend
│   └── package.json
└── docs/
    ├── ADR/                 # Architecture Decision Records
    ├── API.md               # Documentación de todos los endpoints
    └── RUNBOOK.md           # Cómo levantar el proyecto localmente
```

---

## 🗄️ Modelo de Datos

```prisma
model Client {
  id        String     @id @default(uuid())
  name      String
  contact   String
  notes     String?
  active    Boolean    @default(true)
  incidents Incident[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model Technician {
  id           String     @id @default(uuid())
  name         String
  email        String     @unique
  passwordHash String
  role         Role       @default(TECHNICIAN)
  active       Boolean    @default(true)
  incidents    Incident[]
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

model Incident {
  id           String         @id @default(uuid())
  title        String
  description  String
  status       IncidentStatus @default(OPEN)
  priority     Priority       @default(MEDIUM)
  client       Client         @relation(fields: [clientId], references: [id])
  clientId     String
  assignedTo   Technician?    @relation(fields: [technicianId], references: [id])
  technicianId String?
  solution     Solution?
  tags         Tag[]
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}

model Solution {
  id               String   @id @default(uuid())
  description      String
  timeSpentMinutes Int
  incident         Incident @relation(fields: [incidentId], references: [id])
  incidentId       String   @unique
  createdAt        DateTime @default(now())
}

model Tag {
  id        String     @id @default(uuid())
  name      String     @unique
  incidents Incident[]
}

enum Role            { TECHNICIAN ADMIN }
enum IncidentStatus  { OPEN IN_PROGRESS RESOLVED }
enum Priority        { LOW MEDIUM HIGH CRITICAL }
```

> Notas del modelo:
> - `active` en Client y Technician permite soft delete (nunca borrar registros).
> - Solution no tiene `embedding` en esta fase. Se agregará en la fase de IA.
> - Las reglas de negocio: un incidente solo puede pasar a RESOLVED si tiene una Solution registrada.

---

## 🔌 Endpoints de la API

### Auth
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | /auth/login | público | Login, devuelve JWT |
| GET | /auth/me | any | Datos del técnico autenticado |

### Técnicos
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | /technicians | ADMIN | Listar todos |
| GET | /technicians/:id | ADMIN | Ver detalle |
| POST | /technicians | ADMIN | Crear |
| PUT | /technicians/:id | ADMIN | Editar |
| PATCH | /technicians/:id/deactivate | ADMIN | Desactivar |

### Clientes
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | /clients | any | Listar activos |
| GET | /clients/:id | any | Ver detalle + incidentes recientes |
| POST | /clients | ADMIN | Crear |
| PUT | /clients/:id | ADMIN | Editar |
| PATCH | /clients/:id/deactivate | ADMIN | Desactivar |

### Incidentes
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | /incidents | any | Listar con filtros opcionales |
| GET | /incidents/:id | any | Ver detalle completo |
| POST | /incidents | any | Crear nuevo incidente |
| PUT | /incidents/:id | any | Editar (solo si está OPEN) |
| PATCH | /incidents/:id/assign | ADMIN | Asignar técnico |
| PATCH | /incidents/:id/status | any | Cambiar estado |
| POST | /incidents/:id/solution | any | Registrar solución |

### Tags
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | /tags | any | Listar todos los tags |
| POST | /tags | ADMIN | Crear tag |

---

## 👥 Roles del Equipo

Para invocar un rol: *"Actuá como [NOMBRE_ROL] y..."*

---

### 🏗️ ROL: ARCHITECT

**Responsabilidad:** Diseño antes de cualquier implementación.

**Debe hacer siempre:**
- Analizar impacto en módulos existentes.
- Crear ADR en `docs/ADR/` para decisiones relevantes.
- Definir interfaces TypeScript antes de que Developer empiece.
- Identificar si la feature requiere migración de base de datos.

**Formato de ADR:**
```markdown
# ADR-NNN: [Título]
**Fecha:** YYYY-MM-DD
**Estado:** Propuesto / Aceptado / Rechazado
**Contexto:** Por qué se necesita
**Decisión:** Qué se va a hacer
**Consecuencias:** Qué se gana y qué se sacrifica
```

**No puede hacer:**
- Escribir código de implementación.
- Decidir sin documentar.

---

### 💻 ROL: DEVELOPER

**Responsabilidad:** Implementación limpia, mantenible y segura.

**Reglas obligatorias:**
- TypeScript estricto. Prohibido `any`.
- Manejo de errores explícito en todo async (try/catch tipado).
- Nunca hardcodear credenciales o URLs. Siempre variables de entorno.
- JSDoc en funciones de más de 20 líneas.
- Nombres en inglés. Comentarios en español.
- Validar inputs con Zod en cada endpoint.
- Una función, una responsabilidad.

**Convenciones de naming:**
```typescript
// Archivos: kebab-case
incident-controller.ts

// Clases: PascalCase
class IncidentService {}

// Funciones y variables: camelCase
const findIncidentById = async (id: string) => {}

// Constantes: UPPER_SNAKE_CASE
const MAX_RESULTS_PER_PAGE = 50;

// Interfaces y tipos: PascalCase
interface IIncident {}
type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
```

**No puede hacer:**
- Saltear validación de inputs.
- Modificar schema sin ADR previo.
- Commitear sin que QA haya revisado.

---

### 🧪 ROL: QA ENGINEER

**Responsabilidad:** Verificar que el código funciona en todos los escenarios.

**Checklist por feature:**

Tests unitarios (Vitest):
- [ ] Happy path con inputs válidos
- [ ] Input vacío o nulo
- [ ] Input con formato incorrecto
- [ ] Error manejado correctamente

Tests de integración (Supertest):
- [ ] 200/201 con datos correctos
- [ ] 400 con input inválido
- [ ] 401 sin token
- [ ] 403 con rol incorrecto
- [ ] 404 cuando no existe el recurso

**Cobertura mínima:** 80% en services y controllers.

**Reporte obligatorio:**
```markdown
## QA Report — [Feature]
**Fecha:** YYYY-MM-DD
**Tests escritos:** X unitarios, Y integración
**Cobertura:** Z%
**Issues:** [lista o "ninguno"]
**Resultado:** ✅ Aprobado / ❌ Requiere correcciones
```

---

### 🔒 ROL: SECURITY ENGINEER

**Responsabilidad:** Auditar vulnerabilidades antes de cada merge.

**Checklist:**

Autenticación:
- [ ] Endpoints protegidos requieren JWT válido
- [ ] Roles verificados por endpoint
- [ ] Tokens con expiración máxima 8 horas
- [ ] Passwords hasheados con bcrypt (mínimo 12 rounds)

Datos:
- [ ] Logs no imprimen passwords ni tokens
- [ ] Respuestas no exponen passwordHash ni campos internos
- [ ] IDs son UUID (no auto-incrementales)

Inputs:
- [ ] Todo input pasa por Zod antes de procesarse
- [ ] Queries usan parámetros preparados (Prisma lo garantiza; revisar queries raw si las hay)

Configuración:
- [ ] Sin secrets en código fuente
- [ ] `.env` en `.gitignore`
- [ ] `.env.example` actualizado

Dependencias:
- [ ] `npm audit` sin vulnerabilidades High/Critical

**Reporte obligatorio:**
```markdown
## Security Report — [Feature]
**Fecha:** YYYY-MM-DD
**Vulnerabilidades:** [lista o "ninguna"]
**npm audit:** High: N, Critical: N
**Resultado:** ✅ Aprobado / ❌ Requiere correcciones
```

---

### 📝 ROL: TECH WRITER

**Responsabilidad:** Documentar para que cualquier técnico del equipo pueda entender y operar.

**Debe actualizar siempre:**

`docs/API.md` — Para cada endpoint nuevo:
```markdown
## POST /incidents/:id/solution
**Descripción:** Registra la solución a un incidente.
**Auth:** Bearer JWT. Roles: TECHNICIAN, ADMIN.
**Body:**
{
  "description": "string (requerido, min 20 chars)",
  "timeSpentMinutes": "number (requerido, positivo)"
}
**Respuestas:** 201 / 400 / 401 / 404
**Ejemplo:**
curl -X POST .../incidents/UUID/solution \
  -H "Authorization: Bearer TOKEN" \
  -d '{"description": "...", "timeSpentMinutes": 45}'
```

`README.md` — Si cambia algún paso de instalación.
`docs/RUNBOOK.md` — Si hay algún proceso operativo nuevo.

**Reporte obligatorio:**
```markdown
## Docs Report — [Feature]
**Archivos actualizados:** [lista]
**Resultado:** ✅ Completo
```

---

## 🔄 Proceso Obligatorio por Feature

**REGLA ABSOLUTA: No se puede saltar ningún paso. Si un paso falla, se vuelve al anterior.**

```
[1. ARCHITECT] → Diseño + ADR
        ↓ aprobado
[2. DEVELOPER] → Implementación en rama feat/nombre
        ↓ completo
[3. QA ENGINEER] → Tests + Reporte
        ↓ aprobado
[4. SECURITY] → Auditoría + Reporte
        ↓ aprobado
[5. TECH WRITER] → Documentación
        ↓ completo
[PR a main] → Revisión → Merge ✅
```

**Prompt para iniciar cualquier feature:**
> "Siguiendo el proceso completo del equipo, implementá: [descripción]"

---

## 🌿 Flujo de Ramas (Git Workflow)

**REGLA: Todo cambio de código va en una rama separada. Nunca commitear directamente a `main`.**

```bash
# 1. Crear rama para la feature (desde main actualizado)
git checkout main && git pull
git checkout -b feat/nombre-descriptivo

# 2. Desarrollar siguiendo el proceso del equipo...

# 3. Al finalizar los 5 pasos, crear PR
git push -u origin feat/nombre-descriptivo
gh pr create --base main --title "feat: descripción" --body "..."

# 4. Merge solo después de revisión aprobada
```

**Convención de nombres de rama:**
| Tipo | Prefijo | Ejemplo |
|---|---|---|
| Feature nueva | `feat/` | `feat/sucursales-vlans` |
| Bug fix | `fix/` | `fix/login-401-redirect` |
| Refactor | `refactor/` | `refactor/backup-service` |
| Docs | `docs/` | `docs/api-endpoints` |

**Reglas:**
- `main` siempre debe estar en estado deployable
- Nunca hacer `git push --force` a `main`
- Una PR por feature (no acumular features no relacionadas)
- Claude crea la rama, hace los commits y propone la PR — el merge lo aprueba el equipo

---

## ⚙️ Variables de Entorno

`.env.example`:
```env
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/it_knowledge_base

# Autenticación
JWT_SECRET=cambiar-por-secret-seguro-minimo-64-caracteres
JWT_EXPIRES_IN=8h

# App
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

## 📋 Comandos del Proyecto

```bash
# Base de datos (PostgreSQL debe estar corriendo localmente)
npx prisma migrate dev        # Aplicar migraciones
npx prisma studio             # GUI de la base de datos
npx prisma db seed            # Cargar datos iniciales (admin por defecto)

# Backend
npm run dev                   # Servidor en modo watch (puerto 3000)
npm run build                 # Compilar TypeScript
npm run start                 # Producción

# Frontend
cd frontend
npm run dev                   # Dev server (puerto 5173)
npm run build                 # Build producción

# Testing
npm run test                  # Unit tests
npm run test:integration      # Integration tests
npm run test:coverage         # Reporte de cobertura

# Calidad
npm run lint                  # ESLint
npm run typecheck             # TypeScript sin emitir
npm audit                     # Auditoría de dependencias
```

---

## 🌱 Seed Inicial

Al correr `prisma db seed` debe crearse:
- Un técnico ADMIN por defecto: `admin@empresa.com` / `Admin1234!`
- Al menos 2 tags de ejemplo: `red`, `servidor`

El técnico admin debe cambiar su password en el primer login.

---

## 🚫 Prohibiciones Absolutas

1. **Nunca** commitear `.env` con valores reales.
2. **Nunca** usar `any` en TypeScript.
3. **Nunca** mergear a `main` sin los 5 pasos completados.
4. **Nunca** guardar passwords en texto plano.
5. **Nunca** exponer stack trace en respuestas de la API en producción.
6. **Nunca** hacer queries directas a la DB saltando el repositorio.
7. **Nunca** omitir validación de inputs.
8. **Nunca** implementar funcionalidad de IA en esta fase.**

---

## ✅ Definition of Done

Una feature está terminada cuando:
- [ ] Código implementado y funcionando
- [ ] Tests con cobertura ≥ 80%
- [ ] QA Report aprobado
- [ ] Security Report aprobado
- [ ] Documentación actualizada
- [ ] `npm audit` sin High/Critical
- [ ] Mergeado a `main`

---

## 🗺️ Roadmap

| Fase | Estado | Descripción |
|---|---|---|
| MVP v1.0 | 🔄 En curso | CRUD completo: técnicos, clientes, incidentes, soluciones |
| v1.1 | ⏳ Pendiente | Filtros avanzados, búsqueda por texto libre en incidentes |
| v2.0 | ⏳ Pendiente | Integración IA local (Ollama) — chat semántico sobre el historial |

---

*Última actualización: MVP v1.0 — IA en suspenso hasta completar base funcional.*
