# ADR-006: Setup e Inicialización del Frontend
**Fecha:** 2026-06-25
**Estado:** Aceptado

## Contexto
Se necesita inicializar el frontend del sistema IT Knowledge Base. Ya tenemos el backend completo con todos los endpoints. El frontend debe consumir esa API REST con autenticación JWT.

## Decisión

### Stack
- **Vite** — build tool, más rápido que CRA, mejor DX
- **React 18 + TypeScript** — tipado estricto, sin `any`
- **Tailwind CSS v3** — utilidades CSS
- **shadcn/ui** — componentes accesibles sobre Radix UI + Tailwind
- **React Router v6** — navegación SPA
- **TanStack Query v5** — fetching, caching y sincronización de estado del servidor
- **Axios** — cliente HTTP con interceptores para JWT
- **React Hook Form + Zod** — formularios con validación tipada (mismo Zod que el backend)

### Estructura de carpetas
```
frontend/src/
├── components/
│   ├── ui/          # Componentes shadcn/ui (generados)
│   └── layout/      # Shell, Sidebar, Navbar, ThemeToggle
├── pages/           # Una carpeta por módulo
│   ├── auth/        # Login
│   ├── clients/     # Lista, Detalle
│   ├── technicians/ # Lista
│   ├── incidents/   # Lista, Detalle
│   └── dashboard/   # Home post-login
├── hooks/           # useAuth, useTheme, custom query hooks
├── services/        # api.ts (axios instance) + módulos por recurso
├── types/           # Tipos TypeScript — espejo del backend
└── lib/             # utils (cn, formatters)
```

### Autenticación
- JWT almacenado en `localStorage` (suficiente para MVP)
- Axios interceptor agrega `Authorization: Bearer TOKEN` en cada request
- Interceptor de respuesta redirige a /login en 401
- `useAuth` hook expone `technician`, `login`, `logout`, `isAdmin`
- Rutas protegidas con `<ProtectedRoute>` que verifica el token

### Tema dark/light
- `ThemeProvider` con contexto React, persiste en `localStorage`
- Variable CSS `class="dark"` en `<html>` — compatible con shadcn/ui
- `ThemeToggle` en el header del sidebar

### Layout
- `AppShell` — wrapper con sidebar colapsable + área de contenido
- Sidebar colapsable: estado en `localStorage`, transición CSS suave
- En mobile: sidebar como drawer overlay

### Páginas iniciales (este ADR)
Solo el scaffolding base. Las páginas de cada módulo se implementan en ADRs posteriores:
- `/login` — formulario de autenticación
- `/` → redirect a `/dashboard`
- `/dashboard` — placeholder con stats básicas
- 404 page

## Consecuencias
- **Gana:** TanStack Query elimina casi todo el estado manual de loading/error; shadcn/ui acelera el desarrollo de UI consistente
- **Sacrifica:** shadcn/ui requiere instalación componente por componente (no es un import de paquete)
