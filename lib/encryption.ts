// Encryption utilities for sensitive data like Plaid access tokens
// Uses AES-256-GCM encryption via Node.js crypto module

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM, this is 12, but we'll use 16 for compatibility
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const key = process.env.PLAID_ENCRYPTION_KEY;
  if (!key) {
    // In development, use a default key (NOT for production!)
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'PLAID_ENCRYPTION_KEY environment variable is required in production'
      );
    }
    // Use a default key for development (should be set in .env.local)
    console.warn(
      'Warning: Using default encryption key. Set PLAID_ENCRYPTION_KEY in production!'
    );
    return crypto
      .createHash('sha256')
      .update('default-dev-key-change-in-production')
      .digest();
  }

  // If key is provided, use it directly (should be 32 bytes for AES-256)
  // If it's a string, hash it to get 32 bytes
  if (key.length === 64) {
    // Assume hex-encoded 32-byte key
    return Buffer.from(key, 'hex');
  }
  return crypto.createHash('sha256').update(key).digest();
}

export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12); // GCM standard IV length
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Return: iv:tag:encrypted (all hex-encoded)
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

export function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

