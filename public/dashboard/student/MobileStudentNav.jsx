const MobileStudentNav = ({ activeSection, setActiveSection }) => {
    const navItems = [
        { id: 'orders', label: 'Orders', icon: '📋' },
        { id: 'wallet', label: 'Wallet', icon: '💰' },
        { id: 'transactions', label: 'History', icon: '📊' },
        { id: 'loyalty', label: 'Rewards', icon: '⚡' },
        { id: 'settings', label: 'Settings', icon: '⚙️' }
    ];

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
            <nav className="flex justify-around items-center py-2">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`flex flex-col items-center justify-center p-2 min-w-0 flex-1 transition-colors ${
                            activeSection === item.id
                                ? 'text-primary'
                                : 'text-gray-600 hover:text-primary'
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
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>
                        )}
                    </button>
                ))}
            </nav>
        </div>
    );
};