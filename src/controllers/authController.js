const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const login = async (req, res) => {
  const { correo_corporativo, password } = req.body;

  try {
    // Depuración: Ver qué datos están llegando desde la web
    console.log("--> Intento de login con correo:", correo_corporativo);
    console.log("--> Password recibida desde el cliente:", password);

    // 1. Buscar usuario en la base de datos
    const userQuery = await db.query(
      `SELECT u.*, e.razon_social, s.nombre_sede, a.nombre_area 
       FROM "USUARIO" u
       JOIN "EMPRESA" e ON u.id_empresa = e.id_empresa
       JOIN "SEDE" s ON u.id_sede = s.id_sede
       JOIN "AREA" a ON u.id_area = a.id_area
       WHERE u.correo_corporativo = $1 AND u.estado_usuario = TRUE`,
      [correo_corporativo]
    );

    if (userQuery.rows.length === 0) {
      console.log("❌ ERROR: El correo no existe o el usuario está inactivo en la BD.");
      return res.status(401).json({ message: 'Credenciales inválidas o usuario inactivo' });
    }

    const usuario = userQuery.rows[0];
    console.log("--> Usuario encontrado en la BD:", usuario.correo_corporativo);
    console.log("--> Password almacenada en la BD:", usuario.password);

    // 2. Validar Contraseña (Bcrypt o Texto Plano)
    let passValido = false;

    if (usuario.password && (usuario.password.startsWith('$2a$') || usuario.password.startsWith('$2b$'))) {
      passValido = await bcrypt.compare(password, usuario.password);
    } else {
      // Comparación directa ignorando espacios al inicio o final
      passValido = (password.trim() === String(usuario.password).trim());
    }

    if (!passValido) {
      console.log("❌ ERROR: La contraseña introducida no coincide con la almacenada.");
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    console.log("✅ LOGIN EXITOSO para:", usuario.correo_corporativo);

    // 3. Generar Token JWT
    const payload = {
      id_usuario: usuario.id_usuario,
      id_empresa: usuario.id_empresa,
      id_sede: usuario.id_sede,
      rol: usuario.rol_sistema,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secreto_parkgo', { expiresIn: '8h' });

    return res.json({
      message: 'Autenticación exitosa',
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        cargo: usuario.cargo,
        rol: usuario.rol_sistema,
        empresa: usuario.razon_social,
        sede: usuario.nombre_sede,
        area: usuario.nombre_area
      }
    });
  } catch (error) {
    console.error('Error en Login:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { login };