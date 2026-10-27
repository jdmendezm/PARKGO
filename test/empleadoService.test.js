const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL = '';

const db = require('../src/config/db');
const EmpleadoService = require('../src/services/EmpleadoService');

test('vehicle listing is scoped to the authenticated user id', async () => {
  const originalQuery = db.query;
  let queryText = '';
  let queryParams = [];
  db.query = async (text, params) => {
    queryText = text;
    queryParams = params;
    return { rows: [{ id_vehiculo: 8, placa: 'OWN-008' }] };
  };

  try {
    const vehicles = await EmpleadoService.obtenerVehiculos(44);
    assert.match(queryText, /WHERE id_usuario = \$1/);
    assert.deepEqual(queryParams, [44]);
    assert.equal(vehicles[0].placa, 'OWN-008');
  } finally {
    db.query = originalQuery;
  }
});

test('reservation persists vehicle details and locks the selected cup', async () => {
  const originalQuery = db.query;
  const originalWithTransaction = db.withTransaction;
  const transactionCalls = [];

  db.query = async () => ({ rows: [] });
  db.withTransaction = async callback => callback(async (query, params) => {
    transactionCalls.push({ query, params });
    if (query.includes('SELECT id_cupo, codigo_espacio')) {
      return { rows: [{ id_cupo: 103, codigo_espacio: 'B-203' }] };
    }
    if (query.includes('SELECT id_vehiculo FROM vehiculo')) return { rows: [] };
    if (query.includes('INSERT INTO vehiculo')) return { rows: [{ id_vehiculo: 501 }] };
    return { rows: [], rowCount: 1 };
  });

  try {
    const reservation = await EmpleadoService.crearReserva(9001, {
      tipoVehiculo: 'CARRO',
      placa: 'QA-501',
      marca: 'Mazda',
      modelo: '3',
      color: 'Azul',
      fecha: '2026-10-18',
      horaEntrada: '08:00',
      idCupo: 103
    });

    const cupQuery = transactionCalls.find(call => call.query.includes('SELECT id_cupo, codigo_espacio'));
    const vehicleInsert = transactionCalls.find(call => call.query.includes('INSERT INTO vehiculo'));
    assert.deepEqual(cupQuery.params, ['CARRO', 103]);
    assert.deepEqual(vehicleInsert.params, [9001, 'QA-501', 'CARRO', 'Mazda', '3', 'Azul']);
    assert.equal(reservation.cupo, 'B-203');
  } finally {
    db.query = originalQuery;
    db.withTransaction = originalWithTransaction;
  }
});