# RUNBOOK — IT Knowledge Base MVP v1.0

## Requisitos previos

- Node.js 20+ y npm
- PostgreSQL 16 corriendo localmente
- Git

## Setup inicial

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd it-knowledge-base
```

### 2. Configurar variables de entorno del backend

```bash
cd backend
cp .env.example .env
```

Editar `.env` con los valores reales:
- `DATABASE_URL`: URL de conexión a PostgreSQL local
- `JWT_SECRET`: string aleatorio de mínimo 64 caracteres
- `JWT_EXPIRES_IN`: `8h` (recomendado)
- `PORT`: `3000` (default)
- `FRONTEND_URL`: `http://localhost:5173` (default)

### 3. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 4. Crear la base de datos en PostgreSQL

```bash
psql -U postgres -c "CREATE DATABASE it_knowledge_base;"
```

O usando psql interactivo:
```sql
CREATE DATABASE it_knowledge_base;
```

### 5. Aplicar el schema con Prisma

```bash
cd backend
npx prisma migrate dev --name init
```

Esto crea todas las tablas definidas en `prisma/schema.prisma`.

### 6. Cargar datos iniciales (seed)

```bash
npx prisma db seed
```

Crea:
- Admin por defecto: `admin@empresa.com` / `Admin1234!`
- Tags: `red`, `servidor`

> ⚠️ Cambiar la password del admin en el primer login.

### 7. Levantar el backend

```bash
npm run dev
```

El servidor queda disponible en `http://localhost:3000`.
Verificar con: `curl http://localhost:3000/health`

### 8. Instalar dependencias del frontend (cuando esté implementado)

```bash
cd frontend
npm install
npm run dev
```

El frontend queda disponible en `http://localhost:5173`.

---

## Comandos frecuentes

| Comando | Descripción |
|---|---|
| `npm run dev` | Backend en modo watch (hot-reload) |
| `npm run build` | Compilar TypeScript para producción |
| `npm run test` | Ejecutar unit tests |
| `npm run test:coverage` | Tests con reporte de cobertura |
| `npm run typecheck` | Verificar tipos sin compilar |
| `npm run lint` | Ejecutar ESLint |
| `npx prisma studio` | GUI web para inspeccionar la BD |
| `npx prisma migrate dev` | Aplicar nueva migración |
| `npx prisma db seed` | Volver a correr el seed |

---

## Estructura del proyecto

```
it-knowledge-base/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Lógica de endpoints
│   │   ├── services/        # Lógica de negocio
│   │   ├── repositories/    # Acceso a BD via Prisma
│   │   ├── middlewares/     # Auth, validación, error handling
│   │   ├── models/          # Tipos e interfaces TypeScript
│   │   ├── routes/          # Definición de rutas Express
│   │   └── utils/           # Helpers (prisma singleton, etc.)
│   ├── tests/
│   │   ├── unit/            # Tests unitarios (Vitest)
│   │   └── integration/     # Tests de integración (Supertest)
│   └── prisma/
│       ├── schema.prisma    # Schema de la base de datos
│       └── seed.ts          # Datos iniciales
├── frontend/                # (implementación pendiente)
└── docs/
    ├── ADR/                 # Architecture Decision Records
    ├── API.md               # Documentación de endpoints
    └── RUNBOOK.md           # Este archivo
```

---

## Solución de problemas

**Error: "Can't reach database server"**
→ Verificar que PostgreSQL esté corriendo: `pg_isready` o `brew services list`

**Error: "JWT_SECRET no configurado"**
→ Asegurarse de que el archivo `.env` existe y tiene la variable `JWT_SECRET` definida

**Error al correr seed: "Unique constraint failed"**
→ El seed usa `upsert`, es seguro correrlo múltiples veces. Si persiste, revisar el estado de la BD con `npx prisma studio`
