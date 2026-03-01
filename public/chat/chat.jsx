const { useState, useEffect } = React;

const E2EEChatApp = () => {
  const [isE2EESetup, setIsE2EESetup]           = useState(false);
  const [setupError, setSetupError]             = useState(null);
  const [keyMismatchError, setKeyMismatchError] = useState(false);
  const [loading, setLoading]                   = useState(true);
  const [needsKeyRestore, setNeedsKeyRestore]   = useState(false);
  const [needsPassphrase, setNeedsPassphrase]   = useState(false);
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

  const [currentUser, setCurrentUser] = useState(null);
  const [socket, setSocket]           = useState(null);

  useEffect(() => {
    initializeApp();
    window.addEventListener('error', handleGlobalCryptoError);
    return () => window.removeEventListener('error', handleGlobalCryptoError);
  }, []);

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
      try {
        const isRecipient = String(messageData.recipientId) === String(currentUser.id);
        const decryptedContent = await window.e2eeCrypto.decryptMessage(messageData, isRecipient);

        const formattedMessage = {
          _id: messageData.messageId,
          senderId:    { _id: messageData.senderId,    username: 'User' },
          recipientId: { _id: messageData.recipientId, username: currentUser.username },
          encryptedContent:   messageData.encryptedContent,
          encryptionMetadata: messageData.encryptionMetadata,
          messageType:        messageData.messageType,
          createdAt:          new Date(messageData.timestamp),
          decryptedContent,
          status: 'delivered'
        };

        const conversationId = isRecipient ? messageData.senderId : messageData.recipientId;

        setMessages(prev => {
          const existing = prev[conversationId] || [];
          if (existing.some(m => m._id === messageData.messageId)) return prev;
          return { ...prev, [conversationId]: [...existing, formattedMessage] };
        });
      } catch (error) {
        console.error('Failed to process real-time message:', error);
        if (error.message?.includes('Symmetric key decryption failed')) {
          setKeyMismatchError(true);
        }
      }
      loadConversations();
    };

    socket.on('newMessage', messageHandler);
    return () => socket.off('newMessage', messageHandler);
  }, [socket, currentUser]);

  useEffect(() => {
    if (activeConversation && isE2EESetup) {
      loadMessages(activeConversation._id);
    }
  }, [activeConversation, isE2EESetup]);
  
  const initializeApp = async () => {
    try {
      if (!window.crypto?.subtle) {
        throw new Error('Your browser does not support the required encryption features. Please use a modern browser.');
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
      } else {
        try {
          const backupData = await E2EEApi.checkKeyBackup();
          if (backupData.hasBackup) { setNeedsKeyRestore(true); return; }
        } catch (err) {
          console.warn('Could not check for key backup:', err);
        }
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
      const { messages: decrypted, hasKeyMismatch } = await ChatAPI.loadMessages(otherUserId, currentUser);
      if (hasKeyMismatch && !keyMismatchError) setKeyMismatchError(true);
      setMessages(prev => ({ ...prev, [otherUserId]: decrypted }));
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
    setShowUserSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    socket && socket.emit('joinConversation', user._id);
    await loadMessages(user._id);
  };

  const selectConversation = (conv) => {
    setActiveConversation(conv);
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

  return (
    <div className="min-h-screen flex">
      {keyMismatchError && (
        <KeyMismatchBanner
          activeConversation={activeConversation}
          onRecover={handleKeyMismatchRecover}
          onReset={handleKeyMismatchReset}
          onDismiss={() => setKeyMismatchError(false)}
        />
      )}

      <div style={{ marginTop: topOffset }} className="w-1/3 flex">
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

      <div className="flex-1 flex flex-col" style={{ marginTop: topOffset }}>
        <ChatArea
          activeConversation={activeConversation}
          messages={messages}
          currentUser={currentUser}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSend={sendMessage}
        />
      </div>
    </div>
  );
};

window.E2EEChatApp = E2EEChatApp;
