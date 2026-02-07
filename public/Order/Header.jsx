const Header = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    return (
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-3 sm:py-4">
                    <div className="flex items-center">
                        <a href="/">
                        <svg viewBox="0 0 500 140" className="h-12 sm:h-16 lg:h-20 w-auto">
                            <rect x="25" y="55" width="90" height="50" rx="6" fill="#FF6B35"/>
                            <rect x="30" y="60" width="35" height="40" rx="3" fill="#FFE5DC"/>
                            <rect x="70" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                            <rect x="95" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                            <rect x="70" y="82" width="45" height="18" rx="3" fill="#FFE5DC"/>
                            <path d="M80 25 L65 52 L75 52 L60 80 L85 50 L75 50 L90 25 Z" fill="#FFC857" stroke="#FF6B35" strokeWidth="2" strokeLinejoin="round"/>
                            <text x="150" y="85" fontFamily="system-ui, -apple-system, sans-serif" fontSize="32" fontWeight="bold" fill="#FF6B35" letterSpacing="-1">SnapTray</text>
                            <text x="150" y="105" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fill="#6C757D" letterSpacing="2" className="hidden sm:inline">CAFETERIA ORDERING</text>
                        </svg>
                        </a>
                    </div>
                    
                    {/* Desktop Menu */}
                    <div className="hidden sm:flex items-center space-x-6">
                        <a href="/dashboard/student/" className="text-primary hover:text-secondary font-medium transition-colors px-3 py-2 rounded-md">
                            Dashboard
                        </a>
                        <a href="/logout" className="text-gray-700 hover:text-primary font-medium transition-colors px-3 py-2 rounded-md">
                            Logout
                        </a>
                    </div>

                    {/* Mobile Menu Button */}
                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="sm:hidden p-2 rounded-md text-gray-700 hover:text-primary hover:bg-gray-100 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isMobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>
                
                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="sm:hidden border-t border-gray-200 py-3">
                        <div className="flex flex-col space-y-3">
                            <a 
                                href="/dashboard/student/" 
                                className="text-primary font-medium px-3 py-2 rounded-md hover:bg-primary hover:text-white transition-colors"
                            >
                                Dashboard
                            </a>
                            <a 
                                href="/logout" 
                                className="text-gray-700 font-medium px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                Logout
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};