# ByMariaNails · Reservas

Landing page **estática y mobile-first** para reservar citas de uñas con ByMariaNails. La clienta elige servicios, promociones y adicionales, indica si la cita es **en el spa o a domicilio** (+20 % y 15 min de traslado), aplica un cupón, escoge fecha y hora libres y asigna **obligatoriamente** su método de pago: pago en la cita, o Pago Móvil con **"Copiar todo"**, **"Ya pagué"** y el **capture** del pago. Al confirmar, la reserva se guarda en Google Sheets, Google Calendar y Drive (el capture), y la clienta pasa a WhatsApp con un mensaje ya armado. El mensaje trae un enlace **"Agregar a Google Calendar"** con la cita ya llena, y a domicilio le recuerda **enviar su ubicación por el chat** (no se pide dirección en la página, así no hace falta ninguna API de mapas).

- **Front:** Vite + React + TypeScript + Tailwind CSS v4 + Framer Motion + Sonner.
- **Backend:** Google Apps Script (`apps-script/Code.gs`) sobre Google Sheets y Google Calendar.
- **Precios:** en euros. El monto en bolívares usa la **tasa oficial del euro del BCV**.
- **Hosting:** Render (Static Site). `npm run build` genera `dist/` y no hace falta servidor.

## Desarrollo local

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # pruebas de precios, cupos, WhatsApp y normalización
npm run build      # genera dist/
npm run check:gs   # verifica la sintaxis del Apps Script
```

Si no defines `VITE_API_URL`, la app corre en **modo demo**: usa datos de ejemplo y no envía nada. Para conectarla a tu hoja, copia `.env.example` a `.env` y completa los valores:

| Variable | Descripción |
| --- | --- |
| `VITE_API_URL` | URL de la aplicación web de Apps Script (termina en `/exec`). |
| `VITE_API_TOKEN` | Token que exige el script. Por defecto: `MARIANAILS`. |
| `VITE_WHATSAPP` | Número de respaldo, solo dígitos. Por defecto: `584122516390`. La clave `whatsapp` de la hoja tiene prioridad. |

## Instalar el backend (Google Apps Script)

1. Crea una hoja de cálculo en Google Sheets y abre **Extensiones → Apps Script**.
2. Pega el contenido de `apps-script/Code.gs`.
3. En **Configuración del proyecto (⚙️)**, cambia la **zona horaria** a `America/Caracas`.
4. Ejecuta **`setupDatabase`** y acepta los permisos (Hojas, Calendar y **Drive**, para guardar los captures en la carpeta "Comprobantes ByMariaNails"). Crea las hojas (incluidas **Horarios** y **Bloqueos**), los encabezados, las claves de configuración y el calendario "Citas Mariana". Si ya tenías hojas, no borra nada: solo agrega lo que falte.
5. (Opcional) Ejecuta **`seedDemoData`** para cargar servicios, promociones y el cupón `BIENVENIDA` de ejemplo.
6. Completa la hoja **Configuracion** (tabla más abajo), sobre todo los datos de Pago Móvil.
7. Ejecuta **`diagnostico`** para ver los servicios, promociones y horarios que va a recibir la página, y **`probarTasa`** para confirmar que se obtiene la tasa BCV del euro.
8. Ve a **Implementar → Nueva implementación → Aplicación web**, con *Ejecutar como: Yo* y *Quién tiene acceso: Cualquier persona*. Copia la URL.
9. Cada vez que cambies el código, entra en **Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva versión**. Así la URL no cambia.

### Hojas

| Hoja | Columnas | Notas |
| --- | --- | --- |
| `Servicios` | `ID, Nombre, Precio, Duracion_Min, Tipo` | El `ID` es opcional: si está vacío se genera a partir del nombre. `Tipo` es la categoría con la que se agrupan en la página ("Manos", "Pies"…); escribe `Adicional` para los extras que se suman a un servicio. `Precio` va en euros. |
| `Promociones` | `ID, Nombre, Servicios_Incluidos, Precio_Promo` | `Servicios_Incluidos` acepta IDs o nombres separados por comas, por ejemplo `Manicure, Nivelacion`. |
| `Horarios` | `Dia, Hora_Inicio, Hora_Fin` | Tu horario semanal. Una fila por tramo; puedes repetir el día para una pausa (Lunes 09:00–12:00 y Lunes 14:00–18:00). Deja las horas vacías para cerrar ese día. |
| `Bloqueos` | `Fecha, Hora_Inicio, Hora_Fin, Motivo` | Cierra fechas u horas puntuales (vacaciones, citas por fuera). Sin horas, bloquea el día completo. El motivo no se muestra a las clientas. |
| `Cupones` | `Codigo, Descuento_Porcentaje, Descuento_Monto, Usos_Restantes` | Se usa el porcentaje si es mayor que 0; si no, el monto en €. Si `Usos_Restantes` está vacío, el cupón es ilimitado. |
| `Reservaciones` | `ID, Fecha_Solicitud, Cliente, Telefono, Servicios, Total, Fecha_Cita, Hora_Cita, Metodo_Pago, Referencia, Cupon, Estado, Tasa_BCV, Total_Bs, Modalidad, Direccion, Recargo, Comprobante, Evento_ID` | La llena el script. Toda reserva entra como `Confirmada` y **ya está en el calendario en ese mismo momento** (con el enlace al capture de Pago Móvil en Drive, si aplica) — no espera ninguna verificación manual. El único cambio que hace falta hacer a mano es pasar el Estado a `Cancelada` para liberar el horario. `Referencia` ya no se usa (queda "N/A"). |
| `Configuracion` | `Clave, Valor` | Ver la tabla siguiente. |

### Claves de `Configuracion`

| Clave | Ejemplo | Uso |
| --- | --- | --- |
| `nombre_negocio` | `Mariana` | Saludo del mensaje de WhatsApp. |
| `whatsapp` | `584122516390` | Número que recibe las reservas. |
| `hora_apertura` / `hora_cierre` / `dias_laborales` | `09:00` / `19:00` / `1,2,3,4,5,6` | Solo se usan para crear la pestaña Horarios la primera vez (o si queda vacía). |
| `intervalo_min` | `30` | Minutos entre un cupo y el siguiente. |
| `dias_anticipacion` | `21` | Cuántos días hacia adelante se muestran. |
| `anticipacion_min_horas` | `2` | Horas mínimas de aviso para reservar hoy. |
| `pm_banco`, `pm_telefono`, `pm_cedula` | `Banesco (0134)`, `0412-2516390`, `V-12.345.678` | Datos de Pago Móvil que ve la clienta. |
| `tasa_eur_manual` | `412,35` | Solo se usa si no se puede obtener la tasa BCV. |
| `recargo_domicilio_pct` | `20` | % que se suma a domicilio, sobre el precio de los servicios (antes del cupón). |
| `minutos_extra_domicilio` | `15` | Minutos de traslado que se reservan en la agenda para citas a domicilio. |
| `direccion_spa` | `Urb. …, local 3` | Opcional: texto de la dirección del spa. |
| `direccion_spa_url` | `https://maps.app.goo.gl/MBfSuyGHQrRRcDp17` | Enlace de Google Maps del spa (en la página y en el mensaje). |

**Calendario:** se sigue llamando "Citas Mariana" a propósito. Si se renombrara, el script crearía un calendario nuevo y vacío y dejaría de ver las citas ya guardadas.

**Bloquear días u horas:** agrega una fila en la pestaña **Bloqueos**, o crea un evento en el calendario "Citas Mariana" (un evento de todo el día bloquea el día completo).

### Cancelar una reserva (y liberar su horario)

La disponibilidad que ve la clienta sale del **calendario**, no de la hoja. Por eso, **borrar una fila de `Reservaciones` no libera el horario** — el evento del calendario sigue ahí. Para cancelar de verdad:

1. La primera vez, abre el menú **ByMariaNails → 🔔 Activar cancelaciones automáticas** (arriba, junto a Archivo/Editar/Ver). Te pedirá autorizar — es normal, solo pasa una vez.
2. Para cancelar una reserva, en la hoja `Reservaciones` cambia su columna **Estado** a **"Cancelada"** (hay un menú desplegable). El horario se libera solo en la página, sin que hagas nada más.

Si ya borraste filas de prueba sin cancelarlas primero (sus horarios siguen bloqueados), usa **ByMariaNails → 🧹 Liberar cupos de reservas canceladas/eliminadas**: revisa el calendario y libera los que ya no tengan una reserva activa. Solo toca eventos creados por este sistema — nunca borra algo que hayas puesto tú a mano en el calendario.

El menú **ByMariaNails** también tiene accesos directos a "🔧 Configurar hojas" (`setupDatabase`), "🔍 Diagnóstico" y "💱 Probar tasa BCV", para no tener que entrar al editor de Apps Script.

**Después de cambiar el código del script** entra en **Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva versión → Implementar**. Si en cambio creas una implementación nueva, la URL cambia y hay que actualizarla en `render.yaml`. Los cambios en la hoja (servicios, horarios, bloqueos) se ven al instante, sin volver a implementar.

### Tasa BCV del euro

El script la obtiene en este orden:

1. Caché de 3 horas.
2. Página oficial `bcv.org.ve`.
3. `ve.dolarapi.com` (tasa oficial).
4. Último valor bueno guardado.
5. `tasa_eur_manual`.

El monto en Bs se calcula en el servidor y se guarda en `Total_Bs` junto con la `Tasa_BCV` usada.

### Qué cambió respecto al script original

- Se quitó `.setHeaders()`: ese método no existe en `ContentService` y hacía fallar toda petición autorizada. Apps Script ya envía CORS por su cuenta, y el front manda el POST como `text/plain` para evitar el preflight.
- La lista de **cupones ya no se envía al navegador**. Se validan con `?action=cupon&codigo=…` y otra vez en el POST.
- El **total se recalcula en el servidor** a partir de los IDs de la orden.
- Se agregó un **`LockService`** y se revisa el calendario antes de guardar, para evitar la doble reserva de un mismo cupo.
- El método de pago es obligatorio también en el servidor. Pago Móvil exige referencia.
- `Configuracion` se envía como texto (`getDisplayValues`) y las fechas se interpretan en `America/Caracas`.

> El token `MARIANAILS` viaja dentro del JavaScript público, así que funciona como filtro básico, no como secreto. Por eso las reglas importantes (precios, cupones, cupos) se validan en el servidor.

## Publicar en Render

**Opción A: Blueprint.** En Render, entra en **New → Blueprint**, elige este repositorio y Render leerá `render.yaml`, que ya trae la URL `/exec` del Apps Script en `VITE_API_URL`. Si vuelves a crear la implementación y la URL cambia, actualízala en `render.yaml` o en el panel de Render.

**Opción B: manual.** Entra en **New → Static Site** con esta configuración:

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Environment: `VITE_API_URL=<URL /exec>`. Opcionalmente, `VITE_API_TOKEN` y `VITE_WHATSAPP`.

Las variables `VITE_*` se incrustan al compilar. Si cambias alguna, haz **Manual Deploy → Clear build cache & deploy**.

## Estructura

```
apps-script/        Backend (Code.gs + appsscript.json)
src/lib/            Lógica pura: api, normalize, pricing, slots, whatsapp, format, motion
src/state/order.tsx Estado de la orden (reducer + borrador en sessionStorage)
src/components/     UI: tarjetas, carrito (bottom sheet), cupón, checkout
src/views/          Pantallas: catálogo, agenda, pago, confirmación
```
