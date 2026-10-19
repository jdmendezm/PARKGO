const MIN_JWT_SECRET_BYTES = 32;

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < MIN_JWT_SECRET_BYTES) {
    const error = new Error('JWT_SECRET debe tener al menos 32 bytes.');
    error.code = 'JWT_SECRET_INVALID';
    throw error;
  }

  return secret;
};

module.exports = getJwtSecret;