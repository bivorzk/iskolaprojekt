const AdminSidebar = ({ activeSection, setActiveSection }) => {
    return (
        <aside className="hidden lg:block w-64 bg-white shadow-lg min-h-screen">
            <nav className="mt-8">
                <div className="px-4 space-y-2">
                    <button
                        onClick={() => setActiveSection('users')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center ${
                            activeSection === 'users'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        <span className="mr-3 text-lg">👥</span>
                        Users Management
                    </button>
                    <button
                        onClick={() => setActiveSection('stats')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center ${
                            activeSection === 'stats'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        <span className="mr-3 text-lg">📊</span>
                        Analytics & Stats
                    </button>
                    <button
                        onClick={() => setActiveSection('menu-items')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center ${
                            activeSection === 'menu-items'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        <span className="mr-3 text-lg">🍽️</span>
                        Menu Management
                    </button>
                    <button
                        onClick={() => setActiveSection('reports')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center ${
                            activeSection === 'reports'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        <span className="mr-3 text-lg">🛡️</span>
                        Reports & Moderation
                    </button>
                    <button
                        onClick={() => setActiveSection('rewards')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center ${
                            activeSection === 'rewards'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        <span className="mr-3 text-lg">🎁</span>
                        Reward Management
                    </button>
                    <button
                        onClick={() => setActiveSection('health')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center ${
                            activeSection === 'health'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        <span className="mr-3 text-lg">🏥</span>
                        System Health
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
                        System Settings
                    </button>
                </div>
                
                <div className="px-4 mt-8">
                    <div className="border-t border-gray-200 pt-4 space-y-2">
                        <a
                            href="/Order"
                            className="w-full block text-center bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-secondary transition-colors"
                        >
                            🛒 View Store
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