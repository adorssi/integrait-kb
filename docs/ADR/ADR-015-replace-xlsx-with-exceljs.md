# ADR-015: Reemplazar xlsx por exceljs
**Fecha:** 2026-06-27
**Estado:** Aceptado

## Contexto
El paquete `xlsx` (SheetJS community edition) tiene dos CVEs sin parche disponible en npm:
- GHSA-4r6h-8v6p-xvw6: Prototype Pollution — se dispara al parsear un archivo malicioso
- GHSA-5pgg-2g8v-p4x9: ReDoS — se dispara al parsear contenido con ciertos patrones

La app acepta archivos .xlsx subidos por técnicos en dos puntos (importación de equipos e importación de cámaras), haciendo que GHSA-4r6h-8v6p-xvw6 y GHSA-5pgg-2g8v-p4x9 sean explotables si se sube un archivo construido con intención maliciosa.

## Decisión
Reemplazar `xlsx` por `exceljs@4.4.0` en backend y frontend. ExcelJS es mantenido activamente, no tiene estos CVEs, y soporta la misma superficie de uso: lectura de .xlsx desde buffer (backend) y generación de .xlsx para descarga (frontend).

## Consecuencias
**Ventajas:**
- Elimina los 2 CVEs de producción (High).
- ExcelJS tiene una API más expresiva y soporte de Promises.

**Compromisos:**
- API diferente a xlsx: se cambia `utils/excel.ts` y `import-controller.ts`.
- Las funciones de exportación en el frontend pasan a ser async (cambio superficial en los callers).
