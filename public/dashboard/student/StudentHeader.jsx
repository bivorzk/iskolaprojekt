const DashboardSwitcher = () => {
    const [open, setOpen] = React.useState(false);
    const dashboards = [
        { label: '🎓 Student Panel', href: '/dashboard/student' },
        { label: '👨\u200d👩\u200d👧\u200d👦 Parent Panel', href: '/dashboard/parent' },
        { label: '\u270f\ufe0f Editor Panel', href: '/dashboard/editor' },
    ];
    return (
        <div className="flex items-center gap-2">
            <a
                href="/dashboard/admin"
                className="flex items-center gap-1 bg-primary text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span className="hidden sm:inline">Admin</span>
            </a>
            <div className="relative">
                <button
                    onClick={() => setOpen(!open)}
                    className="flex items-center gap-1.5 bg-accent text-primary px-3 py-2 rounded-md text-sm font-medium hover:bg-orange-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                    <span className="hidden sm:inline">Switch</span>
                    <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {open && (
                    <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                        {dashboards.map(d => (
                            <a key={d.href} href={d.href} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-accent hover:text-primary transition-colors">{d.label}</a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const StudentHeader = ({ welcomeMessage, walletAmount, userData }) => {
    return (
        <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <a href="/" className="shrink-0">
                            <svg viewBox="0 0 500 140" className="h-16 sm:h-20 lg:h-20 w-auto shrink-0">
                                <rect x="25" y="55" width="90" height="50" rx="6" fill="#FF6B35"/>
                                <rect x="30" y="60" width="35" height="40" rx="3" fill="#FFE5DC"/>
                                <rect x="70" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                                <rect x="95" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                                <rect x="70" y="82" width="45" height="18" rx="3" fill="#FFE5DC"/>
                                <path d="M80 25 L65 52 L75 52 L60 80 L85 50 L75 50 L90 25 Z" fill="#FFC857" stroke="#FF6B35" strokeWidth="2" strokeLinejoin="round"/>
                                <text x="150" y="85" fontFamily="system-ui, -apple-system, sans-serif" fontSize="32" fontWeight="bold" fill="#FF6B35" letterSpacing="-1">SnapTray</text>
                                <text x="150" y="105" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fill="#6C757D" letterSpacing="2">STUDENT PANEL</text>
                            </svg>
                        </a>
                        <a href="/logout" className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary lg:hidden">
                            Logout
                        </a>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                        {userData?.usertype === 'admin' && <DashboardSwitcher />}
                        <div className="rounded-2xl bg-accent px-4 py-3 shadow-sm">
                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Wallet Balance</div>
                            <div className="mt-1 text-lg font-semibold text-primary">${walletAmount?.toFixed(2) || '0.00'}</div>
                        </div>
                        <span className="text-sm sm:text-base text-gray-700 truncate max-w-full sm:max-w-[18rem]">
                            {welcomeMessage || 'Welcome, Student'}
                        </span>
                        <a href="/logout" className="hidden lg:inline-flex items-center justify-center rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-accent">
                            Logout
                        </a>
                    </div>
                </div>
            </div>
        </header>
    );
};