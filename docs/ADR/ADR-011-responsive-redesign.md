# ADR-011: Rediseño responsivo — Operations Center

**Fecha:** 2026-06-27
**Estado:** Aceptado

## Contexto

El frontend del MVP v1.0 fue construido exclusivamente para escritorio. No existe soporte para dispositivos móviles ni tablets. El equipo técnico necesita operar desde teléfonos cuando está en campo (revisando NVRs, cámaras, sucursales de clientes).

## Decisión

Reconstruir el sistema de diseño con un enfoque mobile-first, manteniendo el mismo stack (React 18 + TypeScript + Tailwind CSS + shadcn/ui). No se reescribe lógica de negocio, sólo presentación.

### Sistema de tokens

Reemplazar la paleta genérica de shadcn/ui por una paleta "Operations Center":
- **Fondo oscuro** (`#0E0F17`) como superficie base en modo oscuro — justificado por el contexto de uso (sala de servidores, turnos nocturnos, baja fatiga visual).
- **Acento azul perinola** (`#7B9CF5`) — distinguible del azul genérico de shadcn, apropiado para herramientas de infraestructura IT.
- **4 colores de severidad** mapeados a CSS custom properties: `--priority-critical`, `--priority-high`, `--priority-medium`, `--priority-low`.

### Tipografía dual

- **Inter** para UI general (labels, títulos, texto narrativo).
- **JetBrains Mono** para todos los datos técnicos: IPs, IDs de incidente, timestamps, rangos de red, VLANs. Esto hace que el sistema se lea inmediatamente como una herramienta de operaciones, no una app genérica.

### Elemento firma: rail lateral de severidad

Cada card de incidente lleva un rail de 3–4px en el borde izquierdo codificado por prioridad (rojo crítico → ámbar alto → azul medio → verde bajo). Permite leer el estado de la sala al primer vistazo, como un panel NOC.

### Layout responsivo

| Breakpoint | Layout |
|---|---|
| `< md` (< 768px) | Header fijo top + contenido scroll + bottom nav fijo |
| `≥ md` (≥ 768px) | Sidebar fijo lateral (colapsable) + contenido scroll |

La navegación móvil usa un bottom navigation bar (patrón iOS/Android) con 4 items visibles para el usuario autenticado.

## Consecuencias

**Se gana:**
- Operabilidad completa en dispositivos móviles.
- Identidad visual diferenciada y apropiada al dominio (IT ops).
- Legibilidad inmediata de severidad de incidentes.
- Modo oscuro como experiencia primaria con modo claro disponible.

**Se sacrifica:**
- Las páginas que no se actualizan en esta iteración (ClientDetailPage, TechniciansPage) mejorarán automáticamente por el cambio de tokens, pero su estructura de tabs no está optimizada para mobile aún. Se aborda en una iteración posterior.
- JetBrains Mono se carga desde Google Fonts (dependencia de red en el primer render).
