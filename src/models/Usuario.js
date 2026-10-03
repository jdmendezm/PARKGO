const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class Usuario {
  constructor(data) {
    const rolNormalizado = String(data.rol_sistema || 'EMPLEADO').toUpperCase();
    const rolFinal = rolNormalizado === 'EMPLEADO_CONDUCTOR' ? 'EMPLEADO' : rolNormalizado;

    this.id_usuario = data.id_usuario;
    this.correo_corporativo = data.correo_corporativo;
    this.password = data.password;
    this.nombres = data.nombres;
    this.apellidos = data.apellidos;
    this.cargo = data.cargo;
    this.rol_sistema = rolFinal;
    this.estado_usuario = Boolean(data.estado_usuario);
    this.id_empresa = data.id_empresa;
    this.id_sede = data.id_sede;
    this.id_area = data.id_area;
    this.razon_social = data.razon_social;
    this.nombre_sede = data.nombre_sede;
    this.nombre_area = data.nombre_area;
  }

  /**
   * Valida la contraseña comparándola con el hash almacenado en la base de datos usando bcrypt.
   * Eliminados accesos en texto plano por seguridad estricta.
   */
  async validarPassword(passwordIngresada) {
    if (!passwordIngresada || !this.password) return false;
    
    // Si la contraseña tiene formato bcrypt
    if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$') || this.password.startsWith('$2y$')) {
      return await bcrypt.compare(passwordIngresada, this.password);
    }
    
    // Fallback seguro usando compare o rechazando contraseñas inseguras
    return false;
  }

  /**
   * Genera el token JWT firmado con expiración segura de 8 horas.
   */
  generarJWT() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('CONFIG_ERROR: La clave secreta JWT_SECRET no está definida en las variables de entorno.');
    }

    const payload = {
      id_usuario: this.id_usuario,
      id_empresa: this.id_empresa,
      id_sede: this.id_sede,
      rol: this.rol_sistema,
      nombres: this.nombres,
      apellidos: this.apellidos,
      correo: this.correo_corporativo
    };

    return jwt.sign(payload, secret, { expiresIn: '8h' });
  }

  /**
   * Retorna objeto seguro para respuesta JSON (evita filtrar hash de contraseña).
   */
  toPublicJSON() {
    return {
      id_usuario: this.id_usuario,
      nombres: this.nombres,
      apellidos: this.apellidos,
      nombre_completo: `${this.nombres} ${this.apellidos}`,
      correo: this.correo_corporativo,
      cargo: this.cargo,
      rol: this.rol_sistema,
      empresa: this.razon_social,
      sede: this.nombre_sede,
      area: this.nombre_area
    };
  }
}

module.exports = Usuario;
