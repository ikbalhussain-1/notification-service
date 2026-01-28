const envConfig = require('../config/envConfig');

const swaggerAuth = (req, res, next) => {
  // Skip auth in development if credentials not set
  if (envConfig.nodeEnv === 'development' && !envConfig.swagger.user) {
    return next();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Swagger UI"');
    return res.status(401).send('Authentication required');
  }

  const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  if (username === envConfig.swagger.user && password === envConfig.swagger.password) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Swagger UI"');
  return res.status(401).send('Invalid credentials');
};

module.exports = swaggerAuth;
