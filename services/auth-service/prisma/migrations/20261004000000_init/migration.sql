-- Catálogo de tipos de usuario.
CREATE TABLE "tipo_usuario" (
    "id"          SERIAL PRIMARY KEY,
    "codigo"      VARCHAR(30)  NOT NULL,
    "nombre"      VARCHAR(100) NOT NULL,
    "descripcion" TEXT
);
CREATE UNIQUE INDEX "tipo_usuario_codigo_key" ON "tipo_usuario"("codigo");

CREATE TABLE "usuario" (
    "id"                  SERIAL PRIMARY KEY,
    "tipo_usuario_id"     INTEGER      NOT NULL REFERENCES "tipo_usuario"("id"),
    "email"               VARCHAR(255) NOT NULL,
    "password_hash"       VARCHAR(255) NOT NULL,
    "nombre"              VARCHAR(100) NOT NULL,
    "apellidos"           VARCHAR(100) NOT NULL,
    "email_verificado_en" TIMESTAMPTZ(6),
    "activo"              BOOLEAN      NOT NULL DEFAULT true,
    "creado_en"           TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Email único sin distinguir mayúsculas
CREATE UNIQUE INDEX "ux_usuario_email" ON "usuario"(lower("email"));

-- Solo se guarda el hash SHA-256 del token enviado por correo
CREATE TABLE "token_verificacion" (
    "id"         SERIAL PRIMARY KEY,
    "usuario_id" INTEGER  NOT NULL REFERENCES "usuario"("id") ON DELETE CASCADE,
    "token_hash" CHAR(64) NOT NULL,
    "expira_en"  TIMESTAMPTZ(6) NOT NULL,
    "usado_en"   TIMESTAMPTZ(6)
);
CREATE UNIQUE INDEX "token_verificacion_token_hash_key" ON "token_verificacion"("token_hash");
CREATE INDEX "token_verificacion_usuario_id_idx" ON "token_verificacion"("usuario_id");

CREATE TABLE "refresh_token" (
    "id"          SERIAL PRIMARY KEY,
    "usuario_id"  INTEGER  NOT NULL REFERENCES "usuario"("id") ON DELETE CASCADE,
    "token_hash"  CHAR(64) NOT NULL,
    "expira_en"   TIMESTAMPTZ(6) NOT NULL,
    "revocado_en" TIMESTAMPTZ(6)
);
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");
CREATE INDEX "refresh_token_usuario_id_idx" ON "refresh_token"("usuario_id");

INSERT INTO "tipo_usuario" ("codigo", "nombre", "descripcion")
VALUES ('CLIENTE', 'Cliente', 'Cliente que confirma asistencia a la feria');
