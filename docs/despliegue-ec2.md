# Despliegue en AWS EC2

La plataforma completa corre en una sola instancia EC2 con Docker Compose: el mismo
`docker-compose.yml` de desarrollo más `docker-compose.prod.yml`. Es la opción más simple
para la demostración; en la sección final se describe cómo crecería la arquitectura.

```
                 Internet
                    │  80 / 443
┌───────────────────▼──────────────────── EC2 (Ubuntu 24.04, t3.micro) ┐
│  Caddy  ── HTTPS automático (Let's Encrypt), HTTP → HTTPS             │
│    │                                                                 │
│  nginx (frontend) ── sirve React                                     │
│    ├── /auth/*  → auth-service  ──┐                                  │
│    └── /feria/* → feria-service ──┴──► PostgreSQL (volumen pgdata)    │
└──────────────────────────────────────────────────────────────────────┘
```

Solo Caddy publica puertos. Los servicios y la base de datos no son accesibles desde fuera.

**Dominio sin costo:** [sslip.io](https://sslip.io) resuelve cualquier nombre con la IP dentro;
`3-15-20-40.sslip.io` apunta a `3.15.20.40`. Con eso Caddy puede obtener un certificado
HTTPS real sin comprar un dominio.

---

## 1. Crear la instancia (consola de AWS)

1. **Par de claves** — EC2 → *Key pairs* → *Create key pair*: nombre `disagro`, tipo RSA,
   formato `.pem`. Guarde el archivo; AWS no lo vuelve a mostrar.
2. **Lanzar la instancia** — EC2 → *Launch instance*:
   - Nombre: `disagro-feria`
   - Imagen: **Ubuntu Server 24.04 LTS** (x86_64)
   - Tipo: **t3.micro**
   - Par de claves: `disagro`
   - Red → *Create security group* con estas reglas de entrada:

     | Tipo  | Puerto | Origen      | Para qué                          |
     |-------|--------|-------------|-----------------------------------|
     | SSH   | 22     | **My IP**   | Administrar la instancia          |
     | HTTP  | 80     | 0.0.0.0/0   | Certificado y redirección a HTTPS |
     | HTTPS | 443    | 0.0.0.0/0   | La plataforma                     |

   - Almacenamiento: **16 GB gp3** (8 GB se quedan cortos para las imágenes de Docker).
3. **IP elástica** — EC2 → *Elastic IPs* → *Allocate* → *Associate* con la instancia.
   Así la IP (y por lo tanto el dominio de sslip.io) no cambia si la instancia se reinicia.
   Hágalo **antes** del paso 4.3: el dominio se calcula a partir de la IP.

## 2. Conectarse

La forma más directa es la consola: instancia → *Connect* → *EC2 Instance Connect* → *Connect*.

Por SSH desde Windows (PowerShell), primero restrinja los permisos del archivo `.pem`:

```powershell
icacls disagro.pem /inheritance:r /grant:r "$($env:USERNAME):R"
ssh -i disagro.pem ubuntu@<IP-ELASTICA>
```

## 3. Obtener el código

```bash
git clone https://github.com/Dan9631/AppWebRegistroEventos.git disagro
cd disagro
```

Si el repositorio fuera privado, `git clone` pedirá usuario y, como contraseña, un
*fine-grained token* de GitHub (Settings → Developer settings → Personal access tokens) con
permiso de solo lectura sobre *Contents* del repositorio.

## 4. Instalar y desplegar

```bash
# 4.1 Docker + 2 GB de swap (una sola vez)
bash deploy/instalar-docker.sh

# 4.2 Salir y volver a entrar para usar docker sin sudo
exit
```

Vuelva a conectarse y:

```bash
cd disagro

# 4.3 Genera los .env de producción: dominio sslip.io, contraseña de PostgreSQL,
#     llaves JWT nuevas y credenciales de Gmail (las pide en pantalla)
bash deploy/preparar-env.sh

# 4.4 Compila y levanta todo (la primera vez tarda ~10-15 min en una t3.micro)
bash deploy/desplegar.sh
```

Al terminar muestra la dirección, por ejemplo `https://3-15-20-40.sslip.io`.

## 5. Verificar

| Qué                     | Dónde                                         |
|-------------------------|-----------------------------------------------|
| Plataforma              | `https://<dominio>`                           |
| API de autenticación    | `https://<dominio>/auth/docs`                 |
| API de la feria         | `https://<dominio>/feria/docs`                |

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f auth-service
```

En el log de `auth-service` debe aparecer `Gmail listo para enviar como ...`. En producción
los enlaces de verificación **no** se escriben en el log: llegan solo por correo.

---

## Operación

Para no escribir los dos `-f` cada vez:

```bash
alias dc='docker compose -f docker-compose.yml -f docker-compose.prod.yml'
```

| Tarea                         | Comando                                                            |
|-------------------------------|--------------------------------------------------------------------|
| Publicar cambios de `main`    | `git pull && bash deploy/desplegar.sh`                             |
| Ver logs                      | `dc logs -f --tail 100`                                            |
| Reiniciar un servicio         | `dc restart auth-service`                                          |
| Respaldar la base de datos    | `dc exec -T postgres pg_dump -U disagro disagro > respaldo.sql`    |
| Restaurar un respaldo         | `dc exec -T postgres psql -U disagro -d disagro < respaldo.sql`    |
| Detener todo                  | `dc down` (los datos se conservan en el volumen)                   |

## Costos y limpieza

- La t3.micro y 16 GB de disco entran en la capa gratuita o en los créditos de una cuenta
  nueva; revise *Billing → Free tier* en su cuenta.
- AWS cobra las IPv4 públicas por hora. Una IP elástica **asociada a una instancia detenida**
  sigue cobrando.
- Después de la demostración: *Terminate* la instancia y *Release* la IP elástica.

## Problemas comunes

| Síntoma | Causa probable |
|---|---|
| El navegador no abre `https://...` | Puertos 80/443 cerrados en el security group, o la IP cambió y `DOMINIO` en `.env` quedó desactualizado (corríjalo y ejecute `bash deploy/desplegar.sh`). |
| Error de certificado | Ver `dc logs caddy`. Caddy reintenta solo; si Let's Encrypt falla, prueba con ZeroSSL automáticamente. |
| La compilación se detiene con `Killed` | Falta memoria: compruebe la swap con `swapon --show` (la crea `instalar-docker.sh`). |
| No llegan los correos | `dc logs auth-service`: si dice que Gmail rechazó las credenciales, revise `GMAIL_APP_PASSWORD` en `services/auth-service/.env` y ejecute `dc up -d auth-service`. |

---

## Cómo crecería la arquitectura

Para la demostración basta una instancia. Para producción real, cada pieza tiene un
reemplazo administrado en AWS sin cambiar el código:

| Hoy (EC2)                    | Producción                                                     |
|------------------------------|----------------------------------------------------------------|
| PostgreSQL en un contenedor  | **RDS PostgreSQL** con respaldos automáticos (un esquema por servicio, como ahora) |
| Caddy + nginx                | **Application Load Balancer** con certificado de ACM, enrutando `/auth/*` y `/feria/*` |
| Contenedores en una instancia| **ECS Fargate**, un servicio por microservicio, escalado independiente |
| Frontend en nginx            | **S3 + CloudFront**                                            |
| `.env` en el disco           | **Secrets Manager / Parameter Store**                          |
| Gmail SMTP                   | **Amazon SES** o Resend con dominio verificado                 |
