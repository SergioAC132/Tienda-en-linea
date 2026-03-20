-- ============================================================
--  TINTIN LUXURY — Script de creación de base de datos
--  Sistema de Gestión de Ventas
--  Análisis y Diseño de Software · 6°B · UCC
--  Base de datos: PostgreSQL (Supabase)
--  Generado: 2026-03-20
-- ============================================================

-- ─────────────────────────────────────────────────────────────
--  TIPOS ENUM personalizados
--  En PostgreSQL los ENUM se declaran antes de usarse.
--  Si necesitas volver a correr el script, elimínalos primero:
--    DROP TYPE IF EXISTS rol_usuario, estado_pedido, estado_pago CASCADE;
-- ─────────────────────────────────────────────────────────────
CREATE TYPE rol_usuario   AS ENUM ('ADMIN', 'VENDEDOR', 'CLIENTE');
CREATE TYPE estado_pedido AS ENUM ('pendiente', 'esperando_pago', 'pagado', 'entregado', 'cancelado');
CREATE TYPE estado_pago   AS ENUM ('pendiente', 'confirmado', 'rechazado');


-- ─────────────────────────────────────────────────────────────
--  USUARIOS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  email          VARCHAR(100) NOT NULL UNIQUE,
  password       VARCHAR(255) NOT NULL,
  telefono       VARCHAR(15)  NOT NULL,
  rol            rol_usuario  NOT NULL DEFAULT 'CLIENTE',
  activo         BOOLEAN      NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
--  DIRECCIONES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS direcciones (
  id_direccion    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_usuario      BIGINT       NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
  calle           VARCHAR(150) NOT NULL,
  numero_exterior INT          NOT NULL,
  numero_interior VARCHAR(5)   NULL,
  colonia         VARCHAR(50)  NOT NULL,
  ciudad          VARCHAR(50)  NOT NULL,
  estado          VARCHAR(50)  NOT NULL,
  codigo_postal   VARCHAR(10)  NOT NULL,
  pais            VARCHAR(20)  NOT NULL,
  referencias     VARCHAR(100) NULL,
  es_principal    BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_direcciones_usuario ON direcciones(id_usuario);


-- ─────────────────────────────────────────────────────────────
--  TALLAS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tallas (
  id_talla    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre      VARCHAR(10) NOT NULL UNIQUE,
  es_ninio    BOOLEAN     NOT NULL DEFAULT FALSE,
  descripcion VARCHAR(50) NULL
);


-- ─────────────────────────────────────────────────────────────
--  PRODUCTOS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id_producto       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre            VARCHAR(70)   NOT NULL,
  descripcion       VARCHAR(200)  NULL,
  precio_base       NUMERIC(10,2) NOT NULL,
  disponible        BOOLEAN       NOT NULL DEFAULT TRUE,
  activo            BOOLEAN       NOT NULL DEFAULT TRUE,
  fecha_publicacion TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
--  IMAGEN_PRODUCTO
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS imagen_producto (
  id_imagen   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_producto BIGINT       NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE ON UPDATE CASCADE,
  url_imagen  VARCHAR(255) NOT NULL UNIQUE,
  orden       INT          NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_imagen_producto ON imagen_producto(id_producto);


-- ─────────────────────────────────────────────────────────────
--  PRODUCTOS_TALLAS  (relación N:M)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos_tallas (
  id_producto BIGINT NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE ON UPDATE CASCADE,
  id_talla    BIGINT NOT NULL REFERENCES tallas(id_talla)       ON DELETE CASCADE ON UPDATE CASCADE,

  PRIMARY KEY (id_producto, id_talla)
);


-- ─────────────────────────────────────────────────────────────
--  MÉTODOS DE PAGO
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS metodos_pago (
  id_metodo_pago BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre         VARCHAR(50) NOT NULL UNIQUE
);

-- Datos semilla: los 3 métodos definidos en los casos de uso
INSERT INTO metodos_pago (nombre) VALUES
  ('efectivo'),
  ('transferencia'),
  ('link_pago')
ON CONFLICT (nombre) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
--  PEDIDOS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
  id_pedido            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_usuario           BIGINT        NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE,
  fecha_pedido         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  estado               estado_pedido NOT NULL DEFAULT 'pendiente',
  total                NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  comentarios_cliente  VARCHAR(100)  NULL,
  comentarios_vendedor VARCHAR(100)  NULL
);

CREATE INDEX IF NOT EXISTS idx_pedidos_estado  ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos(id_usuario);


-- ─────────────────────────────────────────────────────────────
--  DETALLE_PEDIDOS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS detalle_pedidos (
  id_pedido   BIGINT        NOT NULL REFERENCES pedidos(id_pedido)     ON DELETE CASCADE  ON UPDATE CASCADE,
  id_producto BIGINT        NOT NULL REFERENCES productos(id_producto)  ON DELETE RESTRICT ON UPDATE CASCADE,
  id_talla    BIGINT        NOT NULL REFERENCES tallas(id_talla)        ON DELETE RESTRICT ON UPDATE CASCADE,
  cantidad    INT           NOT NULL,
  total       NUMERIC(10,2) NOT NULL,

  PRIMARY KEY (id_pedido, id_producto, id_talla)
);


-- ─────────────────────────────────────────────────────────────
--  PAGOS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagos (
  id_pago            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_pedido          BIGINT        NOT NULL REFERENCES pedidos(id_pedido)           ON DELETE RESTRICT ON UPDATE CASCADE,
  id_metodo_pago     BIGINT        NOT NULL REFERENCES metodos_pago(id_metodo_pago) ON DELETE RESTRICT ON UPDATE CASCADE,
  estado_pago        estado_pago   NOT NULL DEFAULT 'pendiente',
  fecha_registro     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  fecha_confirmacion TIMESTAMPTZ   NULL,
  referencia         VARCHAR(50)   NULL,
  comprobante_pago   VARCHAR(255)  NULL UNIQUE,
  url_pago           VARCHAR(255)  NULL,
  monto              NUMERIC(10,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado_pago);


-- ─────────────────────────────────────────────────────────────
--  FIN DEL SCRIPT
-- ─────────────────────────────────────────────────────────────
