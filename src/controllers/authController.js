const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // <-- Agregado para validar el hash

const login = async (req, res) => {
  const { correo_corporativo, password } = req.body;

  try {
    // 1. Buscar usuario en la base de datos
    const userQuery = await db.query(
      `SELECT u.*, e.razon_social, s.nombre_sede, a.nombre_area 
       FROM USUARIO u
       JOIN EMPRESA e ON u.id_empresa = e.id_empresa
       JOIN SEDE s ON u.id_sede = s.id_sede
       JOIN AREA a ON u.id_area = a.id_area
       WHERE u.correo_corporativo = $1 AND u.estado_usuario = TRUE`,
      [correo_corporativo]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas o usuario inactivo' });
    }

    const usuario = userQuery.rows[0];

    // 2. Validar Contraseña (Bcrypt o Texto Plano según como la tengas guardada)
    // Si usaste bcrypt al registrar usuarios:
    const passValido = await bcrypt.compare(password, usuario.password);

    // *NOTA: Si en tu BD de prueba guardaste las claves en texto plano, usa esto en su lugar:
    // const passValido = (password === usuario.password);

    if (!passValido) {
      return res.status(401).json({ message: 'Credenciales inválidas (contraseña incorrecta)' });
    }

    // 3. Generar Token JWT solo si la clave es correcta
    const payload = {
      id_usuario: usuario.id_usuario,
      id_empresa: usuario.id_empresa,
      id_sede: usuario.id_sede,
      rol: usuario.rol_sistema,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

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