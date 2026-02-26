/**
 * E2EE Crypto Utilities for Chat
 * Uses Web Crypto API for secure client-side encryption
 */

class E2EECrypto {
  constructor() {
    this.keyPairs = new Map(); // Store key pairs by key ID
    this.importedPublicKeys = new Map(); // Cache for imported public keys
  }

  /**
   * Generate a new RSA key pair for E2EE
   */
  async generateKeyPair() {
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256'
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );

      // Export public key to share with server
      const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
      const publicKeyBase64 = this.arrayBufferToBase64(publicKeyBuffer);

      // Store private key in localStorage (in production, consider more secure storage)
      const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const privateKeyBase64 = this.arrayBufferToBase64(privateKeyBuffer);
      
      const keyId = this.generateKeyId();
      localStorage.setItem(`e2ee_private_key_${keyId}`, privateKeyBase64);
      localStorage.setItem(`e2ee_public_key_${keyId}`, publicKeyBase64);
      localStorage.setItem('e2ee_current_key_id', keyId);

      return {
        keyId,
        publicKey: publicKeyBase64,
        privateKey: privateKeyBase64
      };
    } catch (error) {
      console.error('Key generation failed:', error);
      throw new Error('Failed to generate encryption keys');
    }
  }

  /**
   * Get the current private key from storage
   */
  async getCurrentPrivateKey() {
    try {
      const keyId = localStorage.getItem('e2ee_current_key_id');
      if (!keyId) return null;

      const privateKeyBase64 = localStorage.getItem(`e2ee_private_key_${keyId}`);
      if (!privateKeyBase64) return null;

      if (this.keyPairs.has(keyId)) {
        return this.keyPairs.get(keyId);
      }

      const privateKeyBuffer = this.base64ToArrayBuffer(privateKeyBase64);
      const privateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        false,
        ['decrypt']
      );

      this.keyPairs.set(keyId, privateKey);
      return privateKey;
    } catch (error) {
      console.error('Failed to load private key:', error);
      return null;
    }
  }

  /**
   * Import a public key from base64 string
   */
  async importPublicKey(publicKeyBase64, keyId) {
    try {
      if (this.importedPublicKeys.has(keyId)) {
        return this.importedPublicKeys.get(keyId);
      }

      const publicKeyBuffer = this.base64ToArrayBuffer(publicKeyBase64);
      const publicKey = await window.crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        false,
        ['encrypt']
      );

      this.importedPublicKeys.set(keyId, publicKey);
      return publicKey;
    } catch (error) {
      console.error('Failed to import public key:', error);
      throw new Error('Invalid public key format');
    }
  }

  /**
   * Generate a symmetric key for message encryption
   */
  async generateSymmetricKey() {
    return await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt a message with hybrid encryption (RSA + AES)
   */
  async encryptMessage(message, recipientPublicKeyBase64, recipientKeyId) {
    try {
      // Generate symmetric key
      const symmetricKey = await this.generateSymmetricKey();
      
      // Generate IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt message with symmetric key
      const messageBuffer = new TextEncoder().encode(message);
      const encryptedMessage = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        symmetricKey,
        messageBuffer
      );

      // Export symmetric key
      const symmetricKeyBuffer = await window.crypto.subtle.exportKey('raw', symmetricKey);

      // Encrypt symmetric key with both sender and recipient public keys
      const recipientPublicKey = await this.importPublicKey(recipientPublicKeyBase64, recipientKeyId);
      const recipientEncryptedKey = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP'
        },
        recipientPublicKey,
        symmetricKeyBuffer
      );

      // For sender's copy, we need sender's public key
      const senderPrivateKey = await this.getCurrentPrivateKey();
      if (!senderPrivateKey) {
        throw new Error('Sender private key not found');
      }

      // Get sender's public key from the stored key pair
      const senderKeyId = localStorage.getItem('e2ee_current_key_id');
      const senderPublicKeyBase64 = await this.getSenderPublicKey();
      const senderPublicKey = await this.importPublicKey(senderPublicKeyBase64, senderKeyId);
      
      const senderEncryptedKey = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP'
        },
        senderPublicKey,
        symmetricKeyBuffer
      );

      return {
        encryptedContent: this.arrayBufferToBase64(encryptedMessage),
        encryptionMetadata: {
          senderEncryptedKey: this.arrayBufferToBase64(senderEncryptedKey),
          recipientEncryptedKey: this.arrayBufferToBase64(recipientEncryptedKey),
          iv: this.arrayBufferToBase64(iv),
          algorithm: 'AES-GCM'
        }
      };
    } catch (error) {
      console.error('Message encryption failed:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt a message
   */
  async decryptMessage(encryptedData, isRecipient = true) {
    try {
      const privateKey = await this.getCurrentPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found');
      }

      const { encryptedContent, encryptionMetadata } = encryptedData;
      
      // Decrypt the symmetric key
      const encryptedKeyBase64 = isRecipient 
        ? encryptionMetadata.recipientEncryptedKey 
        : encryptionMetadata.senderEncryptedKey;
      
      const encryptedKeyBuffer = this.base64ToArrayBuffer(encryptedKeyBase64);
      const symmetricKeyBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP'
        },
        privateKey,
        encryptedKeyBuffer
      );

      // Import symmetric key
      const symmetricKey = await window.crypto.subtle.importKey(
        'raw',
        symmetricKeyBuffer,
        {
          name: 'AES-GCM'
        },
        false,
        ['decrypt']
      );

      // Decrypt message
      const iv = this.base64ToArrayBuffer(encryptionMetadata.iv);
      const encryptedMessageBuffer = this.base64ToArrayBuffer(encryptedContent);
      
      const decryptedMessageBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        symmetricKey,
        encryptedMessageBuffer
      );

      return new TextDecoder().decode(decryptedMessageBuffer);
    } catch (error) {
      console.error('Message decryption failed:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Get sender's public key for encrypting their own copy
   */
  async getSenderPublicKey() {
    try {
      const keyId = localStorage.getItem('e2ee_current_key_id');
      if (!keyId) {
        throw new Error('No current key ID found');
      }
      
      const publicKey = localStorage.getItem(`e2ee_public_key_${keyId}`);
      if (!publicKey) {
        throw new Error('Public key not found for current key ID');
      }
      
      return publicKey;
    } catch (error) {
      console.error('Failed to get sender public key:', error);
      throw error;
    }
  }

  /**
   * Store public key locally
   */
  storePublicKey(keyId, publicKeyBase64) {
    localStorage.setItem(`e2ee_public_key_${keyId}`, publicKeyBase64);
  }

  /**
   * Utility: Convert ArrayBuffer to Base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Utility: Convert Base64 to ArrayBuffer
   */
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Generate a unique key ID
   */
  generateKeyId() {
    return 'key_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Check if E2EE is set up for current user
   */
  isE2EESetup() {
    const keyId = localStorage.getItem('e2ee_current_key_id');
    return !!keyId && !!localStorage.getItem(`e2ee_private_key_${keyId}`);
  }

  /**
   * Clear all stored keys (logout/reset)
   */
  clearKeys() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('e2ee_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    this.keyPairs.clear();
    this.importedPublicKeys.clear();
  }
}

// Global instance
window.e2eeCrypto = new E2EECrypto();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = E2EECrypto;
}