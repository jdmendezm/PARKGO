class Vehiculo {
  constructor(data) {
    this.id_vehiculo = data.id_vehiculo;
    this.id_usuario = data.id_usuario;
    this.placa = data.placa;
    this.tipo_vehiculo = data.tipo_vehiculo;
    this.marca = data.marca;
    this.modelo = data.modelo;
    this.color = data.color;
  }
}

module.exports = Vehiculo;
