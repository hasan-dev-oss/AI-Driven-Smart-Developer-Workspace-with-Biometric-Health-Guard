/**
 * Encryption Service
 * Handles encryption/decryption of sensitive interview data
 */

class EncryptionService {
  constructor(secret = null) {
    this.secret = secret || this.generateSecret();
  }

  generateSecret() {
    return crypto.getRandomValues(new Uint8Array(32));
  }

  async encryptData(data) {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(JSON.stringify(data));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const key = await this.getKey();
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBuffer
      );

      // Return IV + encrypted data as base64
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(new Uint8Array(iv));
      combined.set(new Uint8Array(encrypted), iv.length);

      return this.bytesToBase64(combined);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  async decryptData(encryptedBase64) {
    try {
      const combined = this.base64ToBytes(encryptedBase64);
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const key = await this.getKey();
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decrypted));
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  async getKey() {
    return crypto.subtle.importKey(
      'raw',
      this.secret,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // Hash sensitive data for comparison
  async hashData(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return this.bytesToBase64(new Uint8Array(hashBuffer));
  }
}

export default EncryptionService;
