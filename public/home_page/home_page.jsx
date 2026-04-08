const MobileBrandLockup = () => (
    <div className="flex items-center gap-3">
        <svg viewBox="0 0 140 140" className="h-12 w-12 shrink-0" aria-hidden="true">
            <rect x="25" y="55" width="90" height="50" rx="6" fill="#FF6B35"/>
            <rect x="30" y="60" width="35" height="40" rx="3" fill="#FFE5DC"/>
            <rect x="70" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
            <rect x="95" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
            <rect x="70" y="82" width="45" height="18" rx="3" fill="#FFE5DC"/>
            <path d="M80 25 L65 52 L75 52 L60 80 L85 50 L75 50 L90 25 Z" fill="#FFC857" stroke="#FF6B35" strokeWidth="2" strokeLinejoin="round"/>
        </svg>
        <div className="min-w-0">
            <div className="text-2xl font-bold leading-none text-primary">SnapTray</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-gray-500">Cafeteria Ordering</div>
        </div>
    </div>
);

const HomePage = () => {
    const [isHeaderHidden, setIsHeaderHidden] = React.useState(false);

    React.useEffect(() => {
        let lastScrollY = window.scrollY;
        let ticking = false;

        const updateHeaderVisibility = () => {
            const currentScrollY = window.scrollY;
            const isCompactViewport = window.innerWidth < 640;

            if (!isCompactViewport || currentScrollY <= 24) {
                setIsHeaderHidden(false);
            } else if (currentScrollY > lastScrollY + 8) {
                setIsHeaderHidden(true);
            } else if (currentScrollY < lastScrollY - 8) {
                setIsHeaderHidden(false);
            }

            lastScrollY = currentScrollY;
            ticking = false;
        };

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(updateHeaderVisibility);
                ticking = true;
            }
        };

        const handleResize = () => {
            if (window.innerWidth >= 640) {
                setIsHeaderHidden(false);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-accent via-[#fff7f4] to-white">
            {/* Header */}
            <header className={`fixed inset-x-0 top-0 z-20 border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur transition-transform duration-300 ${isHeaderHidden ? '-translate-y-full' : 'translate-y-0'}`}>
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex justify-center sm:justify-start">
                            <a href="/" className="block sm:hidden">
                                <MobileBrandLockup />
                            </a>
                            <a href="/" className="hidden sm:block shrink-0">
                                <svg viewBox="0 0 500 140" className="h-16 sm:h-20 lg:h-20 w-auto shrink-0">
                                    <rect x="25" y="55" width="90" height="50" rx="6" fill="#FF6B35"/>
                                    <rect x="30" y="60" width="35" height="40" rx="3" fill="#FFE5DC"/>
                                    <rect x="70" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                                    <rect x="95" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                                    <rect x="70" y="82" width="45" height="18" rx="3" fill="#FFE5DC"/>
                                    <path d="M80 25 L65 52 L75 52 L60 80 L85 50 L75 50 L90 25 Z" fill="#FFC857" stroke="#FF6B35" strokeWidth="2" strokeLinejoin="round"/>
                                    <text x="150" y="85" fontFamily="system-ui, -apple-system, sans-serif" fontSize="32" fontWeight="bold" fill="#FF6B35" letterSpacing="-1">SnapTray</text>
                                    <text x="150" y="105" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fill="#6C757D" letterSpacing="2">CAFETERIA ORDERING</text>
                                </svg>
                            </a>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-4 w-full sm:w-auto">
                            <a href="/login" className="inline-flex items-center justify-center rounded-xl border border-primary/20 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-accent">
                                Login
                            </a>
                            <a href="/register" className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-200/70 transition-colors hover:bg-secondary">
                                Get Started
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="px-4 sm:px-6 lg:px-8 pt-32 pb-14 sm:pt-36 sm:pb-20 lg:pt-40">
                <div className="max-w-7xl mx-auto grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <div className="text-center lg:text-left">
                        <div className="inline-flex items-center rounded-full border border-primary/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-primary shadow-sm">
                            Cafeteria, without the queue
                        </div>
                        <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                            Meals, payments, and pickup built for busy school days.
                        </h1>
                        <p className="mt-5 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto lg:mx-0">
                            SnapTray keeps lunchtime moving on every screen. Browse the menu, order ahead, and manage your cafeteria routine without pinching or fighting the layout.
                        </p>
                        <div className="mt-8 grid gap-3 sm:grid-cols-2 max-w-xl mx-auto lg:mx-0">
                            <a
                                href="/Order/"
                                className="inline-flex items-center justify-center rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-white shadow-xl shadow-orange-200/70 transition-colors hover:bg-secondary"
                            >
                                Order Food Now
                            </a>
                            <a
                                href="/register"
                                className="inline-flex items-center justify-center rounded-2xl border-2 border-primary bg-white px-8 py-4 text-base font-semibold text-primary transition-colors hover:bg-accent"
                            >
                                Create Account
                            </a>
                        </div>
                        <div className="mt-8 grid grid-cols-3 gap-3 text-left">
                            <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
                                <div className="text-2xl font-bold text-primary">30s</div>
                                <div className="mt-1 text-sm text-gray-600">Average reorder flow</div>
                            </div>
                            <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
                                <div className="text-2xl font-bold text-primary">3x</div>
                                <div className="mt-1 text-sm text-gray-600">Faster pickup line</div>
                            </div>
                            <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
                                <div className="text-2xl font-bold text-primary">24/7</div>
                                <div className="mt-1 text-sm text-gray-600">Access on any device</div>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-x-8 top-6 h-40 rounded-full bg-secondary/30 blur-3xl"></div>
                        <div className="relative rounded-[2rem] border border-white/70 bg-white/90 p-5 sm:p-7 shadow-2xl shadow-orange-100">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                <div>
                                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-400">Today&apos;s Flow</p>
                                    <h2 className="mt-2 text-2xl font-bold text-gray-900">A mobile-first lunch routine</h2>
                                </div>
                                <div className="rounded-2xl bg-accent px-4 py-2 text-sm font-semibold text-primary">Live</div>
                            </div>
                            <div className="mt-5 space-y-4">
                                <div className="rounded-2xl bg-gradient-to-r from-primary to-secondary p-5 text-white shadow-lg">
                                    <p className="text-sm uppercase tracking-[0.28em] text-white/80">Pickup window</p>
                                    <p className="mt-2 text-3xl font-bold">12:10 PM</p>
                                    <p className="mt-2 text-sm text-white/85">Order before class ends, collect when the queue peaks.</p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-gray-100 bg-[#fff9f5] p-4">
                                        <div className="text-sm font-semibold text-primary">Smart menu filters</div>
                                        <p className="mt-2 text-sm text-gray-600">Search, category filtering, and fast add-to-cart controls sized for thumbs.</p>
                                    </div>
                                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                                        <div className="text-sm font-semibold text-primary">Wallet and rewards</div>
                                        <p className="mt-2 text-sm text-gray-600">Balance, discounts, and vouchers stay readable on narrow screens.</p>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-dashed border-primary/30 bg-white p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">Need the full experience?</p>
                                            <p className="mt-1 text-sm text-gray-600">Dashboards, ordering, and secure chat all adapt to phone layouts.</p>
                                        </div>
                                        <a href="/dashboard/student" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-black">
                                            Open Dashboard
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose SnapTray?</h2>
                        <p className="text-lg text-gray-600">Experience the future of cafeteria dining</p>
                    </div>
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="text-center p-6 rounded-2xl bg-[#fffaf7] border border-orange-100 shadow-sm">
                            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Lightning Fast</h3>
                            <p className="text-gray-600">Order and pay in seconds with our streamlined interface</p>
                        </div>
                        <div className="text-center p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Payments</h3>
                            <p className="text-gray-600">Multiple payment options including wallet, PayPal, and Google Pay</p>
                        </div>
                        <div className="text-center p-6 rounded-2xl bg-[#fffdf7] border border-yellow-100 shadow-sm">
                            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Fresh & Quality</h3>
                            <p className="text-gray-600">Carefully selected menu items with detailed nutritional information</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 bg-gradient-to-r from-primary to-secondary">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
                    <p className="text-xl text-white/90 mb-8">Join thousands of satisfied students and staff</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="/register"
                            className="bg-white text-primary px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors"
                        >
                            Sign Up Free
                        </a>
                        <a
                            href="/login"
                            className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/10 transition-colors"
                        >
                            Login
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid gap-8 md:grid-cols-4">
                        <div className="col-span-2">
                            <svg viewBox="0 0 500 140" className="h-16 sm:h-24 w-auto mb-4">
                                <rect x="25" y="55" width="90" height="50" rx="6" fill="#FF6B35"/>
                                <rect x="30" y="60" width="35" height="40" rx="3" fill="#FFE5DC"/>
                                <rect x="70" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                                <rect x="95" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                                <rect x="70" y="82" width="45" height="18" rx="3" fill="#FFE5DC"/>
                                <path d="M80 25 L65 52 L75 52 L60 80 L85 50 L75 50 L90 25 Z" fill="#FFC857" stroke="#FF6B35" strokeWidth="2" strokeLinejoin="round"/>
                                <text x="150" y="85" fontFamily="system-ui, -apple-system, sans-serif" fontSize="24" fontWeight="bold" fill="#FF6B35" letterSpacing="-1">SnapTray</text>
                                <text x="150" y="105" fontFamily="system-ui, -apple-system, sans-serif" fontSize="16" fill="#6C757D" letterSpacing="2">CAFETERIA ORDERING</text>
                            </svg>
                            <p className="text-gray-300">Making cafeteria dining convenient and enjoyable for everyone.</p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4 text-gray">Quick Links</h3>
                            <ul className="space-y-2">
                                <li><a href="/Order/" className="text-gray-300 hover:text-secondary transition-colors">Order Food</a></li>
                                <li><a href="/register" className="text-gray-300 hover:text-secondary transition-colors">Register</a></li>
                                <li><a href="/login" className="text-gray-300 hover:text-secondary transition-colors">Login</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4 text-white">Support</h3>
                            <ul className="space-y-2">
                                <li><a href="/dashboard/student/" className="text-gray-300 hover:text-secondary transition-colors">Student Dashboard</a></li>
                                <li><a href="/dashboard/admin" className="text-gray-300 hover:text-secondary transition-colors">Admin Dashboard</a></li>
                                <li><a href="/password-reset" className="text-gray-300 hover:text-secondary transition-colors">Reset Password</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-700 mt-8 pt-8 text-center">
                        <p className="text-gray-300">
                            © 2026 SnapTray. All rights reserved. |
                            <span className="text-secondary font-medium"> Cafeteria Ordering System</span>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

ReactDOM.render(<HomePage />, document.getElementById('root'));