window.Sidebar = ({
  conversations,
  activeConversation,
  showUserSearch,
  setShowUserSearch,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  onSearchChange,
  onStartConversation,
  onSelectConversation,
  socket
}) => (
  <div className="w-full md:w-[360px] md:max-w-[360px] bg-white border-r border-gray-200 flex flex-col min-h-screen md:min-h-0">
    {/* Header */}
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

    {showUserSearch && (
      <div className="p-4 border-b border-gray-200 bg-accent">
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              onSearchChange(e.target.value);
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
                onClick={() => onStartConversation(user)}
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
            onSearchChange('');
          }}
          className="mt-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    )}

    <div className="flex-1 overflow-y-auto pb-6">
      {conversations.map(conv => (
        <div
          key={conv._id}
          onClick={() => onSelectConversation(conv)}
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
);
