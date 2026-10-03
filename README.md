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
├── inspect_schema.js
├── package.json
├── README.md
└── .env
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

3. Crea el archivo `.env` en la raíz del proyecto con este formato:

```bash
DATABASE_URL=tu_url_de_neon
JWT_SECRET=tu_jwt_secret
PORT=3000
```

4. Inicia la aplicación:

```bash
npm start
```

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
