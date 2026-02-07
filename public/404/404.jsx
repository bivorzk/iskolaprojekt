const { useState } = React;

const NotFoundPage = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-accent to-white flex flex-col">
            {/* Header */}
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
                                <text x="150" y="105" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fill="#6C757D" letterSpacing="2">CAFETERIA ORDERING</text>
                            </svg>
                        </a>
                    </div>
                    <div className="flex items-center space-x-4 pr-4 sm:pr-6 lg:pr-8">
                        <a href="/login" className="text-primary hover:text-secondary font-medium">Login</a>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
                <div className="max-w-lg w-full text-center">
                    <div className="mb-8">
                        <h1 className="text-9xl font-bold text-primary mb-4">404</h1>
                        <div className="w-24 h-1 bg-secondary mx-auto mb-6"></div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h2>
                        <p className="text-lg text-gray-600 mb-8">
                            Sorry, the page you are looking for doesn't exist or has been moved.
                        </p>
                    </div>


                    <div className="mb-8">
                        <svg className="mx-auto h-64 w-64 text-accent" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
                            <circle cx="12" cy="12" r="3" className="text-primary"/>
                            <path d="M12 7v5m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white" fill="none"/>
                        </svg>
                    </div>


                    <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
                        <a
                            href="/"
                            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                            </svg>
                            Go Home
                        </a>
                        <button
                            onClick={() => window.history.back()}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border-2 border-primary text-base font-medium rounded-md text-primary bg-transparent hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                            </svg>
                            Go Back
                        </button>
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-200">
                        <p className="text-sm text-gray-600 mb-4">Looking for something specific?</p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <a href="/order/" className="text-primary hover:text-secondary transition-colors">Order Food</a>
                            <a href="/register.html" className="text-primary hover:text-secondary transition-colors">Register</a>
                            <a href="/login" className="text-primary hover:text-secondary transition-colors">Login</a>
                            <a href="/dashboard/student/" className="text-primary hover:text-secondary transition-colors">Student Dashboard</a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <p className="text-sm text-gray-600">
                            © 2026 SnapTray. All rights reserved. | 
                            <span className="text-primary font-medium"> Cafeteria Ordering System</span>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

ReactDOM.render(<NotFoundPage />, document.getElementById('root'));