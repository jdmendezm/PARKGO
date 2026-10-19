# PARKGO

Sistema de gestión de parqueaderos para portería web y empleado móvil, desarrollado con Node.js, Express y PostgreSQL Neon.

## Descripción general

PARKGO es una solución institucional para controlar accesos y reservas de parqueadero en una sede universitaria. El sistema está dividido en dos experiencias:

- Portería Web: panel administrativo para validar pases, registrar entradas y salidas, y consultar el estado real del parqueadero.
- Empleado Móvil: vista enfocada en teléfono para consultar pase activo, reservar cupo y revisar historial.

## Funcionalidades principales

- Autenticación segura con JWT
- Registro de usuarios y empleados
- Validación de códigos de pase por parte de la portería
- Registro de check-in y check-out
- Gestión del catálogo de cupos con estado real
- Reserva de parqueadero desde el módulo móvil
- Historial de accesos por empleado
- Base de datos automática con verificación y corrección de salud

## Roles y perfiles

| Rol de base de datos | Perfil de interfaz | Alcance |
| --- | --- | --- |
| `SUPERADMIN` | Administración global | Consulta y administra usuarios de todas las empresas. Puede asignar roles administrativos. |
| `ADMIN_EMPRESA` | Administración de empresa | Consulta cupos, reservas, vehículos y usuarios de su empresa; puede cambiar roles operativos y activar/desactivar cuentas, no elevarse a sí mismo ni crear administradores. |
| `GUARDA` | Portería web | Consulta cupos, valida pases y registra entradas y salidas. |
| `EMPLEADO_CONDUCTOR` | Empleado móvil | Consulta pase e historial propios y reserva un cupo libre de su sede. |

El servidor vuelve a consultar el rol y estado de la cuenta en cada petición autenticada. Ocultar una opción en la interfaz no reemplaza la autorización del API. Visitantes no son un rol de inicio de sesión en el esquema actual; las invitaciones, cupos fijos, sanciones, tickets de soporte y reportes avanzados siguen pendientes de reglas de negocio y endpoints aprobados.

Rutas administrativas disponibles: `GET /api/v1/admin/resumen`, `/cupos`, `/reservas`, `/vehiculos`, `/usuarios`; cambios de perfil y estado usan `PATCH /api/v1/admin/usuarios/:id/rol` y `/estado`. El empleado consulta puestos por tipo con `GET /api/v1/mobile/empleado/cupos?tipoVehiculo=CARRO|MOTO` y confirma el identificador seleccionado en `POST /reserva`.

La cuenta pública del registro se crea como `EMPLEADO_CONDUCTOR`. La asignación de roles administrativos debe realizarla un usuario autorizado; nunca se acepta un rol enviado por el formulario público.

### Primer administrador

1. Registra una cuenta institucional y confirma que esté activa.
2. Con acceso autorizado a la base, ejecuta una sola vez:

```bash
npm run bootstrap:admin -- administrador@organizacion.edu
```

El comando promueve esa cuenta a `SUPERADMIN` sólo si no existe ya uno. No crea contraseñas ni imprime secretos. Después, las cuentas `ADMIN_EMPRESA` y los perfiles operativos se asignan desde el panel.

## Stack tecnológico

- Node.js
- Express
- PostgreSQL Neon
- pg
- JWT
- bcrypt
- Server-side rendering estático con frontend en HTML/CSS/JS

## Estructura del proyecto

```bash
PARKGO/
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── index.js
├── .gitignore
├── .env.example
├── inspect_schema.js
├── package.json
├── README.md
```

## Requisitos

- Node.js 18 o superior
- PostgreSQL Neon con conexión válida
- Variable de entorno `DATABASE_URL`
- Variable de entorno `JWT_SECRET`

## Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/jdmendezm/PARKGO.git
cd PARKGO
```

2. Instala dependencias:

```bash
npm install
```

3. Copia `.env.example` como `.env` y configura tus valores locales. No subas `.env` a GitHub.

```bash
Copy-Item .env.example .env
```

Genera un `JWT_SECRET` aleatorio de al menos 32 bytes y úsalo en `.env` y en Render. Cambiarlo invalida los tokens existentes. No reutilices el valor de ejemplo ni compartas el secreto.

Puedes generar una clave localmente con Node.js; ejecuta el comando en tu terminal y no pegues el resultado en chats ni archivos versionados:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Si `.env` ya se subió a GitHub, rota también la contraseña del rol de base de datos en Neon y actualiza `DATABASE_URL` en `.env` y en Render. Quitar `.env` del último commit no elimina copias de commits anteriores; el historial remoto se purgará después de rotar las credenciales.

En Render configura `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` y `TRUST_PROXY_HOPS=1` como variables del servicio. `CORS_ORIGINS` debe contener el origen exacto de cada frontend permitido, separado por comas. La aplicación limita las solicitudes de API y los intentos fallidos de autenticación.

4. Inicia la aplicación:

```bash
npm start
```

Ejecuta las pruebas de autenticación y roles con `npm test`.

5. Abre el proyecto en el navegador:

```bash
http://localhost:3000
```

## Credenciales de prueba

### Guarda Web
- Correo: `carlos.guarda@sanmateo.edu.co`
- Contraseña: `Password123`

### Empleado Móvil
- Correo: `luis.vargas@sanmateo.edu.co`
- Contraseña: `Password123`

## Flujos principales

### Portería Web
- Inicia sesión con un usuario de guarda.
- Consulta el catálogo de cupos.
- Valida códigos de pase.
- Registra entrada y salida del vehículo.

### Empleado Móvil
- Inicia sesión con un usuario de empleado.
- Consulta el pase activo.
- Genera nueva reserva para parqueadero.
- Revisa el historial de accesos.

## Estado del proyecto

El sistema se encuentra funcional y validado con la base de datos real, con la estructura completa para ser presentado como proyecto de gestión de acceso y parqueadero institucional.

## Autor

PARKGO - Proyecto de gestión de parqueadero institucional.

## Licencia

ISC
