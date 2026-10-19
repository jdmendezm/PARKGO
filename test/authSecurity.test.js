const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const testSecret = 'parkgo-test-secret-with-more-than-thirty-two-bytes';
process.env.JWT_SECRET = testSecret;
process.env.DATABASE_URL = '';

const db = require('../src/config/db');
const Usuario = require('../src/models/Usuario');
const getJwtSecret = require('../src/config/jwtSecret');
const { verificarToken, verificarRol, normalizarRol } = require('../src/middlewares/authMiddleware');

db.query = async (_query, [userId]) => ({
  rows: [{
    id_usuario: userId,
    id_empresa: 1,
    id_sede: 1,
    nombres: 'Test',
    apellidos: 'Usuario',
    correo_corporativo: 'test@example.com',
    rol_sistema: 'GUARDA',
    estado_usuario: true
  }]
});

const createResponse = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

const runTokenMiddleware = async (authorization) => {
  const req = { headers: {} };
  if (authorization !== undefined) req.headers.authorization = authorization;
  const res = createResponse();
  let nextCalled = false;

  await verificarToken(req, res, () => {
    nextCalled = true;
  });

  return { req, res, nextCalled };
};

test('emits an HS256 token that expires within eight hours', () => {
  const user = new Usuario({
    id_usuario: 12,
    rol_sistema: 'EMPLEADO_CONDUCTOR',
    estado_usuario: true
  });
  const token = user.generarJWT();
  const decoded = jwt.verify(token, testSecret, { algorithms: ['HS256'] });
  const header = jwt.decode(token, { complete: true }).header;

  assert.equal(header.alg, 'HS256');
  assert.equal(decoded.id_usuario, 12);
  assert.equal(decoded.rol, 'EMPLEADO');
  assert.ok(decoded.exp - decoded.iat <= 8 * 60 * 60);
});

test('accepts a valid Bearer token after refreshing the active database user', async () => {
  const token = jwt.sign({ id_usuario: 1, rol: 'GUARDA' }, testSecret, {
    algorithm: 'HS256',
    expiresIn: '1h'
  });
  const result = await runTokenMiddleware(`Bearer ${token}`);

  assert.equal(result.nextCalled, true);
  assert.equal(result.req.usuario.id_usuario, 1);
});

test('uses the current database role instead of stale JWT claims', async () => {
  const originalQuery = db.query;
  db.query = async () => ({
    rows: [{
      id_usuario: 1,
      id_empresa: 8,
      id_sede: 3,
      nombres: 'Admin',
      apellidos: 'Empresa',
      correo_corporativo: 'admin@example.com',
      rol_sistema: 'ADMIN_EMPRESA',
      estado_usuario: true
    }]
  });

  try {
    const staleToken = jwt.sign({ id_usuario: 1, id_empresa: 2, rol: 'EMPLEADO' }, testSecret, {
      algorithm: 'HS256',
      expiresIn: '1h'
    });
    const result = await runTokenMiddleware(`Bearer ${staleToken}`);
    assert.equal(result.nextCalled, true);
    assert.equal(result.req.usuario.rol, 'ADMIN_EMPRESA');
    assert.equal(result.req.usuario.id_empresa, 8);
  } finally {
    db.query = originalQuery;
  }
});

test('rejects a validly signed token when the account is disabled', async () => {
  const originalQuery = db.query;
  db.query = async () => ({
    rows: [{ id_usuario: 1, estado_usuario: false }]
  });

  try {
    const token = jwt.sign({ id_usuario: 1, rol: 'GUARDA' }, testSecret, {
      algorithm: 'HS256',
      expiresIn: '1h'
    });
    const result = await runTokenMiddleware(`Bearer ${token}`);
    assert.equal(result.nextCalled, false);
    assert.equal(result.res.statusCode, 401);
  } finally {
    db.query = originalQuery;
  }
});

test('rejects missing and malformed authorization headers', async () => {
  assert.equal((await runTokenMiddleware(undefined)).res.statusCode, 401);
  assert.equal((await runTokenMiddleware('Basic token-value')).res.statusCode, 401);
  assert.equal((await runTokenMiddleware('Bearer one two')).res.statusCode, 401);
});

test('rejects expired tokens and algorithms other than HS256', async () => {
  const expired = jwt.sign({ id_usuario: 1 }, testSecret, {
    algorithm: 'HS256',
    expiresIn: -1
  });
  const otherAlgorithm = jwt.sign({ id_usuario: 1 }, testSecret, {
    algorithm: 'HS384',
    expiresIn: '1h'
  });

  assert.equal((await runTokenMiddleware(`Bearer ${expired}`)).res.statusCode, 401);
  assert.equal((await runTokenMiddleware(`Bearer ${otherAlgorithm}`)).res.statusCode, 401);
});

test('normalizes employee roles and denies cross-role access', () => {
  const req = { usuario: { rol: 'EMPLEADO_CONDUCTOR' } };
  const allowedResponse = createResponse();
  let allowedNext = false;
  verificarRol('EMPLEADO')(req, allowedResponse, () => {
    allowedNext = true;
  });
  assert.equal(allowedNext, true);

  const deniedResponse = createResponse();
  let deniedNext = false;
  verificarRol('GUARDA')(req, deniedResponse, () => {
    deniedNext = true;
  });
  assert.equal(deniedNext, false);
  assert.equal(deniedResponse.statusCode, 403);
});

test('requires a JWT secret with at least 32 bytes', () => {
  process.env.JWT_SECRET = 'short-secret';
  assert.throws(() => getJwtSecret(), /al menos 32 bytes/);

  process.env.JWT_SECRET = testSecret;
  assert.equal(getJwtSecret(), testSecret);
});

test('maps database administrator roles to the admin permission profile', () => {
  assert.equal(normalizarRol('ADMIN_EMPRESA'), 'ADMIN');
  assert.equal(normalizarRol('SUPERADMIN'), 'ADMIN');

  for (const role of ['ADMIN_EMPRESA', 'SUPERADMIN']) {
    const response = createResponse();
    let nextCalled = false;
    verificarRol('ADMIN')({ usuario: { rol: role } }, response, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  }
});