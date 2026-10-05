CREATE TYPE "tipo_item" AS ENUM ('SERVICIO', 'PRODUCTO');

CREATE TABLE "evento" (
    "id"                SERIAL PRIMARY KEY,
    "nombre"            VARCHAR(150)   NOT NULL,
    "anio"              INTEGER        NOT NULL,
    "fecha_inicio"      TIMESTAMPTZ(6) NOT NULL,
    "fecha_fin"         TIMESTAMPTZ(6) NOT NULL,
    "telefono_atencion" VARCHAR(20),
    "activo"            BOOLEAN        NOT NULL DEFAULT false,
    CONSTRAINT "evento_fechas_check" CHECK ("fecha_fin" > "fecha_inicio")
);
-- Solo un evento activo a la vez
CREATE UNIQUE INDEX "ux_evento_activo" ON "evento"("activo") WHERE "activo";

CREATE TABLE "item" (
    "id"          SERIAL PRIMARY KEY,
    "tipo"        "tipo_item"    NOT NULL,
    "nombre"      VARCHAR(150)   NOT NULL,
    "descripcion" TEXT,
    "precio"      DECIMAL(10, 2) NOT NULL CHECK ("precio" >= 0),
    "activo"      BOOLEAN        NOT NULL DEFAULT true
);
-- Para el buscador del formulario
CREATE INDEX "ix_item_nombre" ON "item"(lower("nombre"));

CREATE TABLE "confirmacion" (
    "id"                    SERIAL PRIMARY KEY,
    "evento_id"             INTEGER        NOT NULL REFERENCES "evento"("id"),
    "usuario_id"            INTEGER        NOT NULL,
    "fecha_hora_asistencia" TIMESTAMPTZ(6) NOT NULL,
    "descuento_servicios"   DECIMAL(5, 2)  NOT NULL DEFAULT 0,
    "descuento_productos"   DECIMAL(5, 2)  NOT NULL DEFAULT 0,
    "creado_en"             TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Un cliente confirma una sola vez por evento
CREATE UNIQUE INDEX "confirmacion_evento_id_usuario_id_key" ON "confirmacion"("evento_id", "usuario_id");

CREATE TABLE "confirmacion_item" (
    "confirmacion_id" INTEGER        NOT NULL REFERENCES "confirmacion"("id") ON DELETE CASCADE,
    "item_id"         INTEGER        NOT NULL REFERENCES "item"("id"),
    "precio_unitario" DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY ("confirmacion_id", "item_id")
);

-- ---------- Datos iniciales ----------

-- Hora de Guatemala (UTC-6)
INSERT INTO "evento" ("nombre", "anio", "fecha_inicio", "fecha_fin", "telefono_atencion", "activo")
VALUES ('Feria de Promociones', 2026, '2026-11-16 08:00:00-06', '2026-11-20 17:00:00-06', '2223-2425', true);

INSERT INTO "item" ("tipo", "nombre", "descripcion", "precio") VALUES
('SERVICIO', 'Análisis de suelo',              'Muestreo y análisis químico de suelo con recomendación de fertilización', 850.00),
('SERVICIO', 'Asesoría agronómica',            'Visita técnica a finca y plan de manejo del cultivo',                     650.00),
('SERVICIO', 'Aplicación con dron',            'Aplicación aérea de agroquímicos por hectárea',                           1200.00),
('SERVICIO', 'Diseño de riego tecnificado',    'Estudio y diseño de sistema de riego por goteo',                          2500.00),
('SERVICIO', 'Capacitación en manejo de plagas','Taller presencial de 4 horas para productores',                          350.00),
('SERVICIO', 'Análisis foliar',                'Diagnóstico nutricional a partir de muestras de hoja',                    100.00),
('SERVICIO', 'Calibración de equipo',          'Revisión y calibración de bombas de aspersión',                           50.30),
('PRODUCTO', 'Fertilizante NPK 15-15-15',      'Saco de 45 kg',                                                           325.00),
('PRODUCTO', 'Urea 46%',                       'Saco de 45 kg',                                                           290.00),
('PRODUCTO', 'Fungicida sistémico',            'Presentación de 1 litro',                                                 185.50),
('PRODUCTO', 'Insecticida de contacto',        'Presentación de 1 litro',                                                 210.00),
('PRODUCTO', 'Semilla de maíz híbrido',        'Bolsa de 20 kg',                                                          950.00),
('PRODUCTO', 'Herbicida selectivo',            'Presentación de 1 litro',                                                 145.75),
('PRODUCTO', 'Bomba de mochila 16 L',          'Aspersora manual con boquilla regulable',                                 480.00),
('PRODUCTO', 'Abono foliar',                   'Presentación de 1 litro',                                                 49.99),
('PRODUCTO', 'Enraizador',                     'Presentación de 500 ml',                                                  80.50);
