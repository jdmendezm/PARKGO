class Reserva {
  constructor(data) {
    this.id_reserva = data.id_reserva;
    this.codigo_alfanumerico = data.codigo_alfanumerico;
    this.id_cupo = data.id_cupo;
    this.id_vehiculo = data.id_vehiculo;
    this.id_usuario = data.id_usuario;
    this.estado_reserva = data.estado_reserva; // 'ACTIVA', 'EN_SITIO', 'FINALIZADA', 'CANCELADA'
    this.fecha_reserva = data.fecha_reserva;
    this.hora_entrada_estimada = data.hora_entrada_estimada;
    this.hora_salida_estimada = data.hora_salida_estimada;
  }

  esActiva() {
    return this.estado_reserva === 'ACTIVA';
  }

  enSitio() {
    return this.estado_reserva === 'EN_SITIO';
  }

  finalizada() {
    return this.estado_reserva === 'FINALIZADA';
  }

  static generarCodigoUnico() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `PARK-${num}`;
  }
}

module.exports = Reserva;
