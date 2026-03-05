const ParentHeader = ({ welcomeMessage, walletAmount }) => {
    return (
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="flex justify-between items-center py-4 w-full">
                <div className="flex items-center space-x-4 px-4 sm:px-6 lg:px-8">
                    <a href="/">
                        <svg viewBox="0 0 500 140" className="h-20 w-auto">
                            <rect x="25" y="55" width="90" height="50" rx="6" fill="#FF6B35"/>
                            <rect x="30" y="60" width="35" height="40" rx="3" fill="#FFE5DC"/>
                            <rect x="70" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                            <rect x="95" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                            <rect x="70" y="82" width="45" height="18" rx="3" fill="#FFE5DC"/>
                            <path d="M80 25 L65 52 L75 52 L60 80 L85 50 L75 50 L90 25 Z" fill="#FFC857" stroke="#FF6B35" strokeWidth="2" strokeLinejoin="round"/>
                            <text x="150" y="85" fontFamily="system-ui, -apple-system, sans-serif" fontSize="32" fontWeight="bold" fill="#FF6B35" letterSpacing="-1">SnapTray</text>
                            <text x="150" y="105" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fill="#6C757D" letterSpacing="2">PARENT PANEL</text>
                        </svg>
                    </a>
                </div>
                <div className="flex items-center space-x-4 pr-4 sm:pr-6 lg:pr-8">
                    <div className="text-right">
                        <div className="text-sm text-gray-600">Wallet Balance</div>
                        <div className="text-lg font-semibold text-primary">${walletAmount?.toFixed(2) || '0.00'}</div>
                    </div>
                    <span className="text-gray-700">{welcomeMessage || 'Welcome, Parent'}</span>
                    <a href="/logout" className="text-primary hover:text-secondary font-medium">Logout</a>
                </div>
            </div>
        </header>
    );
};


