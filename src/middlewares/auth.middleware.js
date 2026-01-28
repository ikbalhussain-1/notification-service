const envConfig = require('../config/envConfig');
const { AuthenticationError } = require('../utils/errors');

const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'API key is required',
      },
    });
  }

  if (apiKey !== envConfig.apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid API key',
      },
    });
  }

  next();
};

module.exports = authMiddleware;
