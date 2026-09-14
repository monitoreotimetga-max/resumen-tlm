/* parser.js
 * Convierte filas del registro SAT a facturas normalizadas
 * y clasifica concepto / categoría / unidad / cliente.
 */

const REGEX_UNIDAD = /\b(?:TR[-\s]?\d{2,3}|GG[-\s]?\d{3,4}[-\s]?C?|URVAN)\b/i;

const CONCEPTO_RULES = [
  { re: /DESINSTALACION/i,                                        concepto: "DESINSTALACIONES",         categoria: "COSTO VARIABLE" },
  { re: /SERV[-\s]?RENT[-\s]?VID|RENTA\s*VIDEO/i,                 concepto: "RENTA MENSUAL (VIDEO)",    categoria: "COSTO FIJO" },
  { re: /SERV[-\s]?RENT[-\s]?RAS|RENTA\s*RASTREO|SERVICIO\s*RENTA/i, concepto: "RENTA MENSUAL",          categoria: "COSTO FIJO" },
  { re: /GPS\s*DE\s*TELEMETRIA|SERVICIO\s*TELEMETRIA/i,           concepto: "RENTA MENSUAL (TELEMETRIA)", categoria: "COSTO FIJO" },
  { re: /EQUIPO\s*ADAS|CAMARAS\s*ADICIONALES/i,                   concepto: "RENTA ADAS",                categoria: "COSTO FIJO" },
  { re: /EQUIPO\s*SIM\s*\+\s*GPS|EQUIPO\s*GPS\s*TELEMETRIA/i,     concepto: "INSTALACIONES GPS NUEVO",   categoria: "COSTO VARIABLE" },
  { re: /EQUIPO\s*SENSOR|SENSOR\s*MAGNETICO/i,                    concepto: "INSTALACIONES",             categoria: "COSTO VARIABLE" },
  { re: /INSTALACION/i,                                           concepto: "INSTALACIONES",             categoria: "COSTO VARIABLE" }
];

function clasificarConcepto(desc){
  for (const r of CONCEPTO_RULES) if (r.re.test(desc)) return r;
  return { concepto: "SIN CLASIFICAR", categoria: "SIN CLASIFICAR" };
}

function extraerUnidad(desc){
  const m = desc.match(REGEX_UNIDAD);
  return m ? m[0].toUpperCase().replace(/\s+/g,"-").replace("--","-") : "";
}

function toDateOnly(v){
  if (!v) return "";
  if (typeof v === "string" && v.includes("T")) return v.slice(0,10);
  if (typeof v === "string") return v.slice(0,10);
  const d = new Date(v);
  return isNaN(d) ? "" : d.toISOString().slice(0,10);
}

/**
 * Fila cruda -> factura normalizada
 * El objeto "row" debe traer estas llaves (nombres exactos del registro SAT):
 *  Sucursal, Socio, Régimen Emisor, Régimen Receptor, Factura, Descripción,
 *  Importe, Fecha, Captura, Vencimiento, Programación, Recibida, Estatus,
 *  Usuario, UUID, Fecha Val. SAT, Lista Negra
 */
function normalizarFactura(row, catalogo){
  const descripcion = String(row["Descripción"] ?? row["Descripcion"] ?? "").trim();
  const cls = clasificarConcepto(descripcion);
  const unidad = extraerUnidad(descripcion);
  const cat = catalogo[unidad] || {};
  return {
    uuid: row["UUID"] || crypto.randomUUID?.() || String(Math.random()),
    factura: row["Factura"] || "",
    fecha: toDateOnly(row["Fecha"]),
    fecha_val_sat: toDateOnly(row["Fecha Val. SAT"]),
    lista_negra: row["Lista Negra"] || "",
    sucursal: row["Sucursal"] || "",
    razon_social: row["Socio"] || row["Razón Social"] || "MP RASTREO SATELITAL",
    regimen_emisor: row["Régimen Emisor"] || "",
    regimen_receptor: row["Régimen Receptor"] || "",
    descripcion,
    importe: Number(row["Importe"] || 0),
    captura: toDateOnly(row["Captura"]),
    vencimiento: toDateOnly(row["Vencimiento"]),
    programacion: toDateOnly(row["Programación"]),
    recibida: toDateOnly(row["Recibida"]),
    estatus: row["Estatus"] || "",
    usuario: row["Usuario"] || "",
    metodo_pago: row["Método Pago"] || "",
    unidad,
    tipo_unidad: cat.tipo || "",
    cliente: cat.cliente || "",
    concepto: cls.concepto,
    categoria: cls.categoria
  };
}

window.Parser = { normalizarFactura, clasificarConcepto, extraerUnidad };
