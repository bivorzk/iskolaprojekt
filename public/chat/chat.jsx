const { useState, useEffect, useRef } = React;

// E2EE Chat Application
const E2EEChatApp = () => {
  const [isE2EESetup, setIsE2EESetup] = useState(false);
  const [setupError, setSetupError] = useState(null);
  const [keyMismatchError, setKeyMismatchError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState({}); // { [conversationId]: [messages] }
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [socket, setSocket] = useState(null);
  
  const messagesEndRef = useRef(null);
  
  // Initialize app
  useEffect(() => {
    initializeApp();
    
    // Production safety: Add global error handler for crypto operations
    window.addEventListener('error', (event) => {
      if (event.error && event.error.message && event.error.message.includes('crypto')) {
        console.error('Crypto operation failed:', event.error);
        // Auto-attempt recovery
        if (window.e2eeCrypto) {
          try {
            console.log('Attempting crypto error recovery...');
            window.e2eeCrypto.resetDecryptionErrorCount();
            window.e2eeCrypto.keyPairs && window.e2eeCrypto.keyPairs.clear();
            window.e2eeCrypto.importedPublicKeys && window.e2eeCrypto.importedPublicKeys.clear();
          } catch (recoveryError) {
            console.warn('Auto-recovery failed:', recoveryError);
          }
        }
      }
    });
    
    return () => {
      window.removeEventListener('error', () => {});
    };
  }, []);
  
  const getActiveMessages = () => {
    const activeMessages = activeConversation ? messages[activeConversation._id] || [] : [];
    return activeMessages;
  };
  
  // Group consecutive error messages for better UI
  const groupMessages = (messages) => {
    if (!messages.length) return [];
    
    const grouped = [];
    let errorGroup = [];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const isError = message.decryptedContent?.includes('[Key mismatch') || 
                     message.decryptedContent?.includes('[Failed to decrypt]');
      
      if (isError) {
        errorGroup.push(message);
      } else {
        // If we have accumulated errors, create a group
        if (errorGroup.length > 0) {
          if (errorGroup.length === 1) {
            grouped.push(errorGroup[0]);
          } else {
            grouped.push({
              _id: `error_group_${errorGroup[0]._id}`,
              isErrorGroup: true,
              errorCount: errorGroup.length,
              firstError: errorGroup[0],
              lastError: errorGroup[errorGroup.length - 1],
              senderId: errorGroup[0].senderId,
              createdAt: errorGroup[errorGroup.length - 1].createdAt
            });
          }
          errorGroup = [];
        }
        
        grouped.push(message);
      }
    }
    
    // Handle remaining errors at the end
    if (errorGroup.length > 0) {
      if (errorGroup.length === 1) {
        grouped.push(errorGroup[0]);
      } else {
        grouped.push({
          _id: `error_group_${errorGroup[0]._id}`,
          isErrorGroup: true,
          errorCount: errorGroup.length,
          firstError: errorGroup[0],
          lastError: errorGroup[errorGroup.length - 1],
          senderId: errorGroup[0].senderId,
          createdAt: errorGroup[errorGroup.length - 1].createdAt
        });
      }
    }
    
    return grouped;
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [activeConversation, messages]);
  
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);
  
  useEffect(() => {
    if (socket && currentUser) {          
      const messageHandler = async (messageData) => {
        
        try {
          // Determine if current user is recipient
          const isRecipient = String(messageData.recipientId) === String(currentUser.id);
          
          // Decrypt the message
          const decryptedContent = await window.e2eeCrypto.decryptMessage(messageData, isRecipient);
          
          // Format the message
          const formattedMessage = {
            _id: messageData.messageId,
            senderId: { 
              _id: messageData.senderId, 
              username: 'User' // Will be updated when conversation loads
            },
            recipientId: { 
              _id: messageData.recipientId, 
              username: currentUser.username 
            },
            encryptedContent: messageData.encryptedContent,
            encryptionMetadata: messageData.encryptionMetadata,
            messageType: messageData.messageType,
            createdAt: new Date(messageData.timestamp),
            decryptedContent,
            status: 'delivered'
          };
          
          // Determine conversation ID (other person's ID)
          const conversationId = isRecipient ? messageData.senderId : messageData.recipientId;
          
          // Add message to the correct conversation
          setMessages(prevMessages => {
            const currentConvMessages = prevMessages[conversationId] || [];
            
            // Check if message already exists
            const messageExists = currentConvMessages.some(msg => msg._id === messageData.messageId);
            if (messageExists) {
              return prevMessages;
            }
            
            const updatedMessages = {
              ...prevMessages,
              [conversationId]: [...currentConvMessages, formattedMessage]
            };
            
            
            return updatedMessages;
          });
          
          // Force re-render if this conversation is active
          if (activeConversation && String(activeConversation._id) === String(conversationId)) {
          }
          
        } catch (error) {
          console.error('Failed to process real-time message:', error);
          
          // Handle real-time message decryption failure
          if (error.message && error.message.includes('Symmetric key decryption failed')) {
            console.log('Real-time message key mismatch - likely current key issue');
            setKeyMismatchError(true);
          }
        }
        
        // Always update conversations list
        loadConversations();
      };
      
      socket.on('newMessage', messageHandler);
      
      return () => {
        socket.off('newMessage', messageHandler);
      };
    }
  }, [socket, currentUser]);
  
  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation && isE2EESetup) {
      loadMessages(activeConversation._id);
    }
  }, [activeConversation, isE2EESetup]);
  
  const initializeApp = async () => {
    try {
      // Production safety: Validate crypto support
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('Your browser does not support the required encryption features. Please use a modern browser.');
      }
      
      // Check current user session
      const userResponse = await fetch('/api/current-user');
      if (!userResponse.ok) {
        window.location.href = '/login';
        return;
      }
      
      const userData = await userResponse.json();
      setCurrentUser(userData);
      
      // Production safety: Initialize Socket.IO with better error handling
      try {
        const newSocket = io({
          transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
          timeout: 10000,
          forceNew: true
        });
        
        newSocket.on('connect_error', (error) => {
          console.warn('Socket connection error:', error);
          // Continue without real-time updates if socket fails
        });
        
        setSocket(newSocket);
        newSocket.emit('authenticate', userData.id);
      } catch (socketError) {
        console.warn('Socket.IO initialization failed:', socketError);
        // Continue without real-time updates
      }
      
      // Production safety: Check if E2EE crypto module is loaded
      if (!window.e2eeCrypto) {
        console.error('E2EE crypto module not loaded');
        throw new Error('Encryption module failed to load. Please refresh the page.');
      }
      
      const e2eeResponse = await fetch('/chat/e2ee-status');
      const e2eeStatus = await e2eeResponse.json();
      
      if (window.e2eeCrypto.isE2EESetup()) {
        setIsE2EESetup(true);
        await loadConversations();
        // Try to re-setup on server in case it was reset
        try {
          await setupE2EEOnServer();
        } catch (error) {
          console.log('Server E2EE re-setup failed, but local keys exist:', error);
        }
      } else {
        console.log('E2EE not setup, auto-enabling...');
        await setupE2EE();
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setSetupError(error.message || 'Failed to initialize chat. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };
  
  const setupE2EEOnServer = async () => {
    const senderPublicKeyBase64 = await window.e2eeCrypto.getSenderPublicKey();
    const response = await fetch('/chat/setup-e2ee', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        publicKey: senderPublicKeyBase64,
        keyAlgorithm: 'RSA-OAEP'
      })
    });
    if (!response.ok) {
      throw new Error('Failed to setup E2EE on server');
    }
  };
  
  const setupE2EE = async () => {
    try {
      setLoading(true);
      setSetupError(null);
      
      // Production safety: Check if already setup
      if (window.e2eeCrypto && window.e2eeCrypto.isE2EESetup()) {
        console.log('E2EE already setup, verifying server sync...');
        
        // Verify server has our public key
        try {
          const statusResponse = await fetch('/chat/e2ee-status');
          const statusData = await statusResponse.json();
          
          if (statusData.isEnabled && statusData.hasPublicKey) {
            setIsE2EESetup(true);
            await loadConversations();
            return;
          } else {
            console.log('Server missing E2EE setup, re-initializing...');
          }
        } catch (verifyError) {
          console.warn('Could not verify server E2EE status:', verifyError);
        }
      }
      
      console.log('Generating encryption keys...');
      
      // Production safety: Multiple attempts for key generation
      let keys = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Key generation attempt ${attempt}/3`);
          keys = await window.e2eeCrypto.generateKeyPair();
          if (keys && keys.publicKey) {
            window.e2eeCrypto.storePublicKey(keys.keyId, keys.publicKey);
            break;
          }
        } catch (error) {
          console.warn(`Key generation attempt ${attempt} failed:`, error);
          if (attempt === 3) throw error;
          
          // Clear any partially generated keys and wait before retry
          window.e2eeCrypto.clearKeys();
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      if (!keys) {
        throw new Error('Failed to generate encryption keys after multiple attempts');
      }
      
      console.log('Sending public key to server...');
      
      // Production safety: Retry server setup
      let serverSetup = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch('/chat/setup-e2ee', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              publicKey: keys.publicKey,
              keyAlgorithm: 'RSA-OAEP'
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Server error: ${response.status} - ${errorData.error || 'Unknown error'}`);
          }
          
          serverSetup = true;
          break;
        } catch (error) {
          console.warn(`Server setup attempt ${attempt} failed:`, error);
          if (attempt === 3) throw error;
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      if (!serverSetup) {
        throw new Error('Failed to setup E2EE on server after multiple attempts');
      }
      
      console.log('E2EE setup completed successfully!');
      setIsE2EESetup(true);
      await loadConversations();
      
      // Production safety: Verify setup worked
      setTimeout(async () => {
        if (!window.e2eeCrypto.isE2EESetup()) {
          console.error('E2EE setup verification failed');
          setSetupError('Setup verification failed. Please refresh the page.');
          setIsE2EESetup(false);
        }
      }, 1000);
      
    } catch (error) {
      console.error('E2EE setup failed:', error);
      
      // Production-friendly error messages
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
      
      setSetupError(userMessage);
      setIsE2EESetup(false);
    } finally {
      setLoading(false);
    }
  };
  
  const loadConversations = async () => {
    try {
      const response = await fetch('/chat/conversations');
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };
  
  const loadMessages = async (otherUserId) => {
    try {
      const response = await fetch(`/chat/messages/${otherUserId}`);
      const data = await response.json();
      
      // Production safety: Validate E2EE setup before attempting decryption
      if (!window.e2eeCrypto || !window.e2eeCrypto.isE2EESetup()) {
        console.warn('E2EE not properly initialized, attempting setup...');
        await initializeApp();
        
        // If still not setup, show all messages as encrypted
        if (!window.e2eeCrypto.isE2EESetup()) {
          const safeMessages = data.messages.map(message => ({
            ...message,
            decryptedContent: '[E2EE not initialized - please refresh page]'
          }));
          setMessages(prevMessages => ({
            ...prevMessages,
            [otherUserId]: safeMessages
          }));
          return;
        }
      }
      
      // Track decryption results to avoid spamming console and state updates
      let hasKeyMismatchError = false;
      let recentKeyMismatchCount = 0;
      let totalKeyMismatchCount = 0;
      let successfulDecryptions = 0;
      
      // Decrypt messages with enhanced error handling
      const decryptedMessages = await Promise.all(
        data.messages.map(async (message, index) => {
          try {
            const isRecipient = message.recipientId._id === currentUser.id;
            const isSender = message.senderId._id === currentUser.id;
            
            if (!isRecipient && !isSender) {
              console.warn(`Unauthorized access attempt for message ${message._id}`);
              return { ...message, decryptedContent: '[Not authorized to decrypt]' };
            }
            
            // Production safety: validate message structure
            if (!message.encryptedContent || !message.encryptionMetadata) {
              console.warn(`Invalid message structure for message ${message._id}`);
              return { ...message, decryptedContent: '[Invalid message format]' };
            }
            
            // Production safety: Add timeout for decryption
            const decryptionPromise = window.e2eeCrypto.decryptMessage(message, isRecipient);
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Decryption timeout')), 5000);
            });
            
            const decryptedContent = await Promise.race([decryptionPromise, timeoutPromise]);
            successfulDecryptions++;
            return { ...message, decryptedContent };
          } catch (error) {
            // Enhanced error classification for production
            if (error.message && error.message.includes('Symmetric key decryption failed')) {
              const messageAge = new Date() - new Date(message.createdAt);
              const isRecentMessage = messageAge < 24 * 60 * 60 * 1000; // Less than 24 hours old
              
              totalKeyMismatchCount++;
              
              if (isRecentMessage) {
                recentKeyMismatchCount++;
                hasKeyMismatchError = true;
                return { ...message, decryptedContent: '[Key mismatch - reset E2EE required]' };
              } else {
                // For older messages, assume they're from a previous key setup
                return { ...message, decryptedContent: '[Message from previous encryption setup - cannot decrypt]' };
              }
            } else if (error.message && error.message.includes('timeout')) {
              console.warn(`Decryption timeout for message ${message._id}`);
              return { ...message, decryptedContent: '[Decryption timeout - server may be slow]' };
            } else {
              // Other decryption errors
              console.warn(`Decryption failed for message ${message._id}:`, error.message);
              return { ...message, decryptedContent: '[Failed to decrypt - try refreshing]' };
            }
          }
        })
      );
      
      // Production safety: Auto-recovery if too many failures
      const totalMessages = data.messages.length;
      const failureRate = totalKeyMismatchCount / totalMessages;
      
      if (totalMessages > 0) {
        console.log(`Decryption summary: ${successfulDecryptions}/${totalMessages} successful, ${totalKeyMismatchCount} key mismatches (failure rate: ${(failureRate * 100).toFixed(1)}%)`);
        
        // If failure rate is too high and we have recent messages, something is wrong
        if (failureRate > 0.5 && recentKeyMismatchCount > 2) {
          console.warn('High failure rate detected - may need key refresh');
          
          // Auto-attempt recovery in production
          try {
            console.log('Attempting automatic key recovery...');
            window.e2eeCrypto.resetDecryptionErrorCount();
            // Clear key caches
            if (window.e2eeCrypto.keyPairs) {
              window.e2eeCrypto.keyPairs.clear();
            }
            if (window.e2eeCrypto.importedPublicKeys) {
              window.e2eeCrypto.importedPublicKeys.clear();
            }
          } catch (recoveryError) {
            console.warn('Auto-recovery failed:', recoveryError);
          }
        }
      }
      
      // Only set error state once if there are recent key mismatches
      if (hasKeyMismatchError && !keyMismatchError) {
        console.log('Setting key mismatch error state due to recent decryption failures');
        setKeyMismatchError(true);
      }
      
      setMessages(prevMessages => ({
        ...prevMessages,
        [otherUserId]: decryptedMessages
      }));
      
      // Mark messages as read
      try {
        await fetch(`/chat/messages/read/${otherUserId}`, { method: 'PUT' });
      } catch (readError) {
        console.warn('Failed to mark messages as read:', readError.message);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      // Show user-friendly error message
      alert('Failed to load messages. Please refresh the page or contact support.');
    }
  };
  
  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;
    
    // Production safety: Validate E2EE before sending
    if (!window.e2eeCrypto || !window.e2eeCrypto.isE2EESetup()) {
      console.error('E2EE not properly initialized for sending');
      alert('Encryption not available. Please refresh the page and try again.');
      return;
    }

    try {
      // Get recipient's public key with retry logic
      let keyData = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const keyResponse = await fetch(`/chat/public-key/${activeConversation._id}`);
          if (!keyResponse.ok) {
            throw new Error(`Server error: ${keyResponse.status}`);
          }
          keyData = await keyResponse.json();
          break;
        } catch (error) {
          console.warn(`Public key fetch attempt ${attempt} failed:`, error);
          if (attempt === 3) throw new Error('Could not retrieve recipient\'s public key');
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      if (!keyData || !keyData.publicKey) {
        throw new Error('Invalid recipient public key received');
      }

      // Encrypt message with timeout protection
      const encryptionPromise = window.e2eeCrypto.encryptMessage(
        newMessage,
        keyData.publicKey,
        activeConversation._id
      );
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Encryption timeout')), 10000);
      });
      
      const encryptedData = await Promise.race([encryptionPromise, timeoutPromise]);
      
      if (!encryptedData || !encryptedData.encryptedContent) {
        throw new Error('Encryption failed - invalid result');
      }

      // Send encrypted message with retry logic
      let messageSent = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch('/chat/send-message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              recipientId: activeConversation._id,
              encryptedContent: encryptedData.encryptedContent,
              encryptionMetadata: encryptedData.encryptionMetadata,
              messageType: 'text'
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Server error: ${response.status} - ${errorData.error || 'Unknown error'}`);
          }
          
          messageSent = true;
          break;
        } catch (error) {
          console.warn(`Message send attempt ${attempt} failed:`, error);
          if (attempt === 3) throw error;
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      if (!messageSent) {
        throw new Error('Failed to send message after multiple attempts');
      }

      // Clear input and refresh
      setNewMessage('');
      
      // Reload messages and conversations
      await Promise.all([
        loadMessages(activeConversation._id),
        loadConversations()
      ]);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Production-friendly error messages
      let userMessage = 'Failed to send message. ';
      if (error.message.includes('timeout')) {
        userMessage += 'The operation timed out. Please check your connection and try again.';
      } else if (error.message.includes('public key')) {
        userMessage += 'Recipient\'s encryption key not available. They may need to refresh their page.';
      } else if (error.message.includes('Server error')) {
        userMessage += 'Server error occurred. Please try again in a moment.';
      } else {
        userMessage += 'Please try again or refresh the page if the problem persists.';
      }
      
      alert(userMessage);
    }
  };
  
  const searchUsers = async (query) => {
    console.log('Searching for users with query:', query);
    
    if (!query.trim()) {
      console.log('Query is empty, clearing results');
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    try {
      setIsSearching(true);
      console.log('Making API call to /chat/search-users');
      const response = await fetch(`/chat/search-users?query=${encodeURIComponent(query)}`);
      console.log('Response status:', response.status);
      
      if (response.status === 429) {
        window.location.href = '/429/429.html';
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Search results:', data);
      setSearchResults(data.users || []);
    } catch (error) {
      console.error('Failed to search users:', error);
      alert('Search failed. Please check your connection and try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  const startConversation = async (user) => {
    setActiveConversation(user);
    setShowUserSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    
    // Join conversation room via socket
    if (socket) {
      socket.emit('joinConversation', user._id);
    }
    
    await loadMessages(user._id);
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading secure chat...</p>
        </div>
      </div>
    );
  }
  
  if (!isE2EESetup) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="encryption-indicator w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          
          {setupError ? (
            <>
              <h2 className="text-2xl font-bold text-red-600 mb-4">Setup Failed</h2>
              <p className="text-gray-600 mb-6">{setupError}</p>
              <button 
                onClick={setupE2EE}
                className="w-full bg-primary text-white py-3 px-6 rounded-lg hover:bg-orange-600 transition-colors font-medium mb-4"
              >
                Retry Setup
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-gray-500 text-white py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Refresh Page
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Setting up Secure Chat...</h2>
              <p className="text-gray-600 mb-6">
                Automatically enabling End-to-End Encryption for maximum privacy and security.
              </p>
              <div className="bg-accent p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">🔐 E2EE Auto-Setup</h3>
                <ul className="text-sm text-gray-600 text-left space-y-1">
                  <li>• Generating encryption keys automatically</li>
                  <li>• Messages will be encrypted on your device</li>
                  <li>• Server cannot read your messages</li>
                  <li>• Maximum privacy enabled by default</li>
                </ul>
              </div>
              {/* Production debugging info */}
              <div className="bg-blue-50 p-3 rounded-lg mb-4 text-xs text-blue-600">
                <p>Environment: {window.location.hostname === 'localhost' ? 'Development' : 'Production'}</p>
                <p>Crypto Support: {window.crypto && window.crypto.subtle ? 'Available' : 'Not Available'}</p>
              </div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-gray-500 mt-4">Please wait...</p>
            </>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex">
      {/* Key Mismatch Error Banner */}
      {keyMismatchError && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white p-4 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              <div>
                <p className="font-semibold">Encryption Key Issue Detected</p>
                <p className="text-sm">Some messages cannot be decrypted. This usually happens after key changes.</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={async () => {
                  try {
                    console.log('🔄 Attempting quick recovery...');
                    window.e2eeCrypto && window.e2eeCrypto.resetDecryptionErrorCount();
                    // Reload messages for current conversation
                    if (activeConversation) {
                      await loadMessages(activeConversation._id);
                    }
                    setKeyMismatchError(false);
                  } catch (error) {
                    console.error('Quick recovery failed:', error);
                  }
                }}
                className="bg-white text-red-500 px-4 py-2 rounded font-medium hover:bg-red-50 transition-colors"
              >
                Try Recovery
              </button>
              <button 
                onClick={async () => {
                  if (confirm('This will generate new encryption keys. You will lose access to old messages but can send new ones. Continue?')) {
                    await window.e2eeCrypto.resetE2EE();
                  }
                }}
                className="bg-red-400 text-white px-4 py-2 rounded font-medium hover:bg-red-600 transition-colors"
              >
                Reset E2EE
              </button>
              <button 
                onClick={() => setKeyMismatchError(false)}
                className="text-white hover:text-red-200 transition-colors"
                title="Dismiss warning"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sidebar */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col" style={{ marginTop: keyMismatchError ? '80px' : '0' }}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800">Secure Chat</h1>
            <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 encryption-indicator"></div>
              E2EE Active
            </div>
          </div>
          <button 
            onClick={() => setShowUserSearch(true)}
            className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors"
          >
            + Start New Chat
          </button>
        </div>
        
        {/* User Search Modal */}
        {showUserSearch && (
          <div className="p-4 border-b border-gray-200 bg-accent">
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="max-h-40 overflow-y-auto">
              {isSearching ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Searching...</p>
                </div>
              ) : searchQuery.trim() && searchResults.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-600">No users found with E2EE enabled</p>
                </div>
              ) : (
                searchResults.map(user => (
                  <div 
                    key={user._id}
                    onClick={() => startConversation(user)}
                    className="p-2 hover:bg-white rounded cursor-pointer flex items-center"
                  >
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm mr-3">
                      {user.username[0].toUpperCase()}
                    </div>
                    <span className="text-gray-800">{user.username}</span>
                    <div className="ml-auto text-xs text-green-600">🔐</div>
                  </div>
                ))
              )}
            </div>
            <button 
              onClick={() => {
                setShowUserSearch(false);
                setSearchQuery('');
                setSearchResults([]);
                setIsSearching(false);
              }}
              className="mt-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        )}
        
        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <div 
              key={conv._id}
              onClick={() => {
                setActiveConversation(conv);
                // Join conversation room via socket
                if (socket) {
                  socket.emit('joinConversation', conv._id);
                }
                loadMessages(conv._id);
              }}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                activeConversation?._id === conv._id ? 'bg-accent' : ''
              }`}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white mr-3">
                  {conv.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-800 truncate">{conv.username}</h3>
                    <div className="text-xs text-green-600">🔐</div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(conv.lastMessage.createdAt).toLocaleDateString()}
                  </p>
                  {conv.unreadCount > 0 && (
                    <div className="mt-1 bg-primary text-white text-xs px-2 py-1 rounded-full inline-block">
                      {conv.unreadCount} new
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col" style={{ marginTop: keyMismatchError ? '80px' : '0' }}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white mr-3">
                    {activeConversation.username[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-medium text-gray-800">{activeConversation.username}</h2>
                    <p className="text-sm text-green-600 flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-1 encryption-indicator"></span>
                      End-to-end encrypted
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {groupMessages(getActiveMessages()).map(message => {
                if (message.isErrorGroup) {
                  // Render grouped errors
                  return (
                    <div 
                      key={message._id}
                      className={`flex ${message.senderId._id === currentUser.id ? 'justify-end' : 'justify-start'} message-bubble`}
                    >
                      <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                          </svg>
                          <div>
                            <p className="break-words text-sm font-medium">
                              {message.errorCount} messages couldn't be decrypted
                            </p>
                            <p className="text-xs text-red-500 mt-1">
                              Key mismatch - try resetting E2EE
                            </p>
                          </div>
                        </div>
                        <p className="text-xs mt-2 text-red-400">
                          {new Date(message.createdAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  );
                }
                
                // Render normal messages
                return (
                  <div 
                    key={message._id}
                    className={`flex ${message.senderId._id === currentUser.id ? 'justify-end' : 'justify-start'} message-bubble`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.decryptedContent?.includes('[Message from previous encryption setup') 
                        ? 'bg-gray-100 text-gray-500 border border-gray-300' 
                        : message.decryptedContent?.includes('[Key mismatch') || message.decryptedContent?.includes('[Failed to decrypt]')
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : message.senderId._id === currentUser.id
                            ? 'bg-primary text-white'
                            : 'bg-gray-200 text-gray-800'
                    }`}>
                      {message.decryptedContent?.includes('[Message from previous encryption setup') ? (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                          </svg>
                          <p className="break-words text-sm italic">Message encrypted with previous keys</p>
                        </div>
                      ) : message.decryptedContent?.includes('[Key mismatch') || message.decryptedContent?.includes('[Failed to decrypt]') ? (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                          </svg>
                          <p className="break-words text-sm">Unable to decrypt message</p>
                        </div>
                      ) : (
                        <p className="break-words">{message.decryptedContent}</p>
                      )}
                      <p className={`text-xs mt-1 ${
                        message.decryptedContent?.includes('[Message from previous encryption setup') || 
                        message.decryptedContent?.includes('[Key mismatch') || 
                        message.decryptedContent?.includes('[Failed to decrypt]')
                          ? 'text-gray-400'
                          : message.senderId._id === currentUser.id ? 'text-orange-100' : 'text-gray-500'
                      }`}>
                        {new Date(message.createdAt).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex space-x-4">
                <input
                  type="text"
                  placeholder="Type a secure message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <button 
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center">
                🔒 Messages are end-to-end encrypted and cannot be read by anyone else
              </p>
              {/* Info about historical messages */}
              {getActiveMessages().some(msg => msg.decryptedContent?.includes('[Message from previous encryption setup')) && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center text-xs text-blue-700">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Some messages were encrypted with previous keys and cannot be decrypted. This is normal after encryption resets.</span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p>Choose a conversation to start secure messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Make component available globally
window.E2EEChatApp = E2EEChatApp;