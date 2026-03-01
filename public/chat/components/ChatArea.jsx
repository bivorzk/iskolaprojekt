const { useRef, useEffect } = React;

const InlineLockIcon = ({ extraClass = '' }) => (
  <svg className={`w-4 h-4 mr-2 ${extraClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const WarningIcon = ({ extraClass = '' }) => (
  <svg className={`w-4 h-4 mr-2 ${extraClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const MessageBubble = ({ message, currentUserId }) => {
  const isPrev        = MessageUtils.isPreviousKeyMessage(message.decryptedContent);
  const isError       = MessageUtils.isDecryptionError(message.decryptedContent);
  const isWrongDevice = MessageUtils.isWrongDeviceKey(message.decryptedContent);
  const isMine        = message.senderId._id === currentUserId;

  const bubbleClass = isPrev
    ? 'bg-gray-100 text-gray-500 border border-gray-300'
    : isWrongDevice
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : isError
        ? 'bg-red-100 text-red-700 border border-red-300'
        : isMine
          ? 'bg-primary text-white'
          : 'bg-gray-200 text-gray-800';

  const timeClass = isPrev || isError || isWrongDevice
    ? 'text-gray-400'
    : isMine ? 'text-orange-100' : 'text-gray-500';

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} message-bubble`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${bubbleClass}`}>
        {isPrev ? (
          <div className="flex items-center">
            <InlineLockIcon extraClass="text-gray-400" />
            <p className="break-words text-sm italic">Message encrypted with previous keys</p>
          </div>
        ) : isWrongDevice ? (
          <div className="flex items-start">
            <InlineLockIcon extraClass="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="break-words text-sm">Sent to a different device</p>
              <p className="text-xs text-amber-500 mt-0.5">Ask them to resend — your key has been updated</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex items-center">
            <WarningIcon extraClass="text-red-500" />
            <p className="break-words text-sm">Unable to decrypt message</p>
          </div>
        ) : (
          <p className="break-words">{message.decryptedContent}</p>
        )}
        <p className={`text-xs mt-1 ${timeClass}`}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

const ErrorGroupBubble = ({ message, currentUserId, onRecover, onReset }) => {
  const isMine = message.senderId._id === currentUserId;
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} message-bubble`}>
      <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200">
        <div className="flex items-center">
          <WarningIcon extraClass="text-red-500" />
          <div>
            <p className="break-words text-sm font-medium">
              {message.errorCount} messages couldn't be decrypted
            </p>
            <p className="text-xs text-red-500 mt-1">Key mismatch - try resetting E2EE</p>
          </div>
        </div>
        {(onRecover || onReset) && (
          <div className="flex gap-2 mt-2">
            {onRecover && (
              <button
                onClick={onRecover}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
              >
                Try Recovery
              </button>
            )}
            {onReset && (
              <button
                onClick={onReset}
                className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors"
              >
                Reset E2EE
              </button>
            )}
          </div>
        )}
        <p className="text-xs mt-2 text-red-400">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center text-gray-500">
      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
      <p>Choose a conversation to start secure messaging</p>
    </div>
  </div>
);

window.ChatArea = ({ activeConversation, messages, currentUser, newMessage, setNewMessage, onSend, onRecover, onReset }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation, messages]);

  if (!activeConversation) return <EmptyState />;

  const activeMessages = messages[activeConversation._id] || [];
  const groupedMessages = MessageUtils.groupMessages(activeMessages);
  const hasPrevKeyMessages = activeMessages.some(m =>
    MessageUtils.isPreviousKeyMessage(m.decryptedContent)
  );

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {groupedMessages.map(message =>
          message.isErrorGroup ? (
            <ErrorGroupBubble
              key={message._id}
              message={message}
              currentUserId={currentUser.id}
              onRecover={onRecover ? () => onRecover(activeConversation) : undefined}
              onReset={onReset}
            />
          ) : (
            <MessageBubble key={message._id} message={message} currentUserId={currentUser.id} />
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Type a secure message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && onSend()}
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <button
            onClick={onSend}
            disabled={!newMessage.trim()}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 flex items-center">
          🔒 Messages are end-to-end encrypted and cannot be read by anyone else
        </p>
        {hasPrevKeyMessages && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-xs text-blue-700">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Some messages were encrypted with previous keys and cannot be decrypted. This is normal after encryption resets.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
