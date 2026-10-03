# DOCUMENTACIÓN DE ENTREGA - PARKGO

## 1. Resumen del proyecto

PARKGO es un sistema de gestión de parqueaderos institucionales enfocado en dos roles principales:

- Portería Web: controla acceso, valida pases y administra cupos.
- Empleado Móvil: permite consultar pase activo, reservar un espacio y revisar el historial de acceso.

El proyecto está integrado con PostgreSQL Neon y usa autenticación JWT para proteger los endpoints.

## 2. Objetivos de negocio

- Mejorar el control de acceso vehicular institucional.
- Reducir errores manuales en la portería.
- Permitir que el empleado gestione su reserva desde móvil.
- Centralizar la información del estado del parqueadero.

## 3. Funcionalidades entregadas

### Web / Portería
- Inicio de sesión para guardas.
- Consulta del catálogo de cupos.
- Validación de código de pase.
- Registro de entrada y salida.
- Visualización del estado del parqueadero en tiempo real.

### Móvil / Empleado
- Inicio de sesión con credenciales corporativas.
- Visualización del pase activo.
- Generación de nueva reserva.
- Historial de accesos.
- Diseño adaptado para pantallas móviles.

## 4. Datos de prueba

### Guarda Web
- Correo: carlos.guarda@sanmateo.edu.co
- Contraseña: Password123

### Empleado Móvil
- Correo: luis.vargas@sanmateo.edu.co
- Contraseña: Password123

## 5. Ejecución local

```bash
npm install
npm start
```

Luego abrir:

```text
http://localhost:3000
```

## 6. Variables de entorno

Crear un archivo `.env` en la raíz con:

```bash
DATABASE_URL=tu_url_de_neon
JWT_SECRET=tu_secret
PORT=3000
```

## 7. Estado de entrega

El sistema quedó operativo, validado y listo para presentar como proyecto funcional con backend, web y móvil integrados.

## 8. Recomendaciones futuras

- Proteger aún más el backend con rate limiting.
- Añadir dashboard con métricas y gráficas.
- Mejorar reportes exportables en PDF/Excel.
- Implementar notificaciones push para empleados.

## 9. Link del repositorio

https://github.com/jdmendezm/PARKGO
