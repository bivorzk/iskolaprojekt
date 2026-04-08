const MobileStudentNav = ({ activeSection, setActiveSection }) => {
    const navItems = [
        { id: 'orders', label: 'Orders', icon: '📋' },
        { id: 'wallet', label: 'Wallet', icon: '💰' },
        { id: 'transactions', label: 'History', icon: '📊' },
        { id: 'loyalty', label: 'Rewards', icon: '⚡' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
        { id: 'chat', label: 'Chat', icon: '💬', href: '/chat' }
    ];

    return (
        <div className="lg:hidden dashboard-mobile-nav">
            <nav className="dashboard-mobile-nav__scroller">
                {navItems.map((item) => {
                    const isActive = activeSection === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => item.href ? (window.location.href = item.href) : setActiveSection(item.id)}
                            className={`dashboard-mobile-nav__item flex flex-col items-center justify-center rounded-2xl px-3 py-2.5 text-xs font-medium transition-all ${
                                isActive
                                    ? 'bg-accent text-primary shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                            }`}
                        >
                            <div className={`text-xl transition-transform ${isActive ? 'scale-110' : ''}`}>
                                {item.icon}
                            </div>
                            <span className="mt-1 leading-none">{item.label}</span>
                            {isActive && (
                                <div className="absolute inset-x-4 -top-[1px] h-1 rounded-full bg-primary"></div>
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};