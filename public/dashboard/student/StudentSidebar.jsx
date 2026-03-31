const StudentSidebar = ({ activeSection, setActiveSection }) => {
    return (
        <aside className="hidden lg:block w-64 bg-white shadow-lg min-h-screen">
            <nav className="mt-8">
                <div className="px-4 space-y-2">
                    <button
                        onClick={() => setActiveSection('orders')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center ${
                            activeSection === 'orders'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        <span className="mr-3 text-lg">📋</span>
                        My Orders
                    </button>
                    <button
                        onClick={() => setActiveSection('wallet')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center ${
                            activeSection === 'wallet'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        <span className="mr-3 text-lg">💰</span>
                        Wallet
                    </button>
                    <button
                        onClick={() => setActiveSection('transactions')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center ${
                            activeSection === 'transactions'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        <span className="mr-3 text-lg">📊</span>
                        Transactions
                    </button>
                    <button
                        onClick={() => setActiveSection('loyalty')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center ${
                            activeSection === 'loyalty'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        <span className="mr-3 text-lg">⚡</span>
                        Loyalty Rewards
                    </button>
                    <button
                        onClick={() => setActiveSection('stats')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center ${
                            activeSection === 'stats'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        <span className="mr-3 text-lg">📈</span>
                        Statistics
                    </button>
                    <button
                        onClick={() => setActiveSection('settings')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center ${
                            activeSection === 'settings'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        <span className="mr-3 text-lg">⚙️</span>
                        Settings
                    </button>
                </div>
                
                <div className="px-4 mt-8">
                    <div className="border-t border-gray-200 pt-4 space-y-2">
                        <a
                            href="/Order"
                            className="w-full block text-center bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-secondary transition-colors"
                        >
                            🍽️ Order Food
                        </a>
                        <a
                            href="/chat"
                            className="w-full block text-center bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                        >
                            💬 Open Chat
                        </a>
                    </div>
                </div>
            </nav>
        </aside>
    );
};