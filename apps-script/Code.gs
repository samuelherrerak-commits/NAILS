/**
 * Backend de reservas de Mariana Nails (Google Apps Script + Sheets + Calendar).
 *
 * Instalación:
 *   1. Abre la hoja de cálculo > Extensiones > Apps Script y pega este archivo.
 *   2. Configuración del proyecto (⚙️) > Zona horaria: America/Caracas
 *      (o copia apps-script/appsscript.json en el editor).
 *   3. Ejecuta `setupDatabase` una vez (pide permisos). Opcional: `seedDemoData`.
 *   4. Llena "Configuracion" (datos de Pago Móvil) y "Horarios" (tu horario semanal).
 *      En "Bloqueos" cierras fechas u horas puntuales (vacaciones, citas por fuera).
 *      Ejecuta `diagnostico` para ver qué está leyendo el sistema.
 *   5. Ejecuta `probarTasa` para comprobar que la tasa BCV del euro se obtiene bien.
 *   6. Implementar > Nueva implementación > Aplicación web
 *      Ejecutar como: Yo · Quién tiene acceso: Cualquier persona.
 *      Copia la URL (termina en /exec) y úsala como VITE_API_URL en Render.
 *   Cada vez que cambies este código: Implementar > Gestionar implementaciones >
 *   editar > Nueva versión (la URL se mantiene).
 */

const TOKEN = 'MARIANAILS';
const CALENDAR_NAME = 'Citas Mariana';
const ZONA = 'America/Caracas';
const METODOS_PAGO = ['Pago en el lugar', 'Bolívares (Pago Móvil)'];

const SHEETS = [
  {
    name: 'Reservaciones',
    headers: ['ID', 'Fecha_Solicitud', 'Cliente', 'Telefono', 'Servicios', 'Total', 'Fecha_Cita', 'Hora_Cita',
      'Metodo_Pago', 'Referencia', 'Cupon', 'Estado', 'Tasa_BCV', 'Total_Bs'],
  },
  { name: 'Servicios', headers: ['ID', 'Nombre', 'Precio', 'Duracion_Min', 'Tipo'] },
  { name: 'Promociones', headers: ['ID', 'Nombre', 'Servicios_Incluidos', 'Precio_Promo'] },
  { name: 'Cupones', headers: ['Codigo', 'Descuento_Porcentaje', 'Descuento_Monto', 'Usos_Restantes'] },
  { name: 'Configuracion', headers: ['Clave', 'Valor'] },
  { name: 'Horarios', headers: ['Dia', 'Hora_Inicio', 'Hora_Fin'] },
  { name: 'Bloqueos', headers: ['Fecha', 'Hora_Inicio', 'Hora_Fin', 'Motivo'] },
];

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Claves que lee la landing. Los valores vacíos se completan en la hoja.
const CONFIG_DEFAULTS = [
  ['nombre_negocio', 'Mariana'],
  ['whatsapp', '584122516390'],
  ['hora_apertura', '09:00'],
  ['hora_cierre', '19:00'],
  ['intervalo_min', '30'],
  ['dias_laborales', '1,2,3,4,5,6'], // 0 = domingo … 6 = sábado
  ['dias_anticipacion', '21'],
  ['anticipacion_min_horas', '2'],
  ['zona_horaria', ZONA],
  ['pm_banco', ''], // ej. "Banesco (0134)"
  ['pm_telefono', ''], // ej. "0412-2516390"
  ['pm_cedula', ''], // ej. "V-12.345.678"
  ['tasa_eur_manual', ''], // solo se usa si la tasa BCV no se puede obtener
];

// ============================================================================
// 1. Configuración inicial de la base de datos
// ============================================================================

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  SHEETS.forEach(function (s) {
    let sheet = ss.getSheetByName(s.name);
    if (!sheet) {
      sheet = ss.insertSheet(s.name);
      sheet.appendRow(s.headers);
    } else {
      // Hojas creadas con la versión anterior: agrega las columnas que falten.
      const lastCol = Math.max(sheet.getLastColumn(), 1);
      const current = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
      s.headers.forEach(function (h) {
        if (current.indexOf(h) === -1) {
          sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h);
        }
      });
    }
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold').setBackground('#E5B8C1');
    sheet.setFrozenRows(1);
  });

  // Configuracion en texto plano para que "09:00" no se convierta en fecha.
  const config = ss.getSheetByName('Configuracion');
  config.getRange('A:B').setNumberFormat('@');
  const existentes = getConfig_(ss);
  CONFIG_DEFAULTS.forEach(function (kv) {
    if (!(kv[0] in existentes)) config.appendRow(kv);
  });

  // Horarios: texto plano y, si está vacía, se siembra con el horario de Configuracion.
  const horarios = ss.getSheetByName('Horarios');
  horarios.getRange('A:C').setNumberFormat('@');
  if (horarios.getLastRow() < 2) {
    const cfg = getConfig_(ss);
    const dias = String(cfg.dias_laborales || '1,2,3,4,5,6').split(/[,;\s]+/).map(Number);
    const rows = [1, 2, 3, 4, 5, 6, 0].map(function (d) {
      return dias.indexOf(d) === -1
        ? [DIAS_SEMANA[d], '', '']
        : [DIAS_SEMANA[d], cfg.hora_apertura || '09:00', cfg.hora_cierre || '19:00'];
    });
    horarios.getRange(2, 1, rows.length, 3).setValues(rows);
  }
  ss.getSheetByName('Bloqueos').getRange('B:C').setNumberFormat('@');

  getCalendar_();
}

/** Opcional: carga servicios, promociones y un cupón de ejemplo si las hojas están vacías. */
function seedDemoData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const fill = function (name, rows) {
    const sheet = ss.getSheetByName(name);
    if (sheet.getLastRow() > 1) return;
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  };
  fill('Servicios', [
    ['S1', 'Manicure semipermanente', 12, 60, 'Base'],
    ['S2', 'Pedicure semipermanente', 15, 60, 'Base'],
    ['S3', 'Uñas acrílicas · set completo', 25, 120, 'Base'],
    ['S4', 'Polygel natural', 22, 90, 'Base'],
    ['A1', 'Nail art a mano (2 uñas)', 3, 15, 'Adicional'],
    ['A2', 'Francés o baby boomer', 4, 15, 'Adicional'],
    ['A3', 'Retiro de producto', 3, 20, 'Adicional'],
  ]);
  fill('Promociones', [
    ['P1', 'Mani + Pedi', 'S1, S2', 24],
    ['P2', 'Acrílicas con arte', 'S3, A1', 25],
  ]);
  fill('Cupones', [['BIENVENIDA', 10, 0, 50]]);
}

// ============================================================================
// 2. GET: catálogo, configuración, tasa y ocupación (o validación de cupón)
// ============================================================================

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.token !== TOKEN) return json_({ error: 'no_autorizado' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (p.action === 'cupon') {
      const cupon = buscarCupon_(ss, p.codigo);
      if (!cupon) return json_({ valido: false, mensaje: 'Este cupón no existe o ya se agotó.' });
      return json_({ valido: true, codigo: cupon.codigo, porcentaje: cupon.porcentaje, monto: cupon.monto });
    }

    const config = getConfig_(ss);
    const dias = Number(config.dias_anticipacion) || 21;
    const servicios = getServicios_(ss);
    return json_({
      servicios: servicios,
      promociones: getPromociones_(ss, servicios),
      config: config, // la lista de cupones NO se envía al navegador
      horarios: getHorarios_(ss, config),
      tasa: getTasaEuroBCV(),
      // Citas del calendario + bloqueos de la hoja, solo como rangos (sin nombres ni motivos).
      citasAgendadas: getOcupacionCalendario_(dias).concat(getBloqueos_(ss, dias).map(function (b) {
        return { inicio: b.inicio.toISOString(), fin: b.fin.toISOString() };
      })),
    });
  } catch (err) {
    console.error(err);
    return json_({ error: 'servidor', mensaje: 'Error del servidor. Intenta de nuevo.' });
  }
}

// ============================================================================
// 3. POST: registrar la reservación
// ============================================================================

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ error: 'datos_invalidos', mensaje: 'Solicitud inválida.' });
  }
  if (data.token !== TOKEN) return json_({ error: 'no_autorizado' });

  // Un solo POST a la vez: evita que dos personas tomen el mismo cupo.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) {
    return json_({ error: 'servidor', mensaje: 'Hay mucha demanda en este momento. Intenta de nuevo.' });
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // --- Validación de datos ---
    const cliente = String(data.cliente || '').trim();
    const telefono = String(data.telefono || '').trim();
    const fechaCita = String(data.fechaCita || '');
    const horaCita = String(data.horaCita || '');
    const metodoPago = String(data.metodoPago || '');
    const referencia = String(data.referencia || '').replace(/\D/g, '');
    const esPagoMovil = metodoPago === METODOS_PAGO[1];

    if (cliente.length < 2 || telefono.replace(/\D/g, '').length < 10 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fechaCita) || !/^\d{2}:\d{2}$/.test(horaCita)) {
      return json_({ error: 'datos_invalidos', mensaje: 'Revisa tus datos e intenta de nuevo.' });
    }
    // Asignación obligatoria del método de pago.
    if (METODOS_PAGO.indexOf(metodoPago) === -1) {
      return json_({ error: 'datos_invalidos', mensaje: 'Selecciona un método de pago.' });
    }
    if (esPagoMovil && !/^\d{4,20}$/.test(referencia)) {
      return json_({ error: 'datos_invalidos', mensaje: 'Falta el número de referencia del Pago Móvil.' });
    }

    // --- El total se recalcula aquí; no se confía en el que manda el navegador ---
    const orden = calcularOrden_(ss, data.items, data.cupon);
    if (orden.lineas.length === 0 || !orden.hasBase) {
      return json_({ error: 'datos_invalidos', mensaje: 'Tu orden necesita al menos un servicio base.' });
    }
    if (data.cupon && !orden.cupon) {
      return json_({ error: 'cupon_invalido', mensaje: 'El cupón ya no es válido.' });
    }

    // --- Disponibilidad ---
    const inicio = Utilities.parseDate(fechaCita + ' ' + horaCita, ZONA, 'yyyy-MM-dd HH:mm');
    const fin = new Date(inicio.getTime() + orden.duracion * 60000);
    if (inicio.getTime() < Date.now()) {
      return json_({ error: 'cupo_ocupado', mensaje: 'Ese horario ya pasó.' });
    }
    // Debe caber completo dentro de un tramo del horario de ese día.
    const minInicio = toMinutes_(horaCita);
    const minFin = minInicio + orden.duracion;
    const diaSemana = Number(Utilities.formatDate(inicio, ZONA, 'u')) % 7; // 1 = lunes … 7 = domingo
    const tramos = getHorarios_(ss, getConfig_(ss)).filter(function (t) { return t.dia === diaSemana; });
    const dentro = tramos.some(function (t) {
      return minInicio >= toMinutes_(t.inicio) && minFin <= toMinutes_(t.fin);
    });
    if (!dentro) {
      return json_({ error: 'cupo_ocupado', mensaje: 'Ese horario está fuera de nuestro horario de atención.' });
    }
    const bloqueado = getBloqueos_(ss, 400).some(function (b) { return b.inicio < fin && b.fin > inicio; });
    if (bloqueado) {
      return json_({ error: 'cupo_ocupado', mensaje: 'Ese horario no está disponible.' });
    }

    const calendar = getCalendar_();
    const choques = calendar.getEvents(new Date(inicio.getTime() - 86400000), new Date(fin.getTime() + 86400000))
      .filter(function (ev) { return ev.getStartTime() < fin && ev.getEndTime() > inicio; });
    if (choques.length > 0) {
      return json_({ error: 'cupo_ocupado', mensaje: 'Ese horario acaba de ocuparse.' });
    }

    // --- Tasa BCV y monto en bolívares ---
    const tasa = getTasaEuroBCV();
    const totalBs = tasa ? round2_(orden.total * tasa.valor) : null;

    // --- Guardar en la hoja (por nombre de columna) ---
    const id = Utilities.getUuid();
    const serviciosTexto = orden.lineas.map(function (l) { return l.nombre; }).join(', ');
    appendByHeaders_(ss.getSheetByName('Reservaciones'), {
      ID: id,
      Fecha_Solicitud: new Date(),
      Cliente: cliente,
      Telefono: telefono,
      Servicios: serviciosTexto,
      Total: orden.total,
      Fecha_Cita: fechaCita,
      Hora_Cita: horaCita,
      Metodo_Pago: metodoPago,
      Referencia: esPagoMovil ? referencia : 'N/A',
      Cupon: orden.cupon ? orden.cupon.codigo : 'N/A',
      Estado: esPagoMovil ? 'Pago por verificar' : 'Confirmada',
      Tasa_BCV: tasa ? tasa.valor : '',
      Total_Bs: totalBs === null ? '' : totalBs,
    });

    if (orden.cupon) descontarCupon_(ss, orden.cupon);

    calendar.createEvent('Cita: ' + cliente + ' - ' + serviciosTexto, inicio, fin, {
      description: [
        'Teléfono: ' + telefono,
        'Total: ' + orden.total.toFixed(2) + ' €' + (totalBs !== null ? ' (Bs. ' + totalBs.toFixed(2) + ')' : ''),
        'Pago: ' + metodoPago,
        'Ref: ' + (esPagoMovil ? referencia : 'N/A'),
        'Cupón: ' + (orden.cupon ? orden.cupon.codigo : 'N/A'),
        'ID: ' + id,
      ].join('\n'),
    });

    return json_({ success: true, id: id, total: orden.total, totalBs: totalBs, tasa: tasa ? tasa.valor : null });
  } catch (err) {
    console.error(err);
    return json_({ error: 'servidor', mensaje: 'No se pudo guardar la reserva. Intenta de nuevo.' });
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// 4. Tasa oficial del euro (BCV)
// ============================================================================

/**
 * Bolívares por euro según el BCV: { valor, fecha, fuente } o null.
 * Orden: caché (3 h) → bcv.org.ve → DolarApi (oficial) → último valor bueno → tasa_eur_manual.
 */
function getTasaEuroBCV() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('tasa_eur');
  if (cached) return JSON.parse(cached);

  const props = PropertiesService.getScriptProperties();
  const tasa = tasaDesdeBCV_() || tasaDesdeDolarApi_();
  if (tasa) {
    props.setProperty('tasa_eur_ultima', JSON.stringify(tasa));
    cache.put('tasa_eur', JSON.stringify(tasa), 3 * 60 * 60);
    return tasa;
  }

  const ultima = props.getProperty('tasa_eur_ultima');
  if (ultima) {
    const t = JSON.parse(ultima);
    t.fuente += ' (último valor conocido)';
    cache.put('tasa_eur', JSON.stringify(t), 15 * 60);
    return t;
  }

  const manual = toNumber_(getConfig_(SpreadsheetApp.getActiveSpreadsheet()).tasa_eur_manual);
  return manual > 0 ? { valor: round2_(manual), fecha: null, fuente: 'Manual' } : null;
}

function tasaDesdeBCV_() {
  try {
    const res = UrlFetchApp.fetch('https://www.bcv.org.ve/', {
      muteHttpExceptions: true,
      validateHttpsCertificates: false, // el certificado del BCV suele fallar la validación
      followRedirects: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarianaNails/1.0)' },
    });
    if (res.getResponseCode() !== 200) return null;
    const html = res.getContentText();
    const m = html.match(/id=["']euro["'][\s\S]*?<strong>\s*([\d.,]+)\s*<\/strong>/i);
    if (!m) return null;
    const valor = toNumber_(m[1]);
    const f = html.match(/date-display-single[^>]*content=["']([^"']+)["']/i);
    return valor > 0 ? { valor: round2_(valor), fecha: f ? f[1] : null, fuente: 'BCV' } : null;
  } catch (err) {
    console.warn('BCV: ' + err);
    return null;
  }
}

function tasaDesdeDolarApi_() {
  try {
    const res = UrlFetchApp.fetch('https://ve.dolarapi.com/v1/euros/oficial', { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;
    const d = JSON.parse(res.getContentText());
    const valor = toNumber_(d.promedio || d.venta || d.compra);
    return valor > 0 ? { valor: round2_(valor), fecha: d.fechaActualizacion || null, fuente: 'BCV (vía DolarApi)' } : null;
  } catch (err) {
    console.warn('DolarApi: ' + err);
    return null;
  }
}

/** Ejecútala desde el editor para ver qué tasa se obtiene (Ver > Registros). */
function probarTasa() {
  CacheService.getScriptCache().remove('tasa_eur');
  console.log('bcv.org.ve  → ' + JSON.stringify(tasaDesdeBCV_()));
  console.log('DolarApi    → ' + JSON.stringify(tasaDesdeDolarApi_()));
  console.log('Resultado   → ' + JSON.stringify(getTasaEuroBCV()));
}

// ============================================================================
// Auxiliares
// ============================================================================

function json_(obj) {
  // Apps Script agrega Access-Control-Allow-Origin: * por su cuenta.
  // (TextOutput no tiene setHeaders: llamarlo rompía la versión anterior.)
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getSheetData_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data.shift().map(String);
  return data
    .filter(function (row) { return row.some(function (c) { return c !== ''; }); })
    .map(function (row) {
      const obj = {};
      headers.forEach(function (h, i) { obj[h] = row[i]; });
      return obj;
    });
}

/** Configuracion como { clave: 'valor en texto' } (getDisplayValues evita fechas raras). */
function getConfig_(ss) {
  const sheet = ss.getSheetByName('Configuracion');
  const out = {};
  if (!sheet || sheet.getLastRow() < 2) return out;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues().forEach(function (r) {
    const k = String(r[0]).trim().toLowerCase();
    if (k) out[k] = String(r[1]).trim();
  });
  return out;
}

function getCalendar_() {
  const found = CalendarApp.getCalendarsByName(CALENDAR_NAME);
  return found.length ? found[0] : CalendarApp.createCalendar(CALENDAR_NAME, { timeZone: ZONA });
}

/** Solo inicio y fin de cada evento: nunca se exponen nombres ni teléfonos. */
function getOcupacionCalendario_(dias) {
  const desde = new Date();
  const hasta = new Date(desde.getTime() + (dias + 1) * 86400000);
  return getCalendar_().getEvents(desde, hasta).map(function (ev) {
    return { inicio: ev.getStartTime().toISOString(), fin: ev.getEndTime().toISOString() };
  });
}

/** Misma lógica de precios que src/lib/pricing.ts. */
function calcularOrden_(ss, items, codigoCupon) {
  items = items || {};
  const servicios = getServicios_(ss);
  const promos = getPromociones_(ss, servicios);
  const byId = {};
  servicios.forEach(function (s) { byId[s.ID] = s; });
  const unique = function (list) {
    return (Array.isArray(list) ? list : []).map(String).filter(function (x, i, a) { return a.indexOf(x) === i; });
  };

  const lineas = [];
  unique(items.promos).forEach(function (id) {
    const p = promos.filter(function (x) { return x.ID === id; })[0];
    if (!p) return;
    lineas.push({
      nombre: String(p.Nombre),
      precio: toNumber_(p.Precio_Promo),
      duracion: p.Servicios_Incluidos.reduce(function (sum, sid) {
        return sum + (toNumber_(byId[sid].Duracion_Min) || 60);
      }, 0),
      base: true,
    });
  });
  unique(items.servicios).forEach(function (id) {
    const s = byId[id];
    if (!s) return;
    lineas.push({
      nombre: String(s.Nombre),
      precio: toNumber_(s.Precio),
      duracion: toNumber_(s.Duracion_Min) || 60,
      base: !/adic|extra/i.test(String(s.Tipo)),
    });
  });

  const subtotal = round2_(lineas.reduce(function (sum, l) { return sum + l.precio; }, 0));
  const cupon = codigoCupon ? buscarCupon_(ss, codigoCupon) : null;
  let descuento = 0;
  if (cupon && subtotal > 0) {
    const raw = cupon.porcentaje > 0 ? subtotal * cupon.porcentaje / 100 : cupon.monto;
    descuento = round2_(Math.min(subtotal, Math.max(0, raw)));
  }
  return {
    lineas: lineas,
    hasBase: lineas.some(function (l) { return l.base; }),
    subtotal: subtotal,
    descuento: descuento,
    total: round2_(subtotal - descuento),
    duracion: Math.max(15, lineas.reduce(function (sum, l) { return sum + l.duracion; }, 0)),
    cupon: cupon,
  };
}

// ---------- Catálogo tolerante (misma lógica que src/lib/normalize.ts) ----------

/** "Duración (min)" → "duracionmin" */
function normKey_(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** "Nivelación Gel" → "nivelacion-gel" (igual que slug() del front). */
function slug_(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

/** Valor de una columna aceptando variantes del encabezado. */
function pick_(row, names) {
  const wanted = names.map(normKey_);
  for (const k in row) if (wanted.indexOf(normKey_(k)) !== -1) return row[k];
  return '';
}

/** Rellena IDs vacíos con el nombre en slug (con sufijo -2, -3 si se repite). */
function assignIds_(items) {
  const used = {};
  items.forEach(function (it) {
    let id = String(it.ID || '').trim() || slug_(it.Nombre);
    if (used[id]) {
      let n = 2;
      while (used[id + '-' + n]) n++;
      id = id + '-' + n;
    }
    used[id] = true;
    it.ID = id;
  });
  return items;
}

function getServicios_(ss) {
  const rows = getSheetData_(ss, 'Servicios').map(function (r) {
    return {
      ID: String(pick_(r, ['ID'])).trim(),
      Nombre: String(pick_(r, ['Nombre', 'Servicio'])).trim(),
      Precio: toNumber_(pick_(r, ['Precio'])),
      Duracion_Min: toNumber_(pick_(r, ['Duracion_Min', 'Duracion', 'DuracionMin', 'Minutos'])) || 60,
      Tipo: String(pick_(r, ['Tipo', 'Categoria'])).trim(),
    };
  }).filter(function (s) { return s.Nombre; });
  return assignIds_(rows);
}

/** Promociones con Servicios_Incluidos resuelto a IDs (acepta IDs o nombres). */
function getPromociones_(ss, servicios) {
  const find = function (ref) {
    const key = normKey_(ref);
    const s = servicios.filter(function (x) { return normKey_(x.ID) === key; })[0] ||
      servicios.filter(function (x) { return normKey_(x.Nombre) === key; })[0];
    return s ? s.ID : null;
  };
  const rows = getSheetData_(ss, 'Promociones').map(function (r) {
    return {
      ID: String(pick_(r, ['ID'])).trim(),
      Nombre: String(pick_(r, ['Nombre', 'Promocion'])).trim(),
      Servicios_Incluidos: String(pick_(r, ['Servicios_Incluidos', 'Servicios'])).split(/[,;|+]/)
        .map(function (x) { return x.trim(); }).filter(Boolean).map(find).filter(Boolean),
      Precio_Promo: toNumber_(pick_(r, ['Precio_Promo', 'Precio'])),
    };
  }).filter(function (p) { return p.Nombre && p.Servicios_Incluidos.length > 0; });
  return assignIds_(rows);
}

// ---------- Horario semanal y bloqueos ----------

function parseDia_(value) {
  const s = normKey_(value);
  if (/^[0-6]$/.test(s)) return Number(s);
  if (s === '7') return 0;
  const map = { domingo: 0, dom: 0, lunes: 1, lun: 1, martes: 2, mar: 2, miercoles: 3, mie: 3,
    jueves: 4, jue: 4, viernes: 5, vie: 5, sabado: 6, sab: 6 };
  return s in map ? map[s] : null;
}

/** "9:00" → 540; NaN si no es una hora. */
function toMinutes_(value) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value).trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

function hhmm_(min) {
  return ('0' + Math.floor(min / 60)).slice(-2) + ':' + ('0' + (min % 60)).slice(-2);
}

/**
 * Tramos de atención [{dia: 0-6, inicio: 'HH:MM', fin: 'HH:MM'}].
 * Sin pestaña Horarios (o vacía) se usan hora_apertura/hora_cierre/dias_laborales.
 */
function getHorarios_(ss, config) {
  const out = [];
  const sheet = ss.getSheetByName('Horarios');
  if (sheet && sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getDisplayValues().forEach(function (r) {
      const dia = parseDia_(r[0]);
      const a = toMinutes_(r[1]);
      const b = toMinutes_(r[2]);
      if (dia === null || isNaN(a) || isNaN(b) || b <= a) return;
      out.push({ dia: dia, inicio: hhmm_(a), fin: hhmm_(b) });
    });
    if (out.length) return out.sort(function (x, y) { return (x.dia + 6) % 7 - (y.dia + 6) % 7 || (x.inicio < y.inicio ? -1 : 1); });
  }
  const a = toMinutes_(config.hora_apertura || '09:00');
  const b = toMinutes_(config.hora_cierre || '19:00');
  String(config.dias_laborales || '1,2,3,4,5,6').split(/[,;\s]+/).map(parseDia_).forEach(function (d) {
    if (d !== null && !isNaN(a) && !isNaN(b) && b > a) out.push({ dia: d, inicio: hhmm_(a), fin: hhmm_(b) });
  });
  return out;
}

/** Fecha de la hoja (Date o texto "YYYY-MM-DD" / "DD/MM/YYYY") → "YYYY-MM-DD". */
function ymd_(value) {
  if (value && typeof value.getTime === 'function' && !isNaN(value.getTime())) return Utilities.formatDate(value, ZONA, 'yyyy-MM-dd');
  const s = String(value).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return null;
}

/** Bloqueos vigentes como rangos {inicio: Date, fin: Date}. Sin horas = día completo. */
function getBloqueos_(ss, dias) {
  const sheet = ss.getSheetByName('Bloqueos');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const n = sheet.getLastRow() - 1;
  const fechas = sheet.getRange(2, 1, n, 1).getValues();
  const horas = sheet.getRange(2, 2, n, 2).getDisplayValues();
  const desde = Date.now() - 86400000;
  const hasta = Date.now() + (dias + 1) * 86400000;
  const out = [];
  for (let i = 0; i < n; i++) {
    const fecha = ymd_(fechas[i][0]);
    if (!fecha) continue;
    const a = toMinutes_(horas[i][0]);
    const b = toMinutes_(horas[i][1]);
    const ini = isNaN(a) ? '00:00' : hhmm_(a);
    const inicio = Utilities.parseDate(fecha + ' ' + ini, ZONA, 'yyyy-MM-dd HH:mm');
    const fin = isNaN(b) || (!isNaN(a) && b <= a)
      ? new Date(Utilities.parseDate(fecha + ' 00:00', ZONA, 'yyyy-MM-dd HH:mm').getTime() + 86400000)
      : Utilities.parseDate(fecha + ' ' + hhmm_(b), ZONA, 'yyyy-MM-dd HH:mm');
    if (fin.getTime() < desde || inicio.getTime() > hasta) continue;
    out.push({ inicio: inicio, fin: fin });
  }
  return out;
}

/** Ejecútala desde el editor: muestra lo que la landing va a recibir. */
function diagnostico() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const config = getConfig_(ss);
  const crudos = getSheetData_(ss, 'Servicios');
  const servicios = getServicios_(ss);
  console.log('Servicios: ' + servicios.length + ' de ' + crudos.length + ' filas (sin Nombre se ignoran)');
  servicios.forEach(function (s) {
    console.log('  · ' + s.ID + ' | ' + s.Nombre + ' | ' + s.Precio + ' € | ' + s.Duracion_Min + ' min | ' + (s.Tipo || 'Servicios'));
  });
  const promos = getPromociones_(ss, servicios);
  console.log('Promociones válidas: ' + promos.length + ' de ' + getSheetData_(ss, 'Promociones').length +
    ' (se ignoran las que no encuentran sus servicios)');
  console.log('Horario:');
  getHorarios_(ss, config).forEach(function (t) { console.log('  · ' + DIAS_SEMANA[t.dia] + ' ' + t.inicio + '–' + t.fin); });
  console.log('Bloqueos próximos: ' + getBloqueos_(ss, 60).length);
  ['pm_banco', 'pm_telefono', 'pm_cedula'].forEach(function (k) {
    if (!config[k]) console.warn('Falta "' + k + '" en Configuracion (datos de Pago Móvil).');
  });
}

/** Cupón válido (sin distinguir mayúsculas) o null. Usos_Restantes vacío = ilimitado. */
function buscarCupon_(ss, codigo) {
  const code = String(codigo || '').trim().toUpperCase();
  if (!code) return null;
  const sheet = ss.getSheetByName('Cupones');
  if (!sheet || sheet.getLastRow() < 2) return null;
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() !== code) continue;
    const usos = data[i][3];
    if (usos !== '' && toNumber_(usos) <= 0) return null;
    return {
      fila: i + 2,
      codigo: String(data[i][0]).trim().toUpperCase(),
      porcentaje: toNumber_(data[i][1]),
      monto: toNumber_(data[i][2]),
      usos: usos,
    };
  }
  return null;
}

function descontarCupon_(ss, cupon) {
  if (cupon.usos === '') return; // ilimitado
  ss.getSheetByName('Cupones').getRange(cupon.fila, 4).setValue(Math.max(0, toNumber_(cupon.usos) - 1));
}

function appendByHeaders_(sheet, record) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  sheet.appendRow(headers.map(function (h) { return h in record ? record[h] : ''; }));
}

/** Acepta 12, "12,5", "1.234,56" o "1,234.56". */
function toNumber_(value) {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  let s = String(value || '').replace(/[^\d.,-]/g, '');
  if (s.indexOf(',') !== -1 && s.indexOf('.') !== -1) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.indexOf(',') !== -1) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

function round2_(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
