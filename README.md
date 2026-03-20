# Tintin Luxury — Tienda en Lineaez

---

## Descripción

Sistema web para automatizar la gestión de ventas de **Tintin Luxury**, empresa dedicada a la venta de ropa y accesorios de moda. Permite a clientes explorar el catálogo y realizar pedidos, a vendedores gestionar productos y pagos, y al administrador controlar usuarios y generar reportes.

**Stack tecnológico:** Node.js · Express · PostgreSQL (Supabase) · HTML / CSS / JavaScript vanilla

---

## Requisitos previos

- [Node.js](https://nodejs.org/) >= 18.0.0
- Cuenta en [Supabase](https://supabase.com) (gratuita) — **un solo proyecto compartido para todo el equipo**
- npm (incluido con Node.js)
- Git

---

## Instalación y arranque local

### 1. Clonar el repositorio

git clone https://github.com/SergioAC132/RepoDemoGrupoB.git
cd tienda-en-linea

### 2. Instalar dependencias del backend

cd backend
npm install

### 3. Configurar variables de entorno

# Copia el archivo de ejemplo
cp .env.example .env

Edita `.env` y pega tu `DATABASE_URL` de Supabase:  
**Supabase Dashboard → Project Settings → Database → Connection string → URI**

También cambia `JWT_SECRET` por cualquier cadena larga que se te ocurra.

### 4. Crear las tablas en Supabase

En el **SQL Editor** de tu proyecto de Supabase, copia y pega el contenido completo de `backend/database/schema.sql` y ejecútalo.

Esto crea todas las tablas, índices, tipos ENUM e inserta los 3 métodos de pago automáticamente.

> Si necesitas volver a correr el script desde cero, primero ejecuta:
> DROP TYPE IF EXISTS rol_usuario, estado_pedido, estado_pago CASCADE;

### 5. Iniciar el servidor

# Desde la carpeta backend/

# Modo desarrollo (recarga automática al guardar)
npm run dev
# Modo producción
npm start


El servidor queda corriendo en `http://localhost:3000` (o el puerto definido en `.env`).

---

## Cómo conectarse a la BD desde Node.js

El driver que usamos es `pg` (node-postgres). La conexión va en `backend/config/db.js`:

```js
// backend/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // requerido por Supabase
});

module.exports = pool;
```

Para hacer queries desde cualquier modelo:

```js
const pool = require('../config/db');

// Los parámetros van con $1, $2, $3 (no con ? como en MySQL)
const { rows } = await pool.query(
  'SELECT * FROM usuarios WHERE email = $1',
  [email]
);
```

---

## Estructura del proyecto

```
tienda-en-linea/
├── backend/
│   ├── config/          # Conexión a BD (db.js) y configuración general
│   ├── controllers/     # Lógica de negocio por módulo
│   ├── middlewares/     # Autenticación JWT, validaciones, roles
│   ├── models/          # Consultas SQL por entidad
│   ├── routes/          # Definición de endpoints REST
│   └── database/
│       ├── schema.sql   # Script de creación de tablas (PostgreSQL)
│       └── uploads/     # Imágenes subidas localmente (ignorada por Git)
├── frontend/
│   ├── assets/
│   │   ├── css/         # Estilos globales
│   │   └── js/          # Scripts del cliente
│   └── views/           # Vistas HTML por módulo
├── .env.example         # Variables de entorno (plantilla — sí se sube a Git)
├── .gitignore
└── README.md
```

---

## Módulos del sistema

| Módulo | Casos de uso |
|---|---|
| **Autenticación** | UC-01 Iniciar sesión · UC-02 Registrarse |
| **Catálogo** | UC-03 Ver catálogo · UC-04 Ver detalle · UC-05 Gestionar productos |
| **Direcciones** | UC-06 Gestionar mis direcciones |
| **Pedidos y Pagos** | UC-07 Crear pedido · UC-08 Registrar pago · UC-09 Actualizar estado · UC-10 Confirmar/rechazar pago · UC-17 Modificar detalle |
| **Seguimiento** | UC-11 Historial de pedidos · UC-12 Pedidos activos · UC-13 Comentarios internos · UC-14 Dashboard de ventas |
| **Administración** | UC-15 Gestionar usuarios · UC-16 Generar reportes |

---

## Convenciones de Git

### Ramas

| Rama | Uso |
|---|---|
| `main` | Solo código estable y entregado. Nadie sube directo aquí. |
| `dev` | Rama de integración. Todas las features se mergean aquí primero. |
| `<nombre_desarrollador>/<nombre_entrega>` | Una rama por funcionalidad. |

Las ramas seran creadas por el lider del proyecto para que cada integrante pueda trabajar en la suya.
Nadie puede modificar trabajo de otro integrante sin notificar ni autorizacion previa

### Ejemplos

dev
├── Sergio/auth
├── Jack/catalogo
├── Fernanda/views-auth
├── Erick/views-catalogo

### Subir cambios

Desde la rama asignada para el modulo

```bash
git add .
git commit -m "<clave del caso de uso trabajado> - descripción corta de lo que hiciste"
git push origin <nombre-de-la-rama-asignada>
```

### Ejemplo
```bash
git add .
git commit -m "CU-01 - Funcionamiento basico del login"
git push origin Sergio/auth
```

Luego abre un **Pull Request** hacia `dev` en GitHub. El manager lo revisa antes de mergear.

---

## Endpoints principales (se irán agregando)

| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| `POST` | `/api/auth/register` | Registrar nuevo usuario | Público |
| `POST` | `/api/auth/login` | Iniciar sesión | Público |
| `GET` | `/api/productos` | Listar catálogo | Cliente |
| `POST` | `/api/productos` | Crear producto | Vendedor |
| `GET` | `/api/pedidos` | Ver pedidos activos | Vendedor / Admin |
| `POST` | `/api/pedidos` | Crear pedido | Cliente |
| `PATCH` | `/api/pedidos/:id/estado` | Actualizar estado | Vendedor / Admin |
| `POST` | `/api/pagos` | Registrar pago | Cliente |
| `PATCH` | `/api/pagos/:id/confirmar` | Confirmar pago | Vendedor / Admin |

---

## Notas importantes

- El archivo `.env` **nunca** se sube al repositorio. Solo `.env.example` (sin valores reales).
- Antes de abrir un PR, actualiza tu rama con `dev`:
  
```bash
  git fetch origin
  git rebase origin/dev
```

- Supabase pausa proyectos sin actividad por 7 días (plan gratuito). Si la BD no responde, entra al dashboard y reactívala.
