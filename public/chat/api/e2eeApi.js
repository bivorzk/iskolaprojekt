window.E2EEApi = {

  async checkStatus() {
    const response = await fetch('/chat/e2ee-status');
    return response.json();
  },

  async checkKeyBackup() {
    const response = await fetch('/chat/has-key-backup');
    if (!response.ok) throw new Error('Could not check for key backup');
    return response.json();
  },

  async setupOnServer(publicKeyBase64) {
    const response = await fetch('/chat/setup-e2ee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: publicKeyBase64, keyAlgorithm: 'RSA-OAEP' })
    });
    if (!response.ok) throw new Error('Failed to setup E2EE on server');
  },

  async setup(userPassphrase) {
    try {
      const alreadySetup = await window.e2eeCrypto.isE2EESetup();
      if (alreadySetup) {
        const statusData = await this.checkStatus().catch(() => null);
        if (statusData && statusData.isEnabled && statusData.hasPublicKey) {
          return { success: true, alreadySetup: true };
        }
      }

      let keys = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          keys = await window.e2eeCrypto.generateKeyPair();
          if (keys && keys.publicKey) {
            window.e2eeCrypto.storePublicKey(keys.keyId, keys.publicKey);
            break;
          }
        } catch (err) {
          if (attempt === 3) throw err;
          window.e2eeCrypto.clearKeys();
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
      if (!keys) throw new Error('Failed to generate encryption keys after multiple attempts');

      let serverSetup = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch('/chat/setup-e2ee', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicKey: keys.publicKey, keyAlgorithm: 'RSA-OAEP' })
          });
          if (!response.ok) {
            const err = await response.json();
            throw new Error(`Server error: ${response.status} - ${err.error || 'Unknown'}`);
          }
          serverSetup = true;
          break;
        } catch (err) {
          if (attempt === 3) throw err;
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
      if (!serverSetup) throw new Error('Failed to setup E2EE on server after multiple attempts');

      if (userPassphrase) {
        try {
          const backupData = await window.e2eeCrypto.encryptPrivateKeyWithPassphrase(userPassphrase);
          const backupRes = await fetch('/chat/backup-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backupData)
          });
          if (!backupRes.ok) {
            console.warn('Key backup failed, but E2EE is still active locally');
          }
        } catch (err) {
          console.warn('Key backup failed (non-critical):', err);
        }
      }

      return { success: true };
    } catch (error) {
      let userMessage = 'Setup failed: ';
      if (error.message.includes('timeout')) {
        userMessage += 'Connection timeout. Please check your internet and try again.';
      } else if (error.message.includes('Server error')) {
        userMessage += 'Server error. Please try again in a moment.';
      } else if (error.message.includes('generate')) {
        userMessage += 'Could not generate secure keys. Please refresh and try again.';
      } else {
        userMessage += error.message || 'Unknown error occurred. Please try again.';
      }
      return { success: false, error: userMessage };
    }
  },


  async restoreKeys(userPassphrase) {
    try {
      const response = await fetch('/chat/restore-keys');
      if (!response.ok) throw new Error('No key backup found on server');
      const { encryptedPrivateKey, salt, iv } = await response.json();

      await window.e2eeCrypto.decryptPrivateKeyWithPassphrase(
        encryptedPrivateKey, salt, iv, userPassphrase
      );

      const publicKeyBase64 = await window.e2eeCrypto.getSenderPublicKey();
      await this.setupOnServer(publicKeyBase64);

      return { success: true };
    } catch (error) {
      if (error.message.includes('Wrong passphrase')) {
        return { success: false, error: 'Wrong passphrase. Please try again.' };
      }
      return { success: false, error: 'Failed to restore keys: ' + error.message };
    }
  }
};
