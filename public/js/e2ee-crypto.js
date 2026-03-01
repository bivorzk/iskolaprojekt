class E2EEKeyStore {
  constructor(dbName = 'e2ee_keys', storeName = 'keys') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
    this._ready = this._openDB();
  }

  _openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };
      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async _ensureDB() {
    if (!this.db) {
      await this._ready;
    }
    return this.db;
  }

  async getItem(key) {
    const db = await this._ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async setItem(key, value) {
    const db = await this._ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removeItem(key) {
    const db = await this._ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllKeys() {
    const db = await this._ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async clear() {
    const db = await this._ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

class E2EECrypto {
  constructor() {
    this.keyPairs = new Map();
    this.importedPublicKeys = new Map();
    this.debugMode = false;
    this.store = new E2EEKeyStore();
    this._migrated = this._migrateFromLocalStorage();
  }

  // One-time migration from localStorage to IndexedDB
  async _migrateFromLocalStorage() {
    try {
      await this.store._ensureDB();
      const currentKeyId = localStorage.getItem('e2ee_current_key_id');
      if (!currentKeyId) return;

      const existingKeyId = await this.store.getItem('e2ee_current_key_id');
      if (existingKeyId) return;

      console.log('Migrating E2EE keys from localStorage to IndexedDB...');

      const keysToMigrate = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('e2ee_')) {
          keysToMigrate.push({ key, value: localStorage.getItem(key) });
        }
      }

      for (const { key, value } of keysToMigrate) {
        await this.store.setItem(key, value);
        localStorage.removeItem(key);
      }

      console.log('Migrated ' + keysToMigrate.length + ' E2EE keys to IndexedDB');
    } catch (error) {
      console.warn('Migration from localStorage failed (non-critical):', error);
    }
  }

  async _ensureReady() {
    await this._migrated;
    await this.store._ensureDB();
  }

  async generateKeyPair() {
    try {
      await this._ensureReady();

      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256'
        },
        true,
        ['encrypt', 'decrypt']
      );

      const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
      const publicKeyBase64 = this.arrayBufferToBase64(publicKeyBuffer);

      const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const privateKeyBase64 = this.arrayBufferToBase64(privateKeyBuffer);

      const keyId = this.generateKeyId();
      await this.store.setItem('e2ee_private_key_' + keyId, privateKeyBase64);
      await this.store.setItem('e2ee_public_key_' + keyId, publicKeyBase64);
      await this.store.setItem('e2ee_current_key_id', keyId);

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
      await this._ensureReady();
      const keyId = await this.store.getItem('e2ee_current_key_id');
      if (!keyId) return null;

      const privateKeyBase64 = await this.store.getItem('e2ee_private_key_' + keyId);
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

  async importPublicKey(publicKeyBase64, keyId) {
    try {

      const cacheKey = keyId + ':' + publicKeyBase64.slice(-24);
      if (this.importedPublicKeys.has(cacheKey)) {
        return this.importedPublicKeys.get(cacheKey);
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

      this.importedPublicKeys.set(cacheKey, publicKey);
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
        { name: 'AES-GCM', iv: iv },
        symmetricKey,
        messageBuffer
      );

      const symmetricKeyBuffer = await window.crypto.subtle.exportKey('raw', symmetricKey);

      const recipientPublicKey = await this.importPublicKey(recipientPublicKeyBase64, recipientKeyId);
      const recipientEncryptedKey = await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        recipientPublicKey,
        symmetricKeyBuffer
      );

      const senderPrivateKey = await this.getCurrentPrivateKey();
      if (!senderPrivateKey) {
        throw new Error('Sender private key not found');
      }

      const senderKeyId = await this.store.getItem('e2ee_current_key_id');
      const senderPublicKeyBase64 = await this.getSenderPublicKey();
      const senderPublicKey = await this.importPublicKey(senderPublicKeyBase64, senderKeyId);

      const senderEncryptedKey = await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
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

  async decryptMessage(encryptedData, isRecipient) {
    if (isRecipient === undefined) isRecipient = true;
    var startTime = performance.now();

    try {
      if (this.debugMode) {
        console.log('=== DECRYPTION DEBUG ===');
        console.log('Is recipient:', isRecipient);
      }

      var privateKey = await this.getCurrentPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found');
      }

      var encryptedContent = encryptedData.encryptedContent;
      var encryptionMetadata = encryptedData.encryptionMetadata;

      if (!encryptedContent || !encryptionMetadata) {
        throw new Error('Missing required data: encryptedContent=' + !!encryptedContent + ', encryptionMetadata=' + !!encryptionMetadata);
      }

      var encryptedKeyBase64 = isRecipient
        ? encryptionMetadata.recipientEncryptedKey
        : encryptionMetadata.senderEncryptedKey;

      if (!encryptedKeyBase64) {
        throw new Error('Missing encrypted key for ' + (isRecipient ? 'recipient' : 'sender'));
      }

      var encryptedKeyBuffer = this.base64ToArrayBuffer(encryptedKeyBase64);

      var symmetricKeyBuffer;
      var decryptionSuccessful = false;
      var privateKeysToTry = [];

      var currentKeyId = await this.store.getItem('e2ee_current_key_id');
      privateKeysToTry.push({ key: privateKey, keyId: currentKeyId });

      var allKeys = await this.store.getAllKeys();
      var otherKeyIds = [];
      for (var ki = 0; ki < allKeys.length; ki++) {
        var k = allKeys[ki];
        if (typeof k === 'string' && k.indexOf('e2ee_private_key_') === 0 && k !== 'e2ee_private_key_' + currentKeyId) {
          otherKeyIds.push(k.replace('e2ee_private_key_', ''));
        }
      }

      otherKeyIds.sort(function(a, b) {
        var timestampA = parseInt(a.split('_')[1]) || 0;
        var timestampB = parseInt(b.split('_')[1]) || 0;
        return timestampB - timestampA;
      });

      for (var oi = 0; oi < otherKeyIds.length; oi++) {
        var okId = otherKeyIds[oi];
        var privateKeyBase64 = await this.store.getItem('e2ee_private_key_' + okId);
        if (privateKeyBase64) {
          try {
            var privateKeyBuffer = this.base64ToArrayBuffer(privateKeyBase64);
            var privKey = await window.crypto.subtle.importKey(
              'pkcs8',
              privateKeyBuffer,
              { name: 'RSA-OAEP', hash: 'SHA-256' },
              false,
              ['decrypt']
            );
            privateKeysToTry.push({ key: privKey, keyId: okId });
          } catch (importError) {
            if (this.debugMode) {
              console.warn('Failed to import private key ' + okId + ':', importError);
            }
          }
        }
      }

      if (this.debugMode) {
        console.log('Trying decryption with ' + privateKeysToTry.length + ' keys');
      }

      var usedKeyId = null;
      for (var pi = 0; pi < privateKeysToTry.length; pi++) {
        var entry = privateKeysToTry[pi];
        try {
          symmetricKeyBuffer = await window.crypto.subtle.decrypt(
            { name: 'RSA-OAEP' },
            entry.key,
            encryptedKeyBuffer
          );
          usedKeyId = entry.keyId;
          decryptionSuccessful = true;

          if (this.debugMode && entry.keyId !== currentKeyId) {
            console.log('Successfully decrypted with different key ' + entry.keyId);
          }
          break;
        } catch (keyDecryptError) {
          if (this.debugMode) {
            console.log('Failed to decrypt with key ' + entry.keyId + ':', keyDecryptError.message);
          }
        }
      }

      if (!decryptionSuccessful) {
        var errorCount = this.getDecryptionErrorCount();
        var shouldLogError = this.debugMode || (errorCount < 5 && errorCount % 5 === 0);

        if (shouldLogError) {
          console.warn('=== E2EE Decryption Failed (' + (errorCount + 1) + ' total) ===');
          console.warn('Available keys tried:', privateKeysToTry.length);
          console.warn('Current key ID:', currentKeyId);
          console.warn('Message role:', isRecipient ? 'RECIPIENT' : 'SENDER');

          if (errorCount === 0) {
            console.warn('Tip: Use window.debugE2EE.enableDebug() for detailed logging');
          }
        }

        this.incrementDecryptionErrorCount();
        throw new Error('Symmetric key decryption failed with all available keys. This usually means the message was encrypted with a different public key.');
      }

      var symmetricKey = await window.crypto.subtle.importKey(
        'raw',
        symmetricKeyBuffer,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      var ivBuf = this.base64ToArrayBuffer(encryptionMetadata.iv);
      var encryptedMessageBuffer = this.base64ToArrayBuffer(encryptedContent);

      var decryptedMessageBuffer;
      try {
        decryptedMessageBuffer = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: ivBuf },
          symmetricKey,
          encryptedMessageBuffer
        );
      } catch (messageDecryptError) {
        console.error('Failed to decrypt message content:', messageDecryptError.message);
        throw new Error('Message content decryption failed: ' + messageDecryptError.message + '. The message may be corrupted.');
      }

      var decryptedText = new TextDecoder().decode(decryptedMessageBuffer);

      if (this.debugMode) {
        var elapsed = performance.now() - startTime;
        console.log('Message decrypted successfully in ' + elapsed.toFixed(2) + 'ms using key ' + usedKeyId);
      }

      return decryptedText;
    } catch (error) {
      if (this.debugMode || !error.message.includes('Symmetric key decryption failed')) {
        console.error('Message decryption failed:', error.message);
      }
      throw new Error('Failed to decrypt message: ' + error.message);
    }
  }

  async reEncryptKeyForSender(messageData, senderPublicKeyBase64, senderKeyId) {
    // Called by RECIPIENT to help a sender whose new device can't decrypt their
    // own senderEncryptedKey. We decrypt recipientEncryptedKey (which we can do),
    // then re-encrypt the raw AES symmetric key with the sender's new public key.
    const { encryptionMetadata } = messageData;
    const encryptedKeyBuf = this.base64ToArrayBuffer(encryptionMetadata.recipientEncryptedKey);

    // Try all stored private keys (handles key rotation)
    const allKeys = await this.store.getAllKeys();
    const currentKeyId = await this.store.getItem('e2ee_current_key_id');
    const keyIds = [];
    // current key first
    if (currentKeyId) keyIds.push(currentKeyId);
    for (const k of allKeys) {
      if (typeof k === 'string' && k.startsWith('e2ee_private_key_')) {
        const id = k.replace('e2ee_private_key_', '');
        if (!keyIds.includes(id)) keyIds.push(id);
      }
    }

    let symmetricKeyBuf = null;
    for (const kId of keyIds) {
      try {
        const privBase64 = await this.store.getItem('e2ee_private_key_' + kId);
        if (!privBase64) continue;
        const privBuf = this.base64ToArrayBuffer(privBase64);
        const privKey = await window.crypto.subtle.importKey(
          'pkcs8', privBuf,
          { name: 'RSA-OAEP', hash: 'SHA-256' },
          false, ['decrypt']
        );
        symmetricKeyBuf = await window.crypto.subtle.decrypt(
          { name: 'RSA-OAEP' }, privKey, encryptedKeyBuf
        );
        break;
      } catch (_) {}
    }
    if (!symmetricKeyBuf) {
      throw new Error('reEncryptKeyForSender: could not decrypt recipientEncryptedKey with any stored key');
    }

    const senderPubKey = await this.importPublicKey(senderPublicKeyBase64, senderKeyId);
    const newSenderEncryptedKey = await window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' }, senderPubKey, symmetricKeyBuf
    );
    return this.arrayBufferToBase64(newSenderEncryptedKey);
  }

  async getSenderPublicKey() {
    try {
      await this._ensureReady();
      var keyId = await this.store.getItem('e2ee_current_key_id');
      if (!keyId) {
        throw new Error('No current key ID found');
      }

      var publicKey = await this.store.getItem('e2ee_public_key_' + keyId);
      if (!publicKey) {
        throw new Error('Public key not found for current key ID');
      }

      return publicKey;
    } catch (error) {
      console.error('Failed to get sender public key:', error);
      throw error;
    }
  }

  async storePublicKey(keyId, publicKeyBase64) {
    await this._ensureReady();
    await this.store.setItem('e2ee_public_key_' + keyId, publicKeyBase64);
  }

  // --- Passphrase-based key backup for cross-device support ---

  async _deriveKeyFromPassphrase(passphrase, salt) {
    var encoder = new TextEncoder();
    var keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 600000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encryptPrivateKeyWithPassphrase(passphrase) {
    await this._ensureReady();

    var keyId = await this.store.getItem('e2ee_current_key_id');
    if (!keyId) throw new Error('No current key to backup');

    var privateKeyBase64 = await this.store.getItem('e2ee_private_key_' + keyId);
    var publicKeyBase64 = await this.store.getItem('e2ee_public_key_' + keyId);
    if (!privateKeyBase64 || !publicKeyBase64) throw new Error('Keys not found');

    var salt = window.crypto.getRandomValues(new Uint8Array(16));
    var iv = window.crypto.getRandomValues(new Uint8Array(12));
    var derivedKey = await this._deriveKeyFromPassphrase(passphrase, salt);

    var bundle = JSON.stringify({ privateKey: privateKeyBase64, publicKey: publicKeyBase64, keyId: keyId });
    var encoded = new TextEncoder().encode(bundle);

    var encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      derivedKey,
      encoded
    );

    return {
      encryptedPrivateKey: this.arrayBufferToBase64(encrypted),
      salt: this.arrayBufferToBase64(salt),
      iv: this.arrayBufferToBase64(iv)
    };
  }

  async decryptPrivateKeyWithPassphrase(encryptedBundle, salt, iv, passphrase) {
    var saltBuffer = this.base64ToArrayBuffer(salt);
    var ivBuffer = this.base64ToArrayBuffer(iv);
    var encryptedBuffer = this.base64ToArrayBuffer(encryptedBundle);

    var derivedKey = await this._deriveKeyFromPassphrase(passphrase, saltBuffer);

    var decrypted;
    try {
      decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBuffer },
        derivedKey,
        encryptedBuffer
      );
    } catch (e) {
      throw new Error('Wrong passphrase or corrupted backup');
    }

    var bundle = JSON.parse(new TextDecoder().decode(decrypted));

    await this._ensureReady();
    await this.store.setItem('e2ee_private_key_' + bundle.keyId, bundle.privateKey);
    await this.store.setItem('e2ee_public_key_' + bundle.keyId, bundle.publicKey);
    await this.store.setItem('e2ee_current_key_id', bundle.keyId);

    this.keyPairs.clear();
    this.importedPublicKeys.clear();
    await this.getCurrentPrivateKey();

    return {
      keyId: bundle.keyId,
      publicKey: bundle.publicKey,
      privateKey: bundle.privateKey
    };
  }

  // --- Utility helpers ---

  arrayBufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';
    for (var i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  generateKeyId() {
    return 'key_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async isE2EESetup() {
    await this._ensureReady();
    var keyId = await this.store.getItem('e2ee_current_key_id');
    if (!keyId) return false;
    var pk = await this.store.getItem('e2ee_private_key_' + keyId);
    return !!pk;
  }

  async versionKeys() {
    try {
      await this._ensureReady();
      var keyId = await this.store.getItem('e2ee_current_key_id');
      if (!keyId) throw new Error('No current key ID found for versioning');

      var privateKeyBase64 = await this.store.getItem('e2ee_private_key_' + keyId);
      var publicKeyBase64 = await this.store.getItem('e2ee_public_key_' + keyId);
      if (!privateKeyBase64 || !publicKeyBase64) throw new Error('Current keys not found for versioning');

      var newKeyId = this.generateKeyId();
      await this.store.setItem('e2ee_private_key_' + newKeyId, privateKeyBase64);
      await this.store.setItem('e2ee_public_key_' + newKeyId, publicKeyBase64);
      await this.store.setItem('e2ee_current_key_id', newKeyId);
      console.log('Keys versioned successfully. New key ID: ' + newKeyId);
      return newKeyId;
    } catch (error) {
      console.error('Key versioning failed:', error);
      throw new Error('Failed to version keys');
    }
  }

  async clearKeys() {
    await this._ensureReady();
    await this.store.clear();
    this.keyPairs.clear();
    this.importedPublicKeys.clear();
    console.log('All E2EE keys cleared');
  }

  async resetE2EE() {
    try {
      console.log('Resetting E2EE completely...');
      await this.clearKeys();

      try {
        await fetch('/chat/reset-e2ee', { method: 'POST' });
      } catch (error) {
        console.log('Server reset failed (continuing anyway):', error);
      }

      console.log('E2EE reset complete. Page will reload to re-setup.');
      window.location.reload();
      return true;
    } catch (error) {
      console.error('E2EE reset failed:', error);
      return false;
    }
  }

  async clearAllE2EEFromDatabase(clearMessages) {
    if (clearMessages === undefined) clearMessages = true;
    try {
      console.log('Clearing ALL E2EE data from database...');

      var response = await fetch('/chat/admin/clear-all-e2ee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearMessages: clearMessages })
      });

      if (!response.ok) {
        throw new Error('Server error: ' + response.status + ' ' + response.statusText);
      }

      var result = await response.json();
      console.log('Database clear result:', result);
      await this.clearKeys();

      alert('Success! Cleared ' + result.usersCleared + ' users and ' + result.messagesDeleted + ' messages. Page will reload.');
      window.location.reload();
      return result;
    } catch (error) {
      console.error('Failed to clear database E2EE:', error);
      alert('Failed to clear database: ' + error.message);
      return false;
    }
  }

  async debugKeys() {
    try {
      console.log('=== E2EE Key Debug ===');
      await this._ensureReady();

      var keyId = await this.store.getItem('e2ee_current_key_id');
      console.log('Current key ID:', keyId);

      if (!keyId) {
        console.error('No key ID found');
        return false;
      }

      var privateKeyBase64 = await this.store.getItem('e2ee_private_key_' + keyId);
      var publicKeyBase64 = await this.store.getItem('e2ee_public_key_' + keyId);

      console.log('Private key exists:', !!privateKeyBase64, 'Length:', privateKeyBase64 ? privateKeyBase64.length : 0);
      console.log('Public key exists:', !!publicKeyBase64, 'Length:', publicKeyBase64 ? publicKeyBase64.length : 0);

      var privateKey = await this.getCurrentPrivateKey();
      console.log('Private key loaded successfully:', !!privateKey);

      if (privateKey) {
        console.log('Private key algorithm:', privateKey.algorithm);
        console.log('Private key usages:', privateKey.usages);
      }

      if (publicKeyBase64) {
        var publicKey = await this.importPublicKey(publicKeyBase64, keyId);
        console.log('Public key imported successfully:', !!publicKey);

        if (publicKey) {
          console.log('Public key algorithm:', publicKey.algorithm);
          console.log('Public key usages:', publicKey.usages);
        }
      }

      console.log('Testing encryption/decryption cycle...');
      var testMessage = 'Hello, E2EE test!';
      var encrypted = await this.encryptMessage(testMessage, publicKeyBase64, keyId);
      console.log('Test encryption successful');

      var decrypted = await this.decryptMessage(encrypted, true);
      console.log('Test decryption successful:', decrypted === testMessage);
      console.log('Decrypted message:', decrypted);

      return true;
    } catch (error) {
      console.error('Key debug failed:', error);
      return false;
    }
  }

  getDecryptionErrorCount() {
    var key = 'e2ee_decrypt_errors';
    return parseInt(sessionStorage.getItem(key) || '0');
  }

  incrementDecryptionErrorCount() {
    var key = 'e2ee_decrypt_errors';
    var count = this.getDecryptionErrorCount() + 1;
    sessionStorage.setItem(key, count.toString());

    if (count === 10 && !this.debugMode) {
      console.warn('High number of decryption errors detected. Auto-enabling debug mode.');
      this.setDebugMode(true);
    }
  }

  resetDecryptionErrorCount() {
    var keysToRemove = [];
    for (var i = 0; i < sessionStorage.length; i++) {
      var key = sessionStorage.key(i);
      if (key && key.indexOf('e2ee_decrypt_errors') === 0) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(function(key) { sessionStorage.removeItem(key); });
    console.log('Decryption error counts reset');
  }

  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log('E2EE debug mode ' + (enabled ? 'enabled' : 'disabled'));

    if (enabled) {
      console.log('Debug commands:');
      console.log('  window.debugE2EE.status() - Current E2EE status');
      console.log('  window.debugE2EE.disableDebug() - Disable debug mode');
      console.log('  window.debugE2EE.resetErrorCount() - Reset error counts');
    }
  }
}

// Global instance
window.e2eeCrypto = new E2EECrypto();

window.debugE2EE = {
  checkKeys: function() { return window.e2eeCrypto.debugKeys(); },
  resetE2EE: function() { return window.e2eeCrypto.resetE2EE(); },
  clearKeys: function() { return window.e2eeCrypto.clearKeys(); },
  clearDatabase: function(clearMessages) { return window.e2eeCrypto.clearAllE2EEFromDatabase(clearMessages !== false); },
  enableDebug: function() { window.e2eeCrypto.setDebugMode(true); },
  disableDebug: function() { window.e2eeCrypto.setDebugMode(false); },
  resetErrorCount: function() { window.e2eeCrypto.resetDecryptionErrorCount(); },
  forceKeyRefresh: async function() {
    console.log('Forcing key refresh...');
    window.e2eeCrypto.resetDecryptionErrorCount();
    window.e2eeCrypto.keyPairs.clear();
    window.e2eeCrypto.importedPublicKeys.clear();
    console.log('Key caches cleared. Try your operation again.');
  },
  status: async function() {
    await window.e2eeCrypto._ensureReady();
    var keyId = await window.e2eeCrypto.store.getItem('e2ee_current_key_id');
    var hasPrivateKey = !!(await window.e2eeCrypto.store.getItem('e2ee_private_key_' + keyId));
    var hasPublicKey = !!(await window.e2eeCrypto.store.getItem('e2ee_public_key_' + keyId));
    var errorCount = window.e2eeCrypto.getDecryptionErrorCount();
    var allKeys = await window.e2eeCrypto.store.getAllKeys();

    var status = {
      isSetup: await window.e2eeCrypto.isE2EESetup(),
      keyId: keyId,
      hasPrivateKey: hasPrivateKey,
      hasPublicKey: hasPublicKey,
      debugMode: window.e2eeCrypto.debugMode,
      errorCount: errorCount,
      allLocalKeys: allKeys.filter(function(k) { return typeof k === 'string' && k.indexOf('e2ee_') === 0; }),
      recommendations: []
    };

    if (errorCount > 5) {
      status.recommendations.push('Consider running window.debugE2EE.resetE2EE() to fix persistent errors');
    }
    if (errorCount > 0 && !window.e2eeCrypto.debugMode) {
      status.recommendations.push('Run window.debugE2EE.enableDebug() for detailed error information');
    }
    if (status.allLocalKeys.length > 6) {
      status.recommendations.push('Multiple key versions detected - old messages may not decrypt');
    }

    console.table(status);
    return status;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = E2EECrypto;
}
