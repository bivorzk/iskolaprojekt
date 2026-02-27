class E2EECrypto {
  constructor() {
    this.keyPairs = new Map();
    this.importedPublicKeys = new Map(); 
  }

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

      const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
      const publicKeyBase64 = this.arrayBufferToBase64(publicKeyBuffer);

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
  async encryptMessage(message, recipientPublicKeyBase64, recipientKeyId) {
    try {
      const symmetricKey = await this.generateSymmetricKey();
      
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      const messageBuffer = new TextEncoder().encode(message);
      const encryptedMessage = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        symmetricKey,
        messageBuffer
      );

      const symmetricKeyBuffer = await window.crypto.subtle.exportKey('raw', symmetricKey);

      const recipientPublicKey = await this.importPublicKey(recipientPublicKeyBase64, recipientKeyId);
      const recipientEncryptedKey = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP'
        },
        recipientPublicKey,
        symmetricKeyBuffer
      );

      const senderPrivateKey = await this.getCurrentPrivateKey();
      if (!senderPrivateKey) {
        throw new Error('Sender private key not found');
      }

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


  async decryptMessage(encryptedData, isRecipient = true) {
    try {
      console.log('Decrypting message with data:', encryptedData);
      console.log('Is recipient:', isRecipient);
      
      const privateKey = await this.getCurrentPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found');
      }
      console.log('Private key loaded successfully');

      const { encryptedContent, encryptionMetadata } = encryptedData;
      
      if (!encryptedContent || !encryptionMetadata) {
        throw new Error(`Missing required data: encryptedContent=${!!encryptedContent}, encryptionMetadata=${!!encryptionMetadata}`);
      }
      
      console.log('Encryption metadata:', encryptionMetadata);
      
      const encryptedKeyBase64 = isRecipient 
        ? encryptionMetadata.recipientEncryptedKey 
        : encryptionMetadata.senderEncryptedKey;
      
      console.log('Using encrypted key:', encryptedKeyBase64 ? 'present' : 'missing');
      
      if (!encryptedKeyBase64) {
        throw new Error(`Missing encrypted key for ${isRecipient ? 'recipient' : 'sender'}`);
      }
      
      console.log('Encrypted key base64 length:', encryptedKeyBase64.length);
      console.log('Encrypted key sample:', encryptedKeyBase64.substring(0, 50) + '...');
      
      const encryptedKeyBuffer = this.base64ToArrayBuffer(encryptedKeyBase64);
      console.log('Encrypted key buffer length:', encryptedKeyBuffer.byteLength);
      console.log('Decrypting symmetric key...');
      
      let symmetricKeyBuffer;
      try {
        symmetricKeyBuffer = await window.crypto.subtle.decrypt(
          {
            name: 'RSA-OAEP'
          },
          privateKey,
          encryptedKeyBuffer
        );
        console.log('Symmetric key decrypted successfully, length:', symmetricKeyBuffer.byteLength);
      } catch (keyDecryptError) {
        console.error('Failed to decrypt symmetric key:', keyDecryptError);
        console.error('Private key algorithm:', privateKey.algorithm);
        console.error('Private key usages:', privateKey.usages);
        throw new Error(`Symmetric key decryption failed: ${keyDecryptError.message}. This usually means the message was encrypted with a different public key.`);
      }

      const symmetricKey = await window.crypto.subtle.importKey(
        'raw',
        symmetricKeyBuffer,
        {
          name: 'AES-GCM'
        },
        false,
        ['decrypt']
      );
      console.log('Symmetric key imported successfully');

      const iv = this.base64ToArrayBuffer(encryptionMetadata.iv);
      const encryptedMessageBuffer = this.base64ToArrayBuffer(encryptedContent);
      
      console.log('IV length:', iv.byteLength, 'Expected: 12');
      console.log('Encrypted message buffer length:', encryptedMessageBuffer.byteLength);
      console.log('Encrypted content sample:', encryptedContent.substring(0, 50) + '...');
      
      console.log('Decrypting message content...');
      let decryptedMessageBuffer;
      try {
        decryptedMessageBuffer = await window.crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: iv
          },
          symmetricKey,
          encryptedMessageBuffer
        );
        console.log('Message content decrypted successfully, length:', decryptedMessageBuffer.byteLength);
      } catch (messageDecryptError) {
        console.error('Failed to decrypt message content:', messageDecryptError);
        throw new Error(`Message content decryption failed: ${messageDecryptError.message}. The message may be corrupted.`);
      }

      const decryptedText = new TextDecoder().decode(decryptedMessageBuffer);
      console.log('Message decrypted successfully:', decryptedText);
      return decryptedText;
    } catch (error) {
      console.error('Message decryption failed:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to decrypt message: ${error.message}`);
    }
  }

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
    console.log('All E2EE keys cleared');
  }

  /**
   * Reset E2EE completely - clear keys and force re-setup
   */
  async resetE2EE() {
    try {
      console.log('Resetting E2EE completely...');
      
      // Clear local keys
      this.clearKeys();
      
      // Notify server to disable E2EE
      try {
        await fetch('/chat/reset-e2ee', { method: 'POST' });
      } catch (error) {
        console.log('Server reset failed (continuing anyway):', error);
      }
      
      console.log('E2EE reset complete. Page will reload to re-setup.');
      
      // Reload page to start fresh
      window.location.reload();
      
      return true;
    } catch (error) {
      console.error('E2EE reset failed:', error);
      return false;
    }
  }

  /**
   * Admin function: Clear ALL E2EE data from database
   */
  async clearAllE2EEFromDatabase(clearMessages = true) {
    try {
      console.log('Clearing ALL E2EE data from database...');
      
      const response = await fetch('/chat/admin/clear-all-e2ee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clearMessages })
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Database clear result:', result);
      
      // Clear local keys too
      this.clearKeys();
      
      alert(`Success! Cleared ${result.usersCleared} users and ${result.messagesDeleted} messages. Page will reload.`);
      
      // Reload page
      window.location.reload();
      
      return result;
    } catch (error) {
      console.error('Failed to clear database E2EE:', error);
      alert(`Failed to clear database: ${error.message}`);
      return false;
    }
  }

  async debugKeys() {
    try {
      console.log('=== E2EE Key Debug ===');
      
      const keyId = localStorage.getItem('e2ee_current_key_id');
      console.log('Current key ID:', keyId);
      
      if (!keyId) {
        console.error('No key ID found');
        return false;
      }
      
      const privateKeyBase64 = localStorage.getItem(`e2ee_private_key_${keyId}`);
      const publicKeyBase64 = localStorage.getItem(`e2ee_public_key_${keyId}`);
      
      console.log('Private key exists:', !!privateKeyBase64, 'Length:', privateKeyBase64?.length);
      console.log('Public key exists:', !!publicKeyBase64, 'Length:', publicKeyBase64?.length);
      
      const privateKey = await this.getCurrentPrivateKey();
      console.log('Private key loaded successfully:', !!privateKey);
      
      if (privateKey) {
        console.log('Private key algorithm:', privateKey.algorithm);
        console.log('Private key usages:', privateKey.usages);
      }
      
      if (publicKeyBase64) {
        const publicKey = await this.importPublicKey(publicKeyBase64, keyId);
        console.log('Public key imported successfully:', !!publicKey);
        
        if (publicKey) {
          console.log('Public key algorithm:', publicKey.algorithm);
          console.log('Public key usages:', publicKey.usages);
        }
      }
      
      // Test encryption/decryption cycle
      console.log('Testing encryption/decryption cycle...');
      const testMessage = 'Hello, E2EE test!';
      const encrypted = await this.encryptMessage(testMessage, publicKeyBase64, keyId);
      console.log('Test encryption successful');
      
      const decrypted = await this.decryptMessage(encrypted, true);
      console.log('Test decryption successful:', decrypted === testMessage);
      console.log('Decrypted message:', decrypted);
      
      return true;
    } catch (error) {
      console.error('Key debug failed:', error);
      return false;
    }
  }
}

// Global instance
window.e2eeCrypto = new E2EECrypto();

window.debugE2EE = {
  checkKeys: () => window.e2eeCrypto.debugKeys(),
  resetE2EE: () => window.e2eeCrypto.resetE2EE(),
  clearKeys: () => window.e2eeCrypto.clearKeys(),
  clearDatabase: (clearMessages = true) => window.e2eeCrypto.clearAllE2EEFromDatabase(clearMessages),
  status: () => {
    const keyId = localStorage.getItem('e2ee_current_key_id');
    const hasPrivateKey = !!localStorage.getItem(`e2ee_private_key_${keyId}`);
    const hasPublicKey = !!localStorage.getItem(`e2ee_public_key_${keyId}`);
    return {
      isSetup: window.e2eeCrypto.isE2EESetup(),
      keyId,
      hasPrivateKey,
      hasPublicKey,
      localStorageKeys: Object.keys(localStorage).filter(k => k.startsWith('e2ee_'))
    };
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = E2EECrypto;
}