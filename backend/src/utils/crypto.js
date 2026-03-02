const crypto = require('crypto');
const config = require('../config');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

const getKey = () => {
  const key = config.encryptionKey;
  if (!key || key.length < KEY_LENGTH) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters');
  }
  return key.substring(0, KEY_LENGTH);
};

const encrypt = (text) => {
  if (!text) return null;
  
  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('加密失败');
  }
};

const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  
  try {
    const key = getKey();
    const parts = encryptedText.split(':');
    
    if (parts.length !== 2) {
      return encryptedText;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    
    if (iv.length !== IV_LENGTH) {
      return encryptedText;
    }
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key), iv);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    return encryptedText;
  }
};

const encryptPassword = (password) => {
  if (!password) return null;
  return encrypt(password);
};

const decryptPassword = (encryptedPassword) => {
  if (!encryptedPassword) return null;
  return decrypt(encryptedPassword);
};

const encryptPrivateKey = (privateKey) => {
  if (!privateKey) return null;
  return encrypt(privateKey);
};

const decryptPrivateKey = (encryptedPrivateKey) => {
  if (!encryptedPrivateKey) return null;
  return decrypt(encryptedPrivateKey);
};

module.exports = {
  encrypt,
  decrypt,
  encryptPassword,
  decryptPassword,
  encryptPrivateKey,
  decryptPrivateKey,
};
