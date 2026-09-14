# Dashboard GPS — SATECH METGA / TESON

Sitio estático (GitHub Pages) para consulta y presentación de facturas GPS.

## Tabs
1. **Dashboard** – KPIs, gráficos por mes, razón social, concepto, unidad.
2. **Registro** – Listado detallado por factura (con filtros y búsqueda).
3. **Resumen** – Formato tipo presentación: Costos Fijos / Costos Variables por cliente.
4. **Admin** – Subir plantilla Excel/CSV y descargar el JSON mensual.

## Agregar un nuevo mes
1. Ve a `admin.html`.
2. Sube el Excel exportado (columnas del registro SAT).
3. Revisa la vista previa y descarga el `.json`.
4. Coloca el archivo en `data/facturas-AAAA-MM.json`.
5. Agrega la entrada en `data/manifest.json`.
6. Commit + push. GitHub Pages lo publica automáticamente.

## Despliegue en GitHub Pages
- Settings → Pages → Source: `main` / carpeta raíz `/`.
