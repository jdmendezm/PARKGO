const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_URL = '';
const db = require('../src/config/db');
const AdminService = require('../src/services/AdminService');

test('company administrators list users within their own company', async () => {
  const originalQuery = db.query;
  let queryText = '';
  let queryParams = [];
  db.query = async (text, params) => {
    queryText = text;
    queryParams = params;
    return { rows: [{ id_usuario: 8 }] };
  };

  try {
    const users = await AdminService.listarUsuarios({ rol: 'ADMIN_EMPRESA', id_empresa: 4 });
    assert.match(queryText, /id_empresa = \$2/);
    assert.deepEqual(queryParams, [false, 4]);
    assert.equal(users[0].id_usuario, 8);
  } finally {
    db.query = originalQuery;
  }
});

test('superadmins list users across companies', async () => {
  const originalQuery = db.query;
  let queryParams = [];
  db.query = async (_text, params) => {
    queryParams = params;
    return { rows: [] };
  };

  try {
    await AdminService.listarUsuarios({ rol: 'SUPERADMIN', id_empresa: 4 });
    assert.deepEqual(queryParams, [true, 4]);
  } finally {
    db.query = originalQuery;
  }
});

test('company administrators cannot grant administrative roles', async () => {
  await assert.rejects(
    AdminService.actualizarRol(
      { rol: 'ADMIN_EMPRESA', id_usuario: 1, id_empresa: 4 },
      2,
      'ADMIN_EMPRESA'
    ),
    error => error.status === 403
  );
});

test('administrators cannot change their own role or account state', async () => {
  const actor = { rol: 'ADMIN_EMPRESA', id_usuario: 1, id_empresa: 4 };

  await assert.rejects(AdminService.actualizarRol(actor, 1, 'GUARDA'), error => error.status === 409);
  await assert.rejects(AdminService.actualizarEstado(actor, 1, false), error => error.status === 409);
});

test('company administrator updates are scoped to the actor company', async () => {
  const originalQuery = db.query;
  let queryParams = [];
  db.query = async (_text, params) => {
    queryParams = params;
    return { rows: [{ id_usuario: 2, rol_sistema: 'GUARDA' }] };
  };

  try {
    await AdminService.actualizarRol(
      { rol: 'ADMIN_EMPRESA', id_usuario: 1, id_empresa: 4 },
      2,
      'GUARDA'
    );
    assert.deepEqual(queryParams, [2, 'GUARDA', false, 4]);
  } finally {
    db.query = originalQuery;
  }
});

test('only superadmins can assign the superadmin role', async () => {
  const originalQuery = db.query;
  let queryParams = [];
  db.query = async (_text, params) => {
    queryParams = params;
    return { rows: [{ id_usuario: 2, rol_sistema: 'SUPERADMIN' }] };
  };

  try {
    await AdminService.actualizarRol(
      { rol: 'SUPERADMIN', id_usuario: 1, id_empresa: 1 },
      2,
      'SUPERADMIN'
    );
    assert.deepEqual(queryParams, [2, 'SUPERADMIN', true, 1]);
  } finally {
    db.query = originalQuery;
  }
});