class CupoParqueo {
  constructor(data) {
    this.id_cupo = data.id_cupo;
    this.codigo_espacio = data.codigo_espacio;
    this.tipo_cupo = data.tipo_cupo; // 'CARRO', 'MOTO', 'BICICLETA'
    this.estado_cupo = data.estado_cupo; // 'DISPONIBLE', 'RESERVADO', 'OCUPADO', 'MANTENIMIENTO'
    this.piso = data.piso;
  }

  estaDisponible() {
    return this.estado_cupo === 'DISPONIBLE';
  }
}

module.exports = CupoParqueo;
