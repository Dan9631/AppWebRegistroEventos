# Decisiones de diseño

Cada decisión indica qué se eligió, por qué y qué alternativas se consideraron.

## 1. Base de datos relacional (PostgreSQL)

**Decisión:** PostgreSQL 16.

**Por qué:** el dominio es pequeño y muy relacional (clientes, confirmaciones, ítems elegidos)
y necesita garantías que una base relacional da por sí sola: unicidad de una confirmación
por cliente y evento, montos exactos con `DECIMAL` y transacciones (confirmación + ítems se
guardan juntos o no se guardan).

**Alternativas:** una base documental no aportaba nada a este modelo y obligaba a reimplementar en código esas restricciones.

## 2. Un esquema por microservicio en una sola instancia

**Decisión:** una instancia de PostgreSQL con los esquemas `auth` y `feria`; cada servicio
solo accede al suyo y `confirmacion.usuario_id` no tiene llave foránea hacia `auth.usuario`.

**Por qué:** respeta la regla de "cada microservicio es dueño de sus datos" sin pagar dos
bases para una demostración. Separarlas después es cambiar una URL de conexión.

**Alternativas:** una base por servicio (más aislamiento, más costo y operación); tablas
compartidas entre servicios (acopla los servicios, descartado).

## 3. La feria se configura con datos (tabla `evento`)

**Decisión:** nombre, año, fechas, horario y teléfono del evento están en la base de datos.

**Por qué:** la feria es anual. Con la tabla, preparar la siguiente edición es insertar y
activar un registro, sin tocar código. Además el backend valida que la visita caiga dentro
de las fechas y del horario del evento activo.

**Alternativas:** fechas en variables de entorno (más simple, pero cada año implica
redesplegar). Se descartó porque el objetivo era gestionar la feria desde la base.

## 4. Servicios y productos en una sola tabla

**Decisión:** tabla `item` con columna `tipo` (`SERVICIO` | `PRODUCTO`).

**Por qué:** el formulario los busca y lista juntos, y comparten los mismos atributos.

**Alternativas:** dos tablas separadas, que duplicaban estructura y complicaban la búsqueda conjunta.

## 5. Reglas de descuento en código y guardadas en la confirmación

**Decisión:**
- Las reglas viven en código: `feria-service` (la versión que decide) y una copia en el
  frontend para mostrar el descuento en vivo.
- El backend recalcula el descuento con los precios de la base de datos y **guarda** el
  precio de cada ítem y el porcentaje otorgado en la confirmación.
- El cálculo se hace en centavos (enteros).

**Por qué:**
- Las reglas son pocas y estables; una tabla de reglas agregaba complejidad sin un panel
  que las administre.
- Guardar el resultado conserva lo que el cliente vio aunque después cambien precios o
  reglas: el portafolio es un compromiso con el cliente.
- Nunca se confía en el precio ni en el porcentaje que envía el navegador.
- En punto flotante, `1499.9 + 0.1` no da exactamente `1500`; en centavos sí, y el límite
  "mayor a Q.1,500" se evalúa correctamente. Lo cubren pruebas unitarias.

**Alternativas:** tabla `regla_descuento` (flexible, pero sobredimensionada aquí); paquete
compartido entre frontend y backend (evita la copia, pero complicaba el build y Docker).
Se aceptó la duplicación por ser un proyecto acotado: si las reglas cambian, se actualizan
ambas copias, y el backend sigue siendo la autoridad.

## 6. Tipos de usuario como catálogo

**Decisión:** tabla `tipo_usuario` (hoy solo `CLIENTE`) y el código del tipo dentro del JWT.

**Por qué:** deja abierta la puerta a otros roles (p. ej. personal de ventas que consulte
los portafolios) sin migraciones: basta un `INSERT` y un middleware `requiereTipo(...)`
en las rutas que correspondan. El registro público siempre crea `CLIENTE`; el tipo nunca se
toma del cuerpo de la petición.

**Alternativas:** un `ENUM` (cada tipo nuevo requiere `ALTER TYPE`) o texto libre (sin integridad).

## 7. Sesión con JWT RS256 y refresh token rotativo

**Decisión:**
- Access token JWT de 15 minutos, firmado con RS256, guardado **solo en memoria**.
- Refresh token aleatorio de 7 días en cookie `httpOnly` (`Secure` en producción), que se
  **rota** en cada uso; reutilizar uno ya rotado cierra todas las sesiones del usuario.

**Por qué:**
- RS256 permite que `feria-service` valide tokens con la llave pública sin llamar a
  `auth-service`, y sin poder emitirlos.
- Un token en memoria no lo puede leer un script inyectado (a diferencia de `localStorage`);
  la cookie `httpOnly` tampoco.
- La rotación limita el daño si un refresh token se filtra.

**Alternativas:** sesiones en servidor (estado compartido entre servicios); JWT de larga
duración en `localStorage` (más simple, más expuesto); HS256 (todos los servicios tendrían
el secreto para firmar).

## 8. Se puede entrar sin confirmar el correo

**Decisión:** el login no exige el correo verificado; el token incluye `emailVerificado` y
`feria-service` rechaza la confirmación de asistencia (`403 EMAIL_NO_VERIFICADO`) si no lo está.

**Por qué:** el cliente puede explorar la feria mientras llega el correo, pero el
portafolio solo se genera para correos reales. La regla está en el backend, no solo en el botón.

**Alternativas:** bloquear el login hasta verificar (más fricción, y dependía de que el
correo llegara); verificación solo informativa (perdía su propósito).

## 9. Correo con Gmail SMTP

**Decisión:** Gmail por SMTP con una contraseña de aplicación; Resend queda como respaldo
configurable.

**Por qué:** Resend sin dominio verificado solo envía al dueño de la cuenta (rechaza incluso
alias con `+`). Gmail envía a cualquier destinatario con un límite de ~500 correos diarios,
suficiente para la demostración. Al arrancar, el servicio comprueba las credenciales y lo
indica en el log.

**Alternativas:** verificar un dominio en Resend o usar Amazon SES (lo indicado con un dominio propio).

## 10. Frontend y APIs en el mismo origen

**Decisión:** nginx (o Vite en desarrollo) reenvía `/auth` y `/feria` a cada servicio.

**Por qué:** sin CORS, con la cookie de sesión funcionando sin configuración especial y con
un frontend que solo usa rutas relativas.

**Alternativas:** cada API en su propio dominio o puerto (CORS con credenciales y cookies `SameSite=None`).

## 11. Día y hora como listas, no como calendario libre

**Decisión:** el cliente elige el día entre los días del evento y la hora en intervalos de
30 minutos dentro del horario.

**Por qué:** un selector de fecha y hora libre permite elegir horas inválidas (p. ej. 3:00).
Con listas es imposible; el backend igual valida fecha y horario (`FUERA_DE_HORARIO`).
Todas las horas se muestran en la zona de Guatemala, sin importar la del navegador.

## 12. Despliegue en una EC2 con Docker Compose y Caddy

**Decisión:** una instancia t3.micro con el mismo Docker Compose de desarrollo más un
archivo de producción; Caddy con HTTPS automático usando un dominio de sslip.io.

**Por qué:** es lo más directo para una demostración: un solo servidor, costo mínimo y el
mismo entorno que en desarrollo. sslip.io da un nombre con certificado válido sin comprar
dominio (Let's Encrypt no emite certificados para los nombres `amazonaws.com` de AWS, y sin
HTTPS la cookie `Secure` no funciona).

**Alternativas:** ECS Fargate + ALB + RDS (lo indicado para producción real; ver
[despliegue](despliegue-ec2.md#cómo-crecería-la-arquitectura)).

## 13. Validación y documentación a partir de un solo esquema

**Decisión:** cada entrada se valida con Zod y la documentación OpenAPI se genera desde
esos mismos esquemas.

**Por qué:** la documentación no se desfasa de la validación real; si cambia una regla, cambia en los dos lados.
