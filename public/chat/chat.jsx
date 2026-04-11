const { useState, useEffect, useRef } = React;

function getCsrfToken() {
  const c = document.cookie.split('; ').find(r => r.startsWith('XSRF-TOKEN='));
  return c ? decodeURIComponent(c.split('=')[1]) : '';
}

const E2EEChatApp = () => {
  const [isE2EESetup, setIsE2EESetup]           = useState(false);
  const [setupError, setSetupError]             = useState(null);
  const [keyMismatchError, setKeyMismatchError] = useState(false);
  const [loading, setLoading]                   = useState(true);
  const [needsKeyRestore, setNeedsKeyRestore]   = useState(false);
  const [needsNewDevice, setNeedsNewDevice]     = useState(false);
  const [needsPassphrase, setNeedsPassphrase]   = useState(false);

  const pendingResendsRef = useRef(new Set());
  const currentUserRef    = useRef(null);
  const activeConversationRef = useRef(null);
  const bcRef             = useRef(null);
  const [passphrase, setPassphrase]             = useState('');
  const [passphraseConfirm, setPassphraseConfirm] = useState('');
  const [passphraseError, setPassphraseError]   = useState('');
  const [restoringKeys, setRestoringKeys]       = useState(false);

  const [conversations, setConversations]           = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages]                     = useState({});
  const [newMessage, setNewMessage]                 = useState('');

  const [searchQuery, setSearchQuery]       = useState('');
  const [searchResults, setSearchResults]   = useState([]);
  const [isSearching, setIsSearching]       = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [isMobileView, setIsMobileView]     = useState(() => window.innerWidth < 768);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const [currentUser, setCurrentUser] = useState(null);
  const [socket, setSocket]           = useState(null);

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { activeConversationRef.current = activeConversation; }, [activeConversation]);

  useEffect(() => {
    initializeApp();
    window.addEventListener('error', handleGlobalCryptoError);
    return () => window.removeEventListener('error', handleGlobalCryptoError);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      if (!mobile) {
        setIsSidebarVisible(true);
      } else if (!activeConversationRef.current) {
        setIsSidebarVisible(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobileView && !activeConversation) {
      setIsSidebarVisible(true);
    }
  }, [activeConversation, isMobileView]);

  const handleGlobalCryptoError = (event) => {
    if (event.error?.message?.includes('crypto')) {
      console.error('Crypto operation failed:', event.error);
      try {
        window.e2eeCrypto?.resetDecryptionErrorCount();
        window.e2eeCrypto?.keyPairs?.clear();
        window.e2eeCrypto?.importedPublicKeys?.clear();
      } catch (err) {
        console.warn('Auto-recovery failed:', err);
      }
    }
  };

  useEffect(() => {
    return () => { socket && socket.disconnect(); };
  }, [socket]);
  
  useEffect(() => {
    if (!socket || !currentUser) return;

    const messageHandler = async (messageData) => {
      const isRecipient    = String(messageData.recipientId) === String(currentUser.id);
      const conversationId = isRecipient ? messageData.senderId : messageData.recipientId;

      let decryptedContent;
      try {
        decryptedContent = await window.e2eeCrypto.decryptMessage(messageData, isRecipient);
      } catch (error) {
        console.error('Failed to decrypt real-time message:', error);
        const isKeyMismatch = error.message?.includes('Symmetric key decryption failed');

        if (isKeyMismatch && isRecipient) {
          // Sender used a stale key — silently request a resend, don't surface error to user
          const msgId = String(messageData.messageId);
          if (!pendingResendsRef.current.has(msgId)) {
            pendingResendsRef.current.add(msgId);
            socket.emit('requestResend', { messageId: msgId, requesterId: currentUser.id });
          }
          // Also re-upload our current public key immediately so the sender
          // fetches the correct one on the next attempt
          window.e2eeCrypto.getSenderPublicKey().then(pk =>
            pk ? E2EEApi.setupOnServer(pk).catch(() => {}) : null
          ).catch(() => {});
          loadConversations();
          return; // don't add the undecryptable message to state
        }

        if (isKeyMismatch) {
          setKeyMismatchError(true);
          decryptedContent = '[Key mismatch - reset E2EE required]';
        } else {
          decryptedContent = '[Failed to decrypt - try refreshing]';
        }
      }

      const formattedMessage = {
        _id:         messageData.messageId,
        senderId:    { _id: messageData.senderId,    username: 'User' },
        recipientId: { _id: messageData.recipientId, username: currentUser.username },
        encryptedContent:   messageData.encryptedContent,
        encryptionMetadata: messageData.encryptionMetadata,
        messageType:        messageData.messageType,
        createdAt:          new Date(messageData.timestamp),
        decryptedContent,
        status: 'delivered'
      };

      setMessages(prev => {
        const existing = prev[conversationId] || [];
        if (existing.some(m => m._id === messageData.messageId)) return prev;
        return { ...prev, [conversationId]: [...existing, formattedMessage] };
      });

      loadConversations();
    };

    // Sender receives this when a recipient couldn’t decrypt their message.
    // Transparently re-encrypt with the recipient’s current public key and resend.
    const resendRequiredHandler = async ({ messageId, recipientId, encryptedContent, encryptionMetadata }) => {
      const id = String(messageId);
      // Dedup: skip if this tab already claimed it, or a sibling tab broadcast that it's handling it
      if (pendingResendsRef.current.has(id)) return;
      pendingResendsRef.current.add(id);
      // Tell ALL other tabs of this account to skip this resend job
      bcRef.current?.postMessage({ type: 'handling', messageId: id });
      try {
        const plaintext = await window.e2eeCrypto.decryptMessage(
          { encryptedContent, encryptionMetadata }, false
        );
        await ChatAPI.sendMessage(recipientId, plaintext);
        await fetch(`/chat/message/${id}/replace`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-xsrf-token': getCsrfToken() },
          body: JSON.stringify({ recipientId })
        }).catch(() => {});
      } catch (err) {
        console.warn('Auto-resend failed (non-critical):', err.message);
        pendingResendsRef.current.delete(id);
      }
    };

    // Both parties receive this when a message is marked as replaced — remove from UI
    const messageReplacedHandler = ({ messageId }) => {
      const id = String(messageId);
      pendingResendsRef.current.delete(id);
      setMessages(prev => {
        const next = { ...prev };
        for (const convId of Object.keys(next)) {
          next[convId] = next[convId].filter(m => String(m._id) !== id);
        }
        return next;
      });
    };


    const senderRecoveryNeededHandler = async () => {
      try {
        const pendingRes = await fetch('/chat/pending-recovery');
        if (!pendingRes.ok) return;
        const { requests } = await pendingRes.json();
        if (!requests || requests.length === 0) return;

        for (const req of requests) {
          try {
            const msgRes = await fetch(`/chat/message/${req.messageId}`);
            if (!msgRes.ok) continue;
            const msg = await msgRes.json();
            const newSenderEncryptedKey = await window.e2eeCrypto.reEncryptKeyForSender(
              msg, req.senderPublicKey, req.senderKeyId
            );
            await fetch(`/chat/message/${req.messageId}/update-sender-key`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-xsrf-token': getCsrfToken() },
              body: JSON.stringify({ newSenderEncryptedKey, requesterId: req.senderId })
            });
          } catch (recErr) {
            console.warn('Recovery processing failed for', req.messageId, ':', recErr.message);
            // Recipient can't decrypt either — mark as permanently failed
            if (recErr.message?.includes('could not decrypt recipientEncryptedKey')) {
              fetch(`/chat/message/${req.messageId}/recovery-failed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-xsrf-token': getCsrfToken() }
              }).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn('processPendingRecovery failed:', err.message);
      }
    };


    const senderKeyUpdatedHandler = async () => {
      // The server has patched senderEncryptedKey — reload the active conversation
      const conv = activeConversationRef.current;
      const user = currentUserRef.current;
      if (conv && user) {
        try {
          const { messages: decrypted } = await ChatAPI.loadMessages(conv._id, user);
          setMessages(prev => ({ ...prev, [conv._id]: decrypted }));
        } catch (err) {
          console.warn('senderKeyUpdated reload failed:', err.message);
        }
      }
    };

    socket.on('newMessage',           messageHandler);
    socket.on('resendRequired',        resendRequiredHandler);
    socket.on('messageReplaced',       messageReplacedHandler);
    socket.on('processPendingRecovery', senderRecoveryNeededHandler);
    socket.on('senderKeyUpdated',      senderKeyUpdatedHandler);


    const bc = new BroadcastChannel('e2ee_resend');
    bcRef.current = bc;
    bc.onmessage = (e) => {
      if (e.data?.type === 'handling') {
        pendingResendsRef.current.add(String(e.data.messageId));
      }
    };

    return () => {
      socket.off('newMessage',           messageHandler);
      socket.off('resendRequired',        resendRequiredHandler);
      socket.off('messageReplaced',       messageReplacedHandler);
      socket.off('processPendingRecovery', senderRecoveryNeededHandler);
      socket.off('senderKeyUpdated',      senderKeyUpdatedHandler);
      bc.close();
      bcRef.current = null;
    };
  }, [socket, currentUser]);

  useEffect(() => {
    if (activeConversation && isE2EESetup) {
      loadMessages(activeConversation._id);
    }
  }, [activeConversation, isE2EESetup]);
  
  const initializeApp = async () => {
    try {
    if (!window.isSecureContext) {
        throw new Error(
          'A secure connection (HTTPS) is required for end-to-end encryption. ' +
          'Please access this page via HTTPS. If you are on a local network, ' +
          'ask your administrator to enable HTTPS or use localhost. Thanks (@bivorzk)'
        );
      }
      if (!window.crypto?.subtle) {
        throw new Error('Your browser does not support the Web Crypto API. Please update your browser or use Chrome/Firefox/Safari.');
      }

      const userData = await ChatAPI.getCurrentUser();
      if (!userData) { window.location.href = '/login'; return; }
      setCurrentUser(userData);

      try {
        const newSocket = io({ transports: ['websocket', 'polling'], timeout: 10000, forceNew: true });
        newSocket.on('connect_error', err => console.warn('Socket error:', err));
        setSocket(newSocket);
        newSocket.emit('authenticate', userData.id);
      } catch (socketError) {
        console.warn('Socket.IO init failed:', socketError);
      }

      if (!window.e2eeCrypto) throw new Error('Encryption module failed to load. Please refresh the page.');

      const localKeysReady = await window.e2eeCrypto.isE2EESetup();

      if (localKeysReady) {
        setIsE2EESetup(true);
        await loadConversations();
        try {
          const pubKey = await window.e2eeCrypto.getSenderPublicKey();
          await E2EEApi.setupOnServer(pubKey);
        } catch (err) {
          console.log('Server E2EE re-setup failed, local keys exist:', err);
        }
        E2EEApi.checkAndRotateKey().catch(err =>
          console.warn('Key rotation check failed (non-critical):', err)
        );
      } else {
        try {
          const backupData = await E2EEApi.checkKeyBackup();
          if (backupData.hasBackup) {
            setNeedsKeyRestore(true);
            return;
          }
          if (backupData.isE2EEEnabled) {

            setNeedsNewDevice(true);
            return;
          }
        } catch (err) {
          console.warn('Could not check for key backup:', err);
        }
        // Genuinely first time — no server key at all
        setNeedsPassphrase(true);
      }
    } catch (error) {
      setSetupError(error.message || 'Failed to initialize chat. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };
  

  const loadConversations = async () => {
    try {
      const convs = await ChatAPI.loadConversations();
      setConversations(convs);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadMessages = async (otherUserId) => {
    try {
      const { messages: decrypted, hasKeyMismatch, wrongDeviceMessages, senderRecoveryMessages } =
        await ChatAPI.loadMessages(otherUserId, currentUser);

      if (hasKeyMismatch && !keyMismatchError) setKeyMismatchError(true);
      setMessages(prev => ({ ...prev, [otherUserId]: decrypted }));

      // For each message the sender encrypted with a stale key, silently request a resend.
      // The sender’s app will re-encrypt with our current public key and send a replacement.
      if (socket && wrongDeviceMessages?.length) {
        // Re-upload our key first so the sender fetches the correct one
        window.e2eeCrypto.getSenderPublicKey().then(pk =>
          pk ? E2EEApi.setupOnServer(pk).catch(() => {}) : null
        ).catch(() => {});

        for (const msg of wrongDeviceMessages) {
          const id = String(msg._id);
          if (!pendingResendsRef.current.has(id)) {
            pendingResendsRef.current.add(id);
            socket.emit('requestResend', { messageId: id, requesterId: currentUser.id });
          }
        }
      }
      // For each message we sent but can't decrypt on this new device, ask
      // the recipient to re-encrypt the symmetric key with our current public key.
      // (REST-based recovery was already queued in ChatAPI.loadMessages;
      //  socket emit is kept as an additional real-time nudge)
      if (socket && senderRecoveryMessages?.length) {
        for (const msg of senderRecoveryMessages) {
          socket.emit('requestSenderRecovery', {
            messageId:   msg._id,
            senderId:    currentUser.id,
            recipientId: msg.recipientId
          });
        }
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      alert('Failed to load messages. Please refresh the page or contact support.');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;
    if (!window.e2eeCrypto || !(await window.e2eeCrypto.isE2EESetup())) {
      alert('Encryption not available. Please refresh the page and try again.');
      return;
    }
    const result = await ChatAPI.sendMessage(activeConversation._id, newMessage);
    if (!result.success) { alert(result.error); return; }
    setNewMessage('');
    await Promise.all([loadMessages(activeConversation._id), loadConversations()]);
  };

  const searchUsers = async (query) => {
    if (!query.trim()) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    const { users, error } = await ChatAPI.searchUsers(query);
    if (error) alert(error);
    setSearchResults(users);
    setIsSearching(false);
  };

  const startConversation = async (user) => {
    setActiveConversation(user);
    if (isMobileView) {
      setIsSidebarVisible(false);
    }
    setShowUserSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    socket && socket.emit('joinConversation', user._id);
    await loadMessages(user._id);
  };

  const selectConversation = (conv) => {
    setActiveConversation(conv);
    if (isMobileView) {
      setIsSidebarVisible(false);
    }
    socket && socket.emit('joinConversation', conv._id);
    loadMessages(conv._id);
  };


  const handleFirstTimeSetup = async () => {
    if (!passphrase || passphrase.length < 6) {
      setPassphraseError('Passphrase must be at least 6 characters'); return;
    }
    if (passphrase !== passphraseConfirm) {
      setPassphraseError('Passphrases do not match'); return;
    }
    setPassphraseError('');
    setNeedsPassphrase(false);
    await runE2EESetup(passphrase);
  };

  const runE2EESetup = async (userPassphrase) => {
    setLoading(true);
    setSetupError(null);
    const result = await E2EEApi.setup(userPassphrase);
    if (result.alreadySetup || result.success) {
      setIsE2EESetup(true);
      await loadConversations();
      setTimeout(async () => {
        const ok = await window.e2eeCrypto.isE2EESetup();
        if (!ok) { setSetupError('Setup verification failed. Please refresh the page.'); setIsE2EESetup(false); }
      }, 1000);
    } else {
      setSetupError(result.error);
      setIsE2EESetup(false);
    }
    setLoading(false);
  };

  const handleRestoreKeys = async (userPassphrase) => {
    setRestoringKeys(true);
    setPassphraseError('');
    const result = await E2EEApi.restoreKeys(userPassphrase);
    if (result.success) {
      setNeedsKeyRestore(false);
      setPassphrase('');
      setIsE2EESetup(true);
      await loadConversations();
    } else {
      setPassphraseError(result.error);
    }
    setRestoringKeys(false);
  };

  const handleKeyMismatchRecover = async (conv) => {
    try {
      window.e2eeCrypto?.resetDecryptionErrorCount();
      window.e2eeCrypto?.keyPairs?.clear();
      window.e2eeCrypto?.importedPublicKeys?.clear();

      try {
        const pubKey = await window.e2eeCrypto?.getSenderPublicKey();
        if (pubKey) await E2EEApi.setupOnServer(pubKey);
      } catch (syncErr) {
        console.warn('Key re-sync failed (non-critical):', syncErr);
      }

      if (conv) await loadMessages(conv._id);
      setKeyMismatchError(false);
    } catch (err) {
      console.error('Quick recovery failed:', err);
    }
  };

  const handleKeyMismatchReset = async () => {
    if (confirm('This will generate new encryption keys. You will lose access to old messages but can send new ones. Continue?')) {
      await window.e2eeCrypto.resetE2EE();
    }
  };
  
  if (loading) return <LoadingScreen />;
  
  if (!isE2EESetup) {
    if (needsKeyRestore) {
      return (
        <KeyRestoreScreen
          passphrase={passphrase}
          setPassphrase={setPassphrase}
          passphraseError={passphraseError}
          restoringKeys={restoringKeys}
          onRestore={handleRestoreKeys}
          onSetupNew={() => { setNeedsKeyRestore(false); setNeedsPassphrase(true); setPassphrase(''); setPassphraseError(''); }}
        />
      );
    }
    if (needsNewDevice) {
      return (
        <NewDeviceScreen
          passphrase={passphrase}
          setPassphrase={setPassphrase}
          passphraseError={passphraseError}
          restoringKeys={restoringKeys}
          onRestore={handleRestoreKeys}
          onStartFresh={() => {
            setNeedsNewDevice(false);
            setNeedsPassphrase(true);
            setPassphrase('');
            setPassphraseError('');
          }}
        />
      );
    }
    if (needsPassphrase) {
      return (
        <FirstTimeSetupScreen
          passphrase={passphrase}
          setPassphrase={setPassphrase}
          passphraseConfirm={passphraseConfirm}
          setPassphraseConfirm={setPassphraseConfirm}
          passphraseError={passphraseError}
          onSetup={handleFirstTimeSetup}
        />
      );
    }
    return (
      <E2EESetupScreen
        setupError={setupError}
        onRetry={() => { setNeedsPassphrase(true); setSetupError(null); }}
      />
    );
  }
  
  const topOffset = keyMismatchError ? '80px' : '0';
  const showSidebar = !isMobileView || !activeConversation || isSidebarVisible;
  const showChatArea = !isMobileView || (activeConversation && !isSidebarVisible);

  return (
    <div className="min-h-screen bg-slate-100">
      {keyMismatchError && (
        <KeyMismatchBanner
          activeConversation={activeConversation}
          onRecover={handleKeyMismatchRecover}
          onReset={handleKeyMismatchReset}
          onDismiss={() => setKeyMismatchError(false)}
        />
      )}

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col md:flex-row">
        {showSidebar && (
          <div style={{ marginTop: topOffset }} className="flex w-full md:w-[360px] md:max-w-[360px] md:flex-shrink-0">
            <Sidebar
              conversations={conversations}
              activeConversation={activeConversation}
              showUserSearch={showUserSearch}
              setShowUserSearch={setShowUserSearch}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              isSearching={isSearching}
              onSearchChange={searchUsers}
              onStartConversation={startConversation}
              onSelectConversation={selectConversation}
              socket={socket}
            />
          </div>
        )}

        <div className={`${showChatArea ? 'flex' : 'hidden'} flex-1 flex-col md:flex`} style={{ marginTop: topOffset }}>
          <ChatArea
            activeConversation={activeConversation}
            messages={messages}
            currentUser={currentUser}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            onSend={sendMessage}
            onRecover={handleKeyMismatchRecover}
            onReset={handleKeyMismatchReset}
            showBackButton={isMobileView}
            onBack={() => setIsSidebarVisible(true)}
          />
        </div>
      </div>
    </div>
  );
};

window.E2EEChatApp = E2EEChatApp;
