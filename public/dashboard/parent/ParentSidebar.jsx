const ParentSidebar = ({ activeSection, setActiveSection }) => {
    return (
        <aside className="hidden lg:block w-64 bg-white shadow-lg min-h-screen">
            <nav className="mt-8">
                <div className="px-4 space-y-2">
                    <button
                        onClick={() => setActiveSection('students')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center ${
                            activeSection === 'students'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        <span className="mr-3 text-lg">👨‍👩‍👧‍👦</span>
                        My Students
                    </button>
                    <button
                        onClick={() => setActiveSection('orders')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center ${
                            activeSection === 'orders'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        <span className="mr-3 text-lg">📋</span>
                        Student Orders
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
            </nav>
        </aside>
    );
};



                    
