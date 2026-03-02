const { db } = require('../database');

const getCorsOrigins = () => {
  try {
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('cors_origins');
    if (setting) {
      const origins = JSON.parse(setting.value);
      if (Array.isArray(origins) && origins.length > 0) {
        return origins;
      }
    }
  } catch (error) {
    console.error('Failed to load CORS origins from database:', error);
  }
  
  return null;
};

const getEnvironmentCorsOrigins = () => {
  const envOrigins = process.env.CORS_ORIGIN;
  if (!envOrigins) {
    return null;
  }
  
  return envOrigins.split(',').map(origin => origin.trim());
};

const getDefaultCorsOrigins = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'production') {
    return [];
  }
  
  return ['http://localhost:3000', 'http://localhost:3001'];
};

const getAllowedOrigins = () => {
  const dbOrigins = getCorsOrigins();
  const envOrigins = getEnvironmentCorsOrigins();
  const defaultOrigins = getDefaultCorsOrigins();
  
  if (dbOrigins && dbOrigins.length > 0) {
    return dbOrigins;
  }
  
  if (envOrigins && envOrigins.length > 0) {
    return envOrigins;
  }
  
  return defaultOrigins;
};

const updateCorsOrigins = (origins) => {
  try {
    if (!Array.isArray(origins)) {
      throw new Error('Origins must be an array');
    }
    
    const value = JSON.stringify(origins);
    
    const existing = db.prepare('SELECT id FROM settings WHERE key = ?').get('cors_origins');
    
    if (existing) {
      db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(value, 'cors_origins');
    } else {
      db.prepare('INSERT INTO settings (key, value, description) VALUES (?, ?, ?)').run(
        'cors_origins',
        value,
        'CORS 允许的来源列表'
      );
    }
    
    return true;
  } catch (error) {
    console.error('Failed to update CORS origins:', error);
    throw error;
  }
};

const getCorsConfig = () => {
  const allowedOrigins = getAllowedOrigins();
  
  return {
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      console.warn(`CORS blocked request from origin: ${origin}`);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  };
};

module.exports = {
  getCorsOrigins,
  getEnvironmentCorsOrigins,
  getDefaultCorsOrigins,
  getAllowedOrigins,
  updateCorsOrigins,
  getCorsConfig,
};
