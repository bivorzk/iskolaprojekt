const MobileAdminNav = ({ activeSection, setActiveSection }) => {
    const navItems = [
        { id: 'users', label: 'Users', icon: '👥' },
        { id: 'stats', label: 'Stats', icon: '📊' },
        { id: 'menu-items', label: 'Menu', icon: '🍽️' },
        { id: 'health', label: 'Health', icon: '🏥' },
        { id: 'settings', label: 'Settings', icon: '⚙️' }
    ];

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-lg">
            <nav className="flex justify-around items-center py-2">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`flex flex-col items-center justify-center p-3 min-w-0 flex-1 transition-all duration-200 ${
                            activeSection === item.id
                                ? 'text-primary bg-accent'
                                : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                        }`}
                    >
                        <div className={`text-xl mb-1 transition-transform ${
                            activeSection === item.id ? 'scale-110' : ''
                        }`}>
                            {item.icon}
                        </div>
                        <span className={`text-xs font-medium ${
                            activeSection === item.id ? 'text-primary' : 'text-gray-600'
                        }`}>
                            {item.label}
                        </span>
                        {activeSection === item.id && (
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-primary rounded-full"></div>
                        )}
                    </button>
                ))}
            </nav>
            
            {/* Quick Action Button */}
            <div className="absolute top-0 right-4 transform -translate-y-1/2">
                <button
                    onClick={() => setActiveSection('menu-items')}
                    className="bg-primary text-white p-3 rounded-full shadow-lg hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </button>
            </div>
        </div>
    );
};