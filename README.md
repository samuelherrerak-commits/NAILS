# Mariana Nails · Reservas

Landing page **estática y mobile-first** para reservar citas de uñas. La clienta elige servicios, promociones y adicionales, aplica un cupón, escoge fecha y hora libres y asigna **obligatoriamente** su método de pago (en el lugar o Pago Móvil con referencia). Al confirmar, la reserva se guarda en Google Sheets y Google Calendar, y la clienta pasa a WhatsApp con el resumen.

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
4. Ejecuta **`setupDatabase`** y acepta los permisos. Crea las hojas, los encabezados, las claves de configuración y el calendario "Citas Mariana". Si ya tenías las hojas del script anterior, solo agrega las columnas que falten.
5. (Opcional) Ejecuta **`seedDemoData`** para cargar servicios, promociones y el cupón `BIENVENIDA` de ejemplo.
6. Completa la hoja **Configuracion** (tabla más abajo), sobre todo los datos de Pago Móvil.
7. Ejecuta **`probarTasa`** y revisa los registros para confirmar que se obtiene la tasa BCV del euro.
8. Ve a **Implementar → Nueva implementación → Aplicación web**, con *Ejecutar como: Yo* y *Quién tiene acceso: Cualquier persona*. Copia la URL.
9. Cada vez que cambies el código, entra en **Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva versión**. Así la URL no cambia.

### Hojas

| Hoja | Columnas | Notas |
| --- | --- | --- |
| `Servicios` | `ID, Nombre, Precio, Duracion_Min, Tipo` | `Tipo` es `Base` o `Adicional`. `Precio` va en euros. |
| `Promociones` | `ID, Nombre, Servicios_Incluidos, Precio_Promo` | `Servicios_Incluidos` son IDs separados por comas, por ejemplo `S1, S2`. |
| `Cupones` | `Codigo, Descuento_Porcentaje, Descuento_Monto, Usos_Restantes` | Se usa el porcentaje si es mayor que 0; si no, el monto en €. Si `Usos_Restantes` está vacío, el cupón es ilimitado. |
| `Reservaciones` | `ID, Fecha_Solicitud, Cliente, Telefono, Servicios, Total, Fecha_Cita, Hora_Cita, Metodo_Pago, Referencia, Cupon, Estado, Tasa_BCV, Total_Bs` | La llena el script. Las reservas con Pago Móvil entran con estado `Pago por verificar`. |
| `Configuracion` | `Clave, Valor` | Ver la tabla siguiente. |

### Claves de `Configuracion`

| Clave | Ejemplo | Uso |
| --- | --- | --- |
| `nombre_negocio` | `Mariana` | Saludo del mensaje de WhatsApp. |
| `whatsapp` | `584122516390` | Número que recibe las reservas. |
| `hora_apertura` / `hora_cierre` | `09:00` / `19:00` | Horario de atención. |
| `intervalo_min` | `30` | Minutos entre un cupo y el siguiente. |
| `dias_laborales` | `1,2,3,4,5,6` | 0 = domingo … 6 = sábado. |
| `dias_anticipacion` | `21` | Cuántos días hacia adelante se muestran. |
| `anticipacion_min_horas` | `2` | Horas mínimas de aviso para reservar hoy. |
| `pm_banco`, `pm_telefono`, `pm_cedula` | `Banesco (0134)`, `0412-2516390`, `V-12.345.678` | Datos de Pago Móvil que ve la clienta. |
| `tasa_eur_manual` | `412,35` | Solo se usa si no se puede obtener la tasa BCV. |

**Bloquear días u horas:** crea un evento en el calendario "Citas Mariana". Un evento de todo el día bloquea el día completo.

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

**Opción A: Blueprint.** En Render, entra en **New → Blueprint**, elige este repositorio y Render leerá `render.yaml`. Te pedirá `VITE_API_URL`: pega la URL `/exec` del Apps Script.

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
