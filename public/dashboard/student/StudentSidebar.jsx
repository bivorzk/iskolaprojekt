const StudentSidebar = ({ activeSection, setActiveSection }) => {
    return (
        <aside className="w-64 bg-white shadow-lg min-h-screen">
            <nav className="mt-8">
                <div className="px-4 space-y-2">
                    <button
                        onClick={() => setActiveSection('orders')}
                        className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                            activeSection === 'orders'
                                ? 'bg-primary text-white'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        My Orders
                    </button>
                    <button
                        onClick={() => setActiveSection('wallet')}
                        className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                            activeSection === 'wallet'
                                ? 'bg-primary text-white'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        Wallet
                    </button>
                    <button
                        onClick={() => setActiveSection('transactions')}
                        className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                            activeSection === 'transactions'
                                ? 'bg-primary text-white'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        Transactions
                    </button>
                    <button
                        onClick={() => setActiveSection('stats')}
                        className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                            activeSection === 'stats'
                                ? 'bg-primary text-white'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        Statistics
                    </button>
                    <button
                        onClick={() => setActiveSection('settings')}
                        className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                            activeSection === 'settings'
                                ? 'bg-primary text-white'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        Settings
                    </button>
                </div>
            </nav>
        </aside>
    );
};