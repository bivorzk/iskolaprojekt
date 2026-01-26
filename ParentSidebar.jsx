const ParentSidebar = ({ activeSection, setActiveSection, isMobileMenuOpen, setIsMobileMenuOpen }) => {
    return (
        <aside className={`w-64 bg-white shadow-lg min-h-screen fixed md:relative z-50 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
            <nav className="mt-8">
                <div className="px-4 space-y-2">
                    <button
                        onClick={() => { setActiveSection('students'); setIsMobileMenuOpen(false); }}
                        className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                            activeSection === 'students'
                                ? 'bg-primary text-white'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        Students
                    </button>
                    <button
                        onClick={() => { setActiveSection('stats'); setIsMobileMenuOpen(false); }}
                        className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                            activeSection === 'stats'
                                ? 'bg-primary text-white'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        Statistics
                    </button>
                    <button
                        onClick={() => { setActiveSection('orders'); setIsMobileMenuOpen(false); }}
                        className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                            activeSection === 'orders'
                                ? 'bg-primary text-white'
                                : 'text-gray-700 hover:bg-accent hover:text-primary'
                        }`}
                    >
                        Orders
                    </button>
                    <button
                        onClick={() => { setActiveSection('settings'); setIsMobileMenuOpen(false); }}
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
