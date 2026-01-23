const Header = () => {
    return (
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                    <div className="flex items-center space-x-4">
                        <svg viewBox="0 0 500 140" className="h-20 w-auto">
                            <rect x="25" y="55" width="90" height="50" rx="6" fill="#FF6B35"/>
                            <rect x="30" y="60" width="35" height="40" rx="3" fill="#FFE5DC"/>
                            <rect x="70" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                            <rect x="95" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                            <rect x="70" y="82" width="45" height="18" rx="3" fill="#FFE5DC"/>
                            <path d="M80 25 L65 52 L75 52 L60 80 L85 50 L75 50 L90 25 Z" fill="#FFC857" stroke="#FF6B35" strokeWidth="2" strokeLinejoin="round"/>
                            <text x="150" y="85" fontFamily="system-ui, -apple-system, sans-serif" fontSize="32" fontWeight="bold" fill="#FF6B35" letterSpacing="-1">SnapTray</text>
                            <text x="150" y="105" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fill="#6C757D" letterSpacing="2">CAFETERIA ORDERING</text>
                        </svg>
                    </div>
                    <div className="flex items-center space-x-4">
                        <a href="/dashboard/student/" className="text-primary hover:text-secondary font-medium">Dashboard</a>
                        <a href="/logout" className="text-gray-700 hover:text-primary font-medium">Logout</a>
                    </div>
                </div>
            </div>
        </header>
    );
};