const AdminHeader = ({ welcomeMessage, isMobileMenuOpen, setIsMobileMenuOpen }) => {
    return (
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="flex justify-between items-center py-3 w-full px-3 sm:px-6 lg:px-8">
                <div className="flex items-center space-x-2 sm:space-x-4">
                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-1.5 rounded-md text-gray-700 hover:text-primary hover:bg-accent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <svg viewBox="0 0 500 140" className="h-20 w-auto">
                        <rect x="25" y="55" width="90" height="50" rx="6" fill="#FF6B35"/>
                        <rect x="30" y="60" width="35" height="40" rx="3" fill="#FFE5DC"/>
                        <rect x="70" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                        <rect x="95" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                        <rect x="70" y="82" width="45" height="18" rx="3" fill="#FFE5DC"/>
                        <path d="M80 25 L65 52 L75 52 L60 80 L85 50 L75 50 L90 25 Z" fill="#FFC857" stroke="#FF6B35" strokeWidth="2" strokeLinejoin="round"/>
                        <text x="150" y="85" fontFamily="system-ui, -apple-system, sans-serif" fontSize="32" fontWeight="bold" fill="#FF6B35" letterSpacing="-1">SnapTray</text>
                        <text x="150" y="105" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fill="#6C757D" letterSpacing="2">ADMIN PANEL</text>
                    </svg>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4">
                    <span className="hidden sm:inline text-sm sm:text-base text-gray-700 truncate max-w-32 sm:max-w-none">{welcomeMessage}</span>
                    <a href="/logout" className="text-sm sm:text-base text-primary hover:text-secondary font-medium whitespace-nowrap">Logout</a>
                </div>
            </div>
        </header>
    );
};