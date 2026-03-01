window.ChatAPI = {

  async getCurrentUser() {
    const response = await fetch('/api/current-user');
    if (!response.ok) return null;
    return response.json();
  },

  async loadConversations() {
    const response = await fetch('/chat/conversations');
    const data = await response.json();
    return data.conversations || [];
  },


  async loadMessages(otherUserId, currentUser) {
    const response = await fetch(`/chat/messages/${otherUserId}`);
    const data = await response.json();

    // Validate crypto is ready
    if (!window.e2eeCrypto || !(await window.e2eeCrypto.isE2EESetup())) {
      const safeMessages = data.messages.map(msg => ({
        ...msg,
        decryptedContent: '[E2EE not initialized - please refresh page]'
      }));
      return { messages: safeMessages, hasKeyMismatch: false };
    }

    let hasKeyMismatchError = false;
    let recentKeyMismatchCount = 0;
    let totalKeyMismatchCount = 0;
    let successfulDecryptions = 0;

    const decryptedMessages = await Promise.all(
      data.messages.map(async (message) => {
        try {
          const isRecipient = message.recipientId._id === currentUser.id;
          const isSender    = message.senderId._id === currentUser.id;

          if (!isRecipient && !isSender) {
            return { ...message, decryptedContent: '[Not authorized to decrypt]' };
          }
          if (!message.encryptedContent || !message.encryptionMetadata) {
            return { ...message, decryptedContent: '[Invalid message format]' };
          }

          const decryptedContent = await Promise.race([
            window.e2eeCrypto.decryptMessage(message, isRecipient),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Decryption timeout')), 5000))
          ]);
          successfulDecryptions++;
          return { ...message, decryptedContent };
        } catch (error) {
          if (error.message && error.message.includes('Symmetric key decryption failed')) {
            const messageAge = new Date() - new Date(message.createdAt);
            const isRecent   = messageAge < 24 * 60 * 60 * 1000;
            const isRecipient = message.recipientId._id === currentUser.id;
            totalKeyMismatchCount++;

            if (!isRecent) {
              return { ...message, decryptedContent: '[Message from previous encryption setup - cannot decrypt]' };
            }

            recentKeyMismatchCount++;

            if (isRecipient) {
              // Sender used a stale copy of our public key.
              // Flag for auto-resend — don't show a red error.
              return { ...message, decryptedContent: '[Wrong device key - ask sender to resend]', _needsResend: true };
            } else {
              // New device: senderEncryptedKey was encrypted with the old public key.
              // Request the recipient to re-encrypt the symmetric key for us.
              return { ...message, decryptedContent: '[Sent from another device — recovery in progress...]', _needsSenderRecovery: true };
            }
          } else if (error.message && error.message.includes('timeout')) {
            return { ...message, decryptedContent: '[Decryption timeout - server may be slow]' };
          } else {
            return { ...message, decryptedContent: '[Failed to decrypt - try refreshing]' };
          }
        }
      })
    );

    const totalMessages = data.messages.length;
    if (totalMessages > 0) {
      const failureRate = totalKeyMismatchCount / totalMessages;
      if (failureRate > 0.5 && recentKeyMismatchCount > 2) {
        try {
          window.e2eeCrypto.resetDecryptionErrorCount();
          window.e2eeCrypto.keyPairs && window.e2eeCrypto.keyPairs.clear();
          window.e2eeCrypto.importedPublicKeys && window.e2eeCrypto.importedPublicKeys.clear();
          const pubKey = await window.e2eeCrypto.getSenderPublicKey().catch(() => null);
          if (pubKey && window.E2EEApi) await window.E2EEApi.setupOnServer(pubKey).catch(() => {});
        } catch (err) {
          console.warn('Auto-recovery failed:', err);
        }
      }
      console.log(`Decryption: ${successfulDecryptions}/${totalMessages} ok, ${totalKeyMismatchCount} mismatches`);
    }

    // Collect messages that need transparent auto-resend
    const wrongDeviceMessages = decryptedMessages
      .filter(m => m._needsResend)
      .map(m => ({ _id: String(m._id), senderId: m.senderId._id || String(m.senderId) }));

    const senderRecoveryMessages = decryptedMessages
      .filter(m => m._needsSenderRecovery)
      .map(m => ({
        _id:                String(m._id),
        recipientId:        m.recipientId._id || String(m.recipientId),
        encryptedContent:   m.encryptedContent,
        encryptionMetadata: m.encryptionMetadata
      }));

    fetch(`/chat/messages/read/${otherUserId}`, { method: 'PUT' }).catch(err =>
      console.warn('Failed to mark messages as read:', err.message)
    );

    return { messages: decryptedMessages, hasKeyMismatch: hasKeyMismatchError, wrongDeviceMessages, senderRecoveryMessages };
  },

  async sendMessage(recipientId, plaintext) {
    try {
      // Fetch recipient public key with retry
      let keyData = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const keyResponse = await fetch(`/chat/public-key/${recipientId}`);
          if (!keyResponse.ok) throw new Error(`Server error: ${keyResponse.status}`);
          keyData = await keyResponse.json();
          break;
        } catch (err) {
          if (attempt === 3) throw new Error("Could not retrieve recipient's public key");
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
      if (!keyData || !keyData.publicKey) throw new Error('Invalid recipient public key received');

      // Encrypt with timeout
      const encryptedData = await Promise.race([
        window.e2eeCrypto.encryptMessage(plaintext, keyData.publicKey, recipientId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Encryption timeout')), 10000))
      ]);
      if (!encryptedData || !encryptedData.encryptedContent) {
        throw new Error('Encryption failed - invalid result');
      }

      // Send with retry
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch('/chat/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipientId,
              encryptedContent: encryptedData.encryptedContent,
              encryptionMetadata: encryptedData.encryptionMetadata,
              messageType: 'text'
            })
          });
          if (!response.ok) {
            const errData = await response.json();
            throw new Error(`Server error: ${response.status} - ${errData.error || 'Unknown'}`);
          }
          return { success: true };
        } catch (err) {
          if (attempt === 3) throw err;
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    } catch (error) {
      let userMessage = 'Failed to send message. ';
      if (error.message.includes('timeout')) {
        userMessage += 'The operation timed out. Please check your connection and try again.';
      } else if (error.message.includes('public key')) {
        userMessage += "Recipient's encryption key not available. They may need to refresh their page.";
      } else if (error.message.includes('Server error')) {
        userMessage += 'Server error occurred. Please try again in a moment.';
      } else {
        userMessage += 'Please try again or refresh the page if the problem persists.';
      }
      return { success: false, error: userMessage };
    }
  },

  async searchUsers(query) {
    if (!query.trim()) return { users: [] };
    try {
      const response = await fetch(`/chat/search-users?query=${encodeURIComponent(query)}`);
      if (response.status === 429) {
        window.location.href = '/429/429.html';
        return { users: [] };
      }
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const data = await response.json();
      return { users: data.users || [] };
    } catch (error) {
      return { users: [], error: 'Search failed. Please check your connection and try again.' };
    }
  }
};
