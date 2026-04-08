const { useState } = React;

// ── Logo ─────────────────────────────────────────────────────────────────────
const Logo = () => (
    <a href="/">
        <svg viewBox="0 0 500 140" className="mx-auto h-20 w-auto">
            <rect x="25" y="55" width="90" height="50" rx="6" fill="#FF6B35"/>
            <rect x="30" y="60" width="35" height="40" rx="3" fill="#FFE5DC"/>
            <rect x="70" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
            <rect x="95" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
            <rect x="70" y="82" width="45" height="18" rx="3" fill="#FFE5DC"/>
            <path d="M80 25 L65 52 L75 52 L60 80 L85 50 L75 50 L90 25 Z"
                  fill="#FFC857" stroke="#FF6B35" strokeWidth="2" strokeLinejoin="round"/>
            <text x="150" y="85"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontSize="56" fontWeight="bold" fill="#FF6B35" letterSpacing="-1">SnapTray</text>
            <text x="150" y="110"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontSize="20" fill="#6C757D" letterSpacing="2">SCHOOL CAFETERIA ORDERING</text>
        </svg>
    </a>
);

// ── Login + ForgotPassword ────────────────────────────────────────────────────
const Login = () => {
    const [isLogin,    setIsLogin]    = useState(true);
    const [loginData,  setLoginData]  = useState({ username: '', password: '' });
    const [resetData,  setResetData]  = useState({ email: '' });
    const [loading,    setLoading]    = useState(false);
    const [message,    setMessage]    = useState({ text: '', type: '' });

    const handleLoginChange = (e) => {
        const { name, value } = e.target;
        setLoginData({ ...loginData, [name]: value });
    };

    const handleResetChange = (e) => {
        const { name, value } = e.target;
        setResetData({ ...resetData, [name]: value });
    };

    const getDashboardRoute = (usertype) => {
        switch (usertype) {
            case 'admin': return '/dashboard/admin';
            case 'editor': return '/dashboard/editor';
            case 'parent': return '/dashboard/parent';
            case 'teacher': return '/dashboard/teacher';
            default: return '/dashboard/student';
        }
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const response = await fetch('/login', {
                method:  'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body:    new URLSearchParams(loginData),
            });

            if (response.ok) {
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    const data = await response.json();
                    if (data.requires2FA) {
                        setMessage({ text: 'Initiating verification…', type: 'success' });
                        const twoFARes = await fetch('/2fa', {
                            method:  'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body:    new URLSearchParams({ email: data.email }),
                        });
                        if (twoFARes.ok) {
                            const twoFAData = await twoFARes.json();
                            sessionStorage.setItem('2fa_token', twoFAData.token);
                            sessionStorage.setItem('2fa_code',  String(twoFAData.code));
                            window.location.href = '/2fa';
                        } else if (twoFARes.status === 429) {
                            setMessage({ text: 'Too many attempts. Please wait a few minutes and try again.', type: 'error' });
                        } else {
                            const errText = await twoFARes.text().catch(() => '');
                            setMessage({ text: errText || '2FA initialization failed. Please try again.', type: 'error' });
                        }
                        return;
                    }
                }

                // Redirect based on role after successful login
                const userRes = await fetch('/api/current_user');
                if (userRes.ok) {
                    const userData = await userRes.json();
                    const redirectUrl = userData?.user?.usertype ? getDashboardRoute(userData.user.usertype) : '/dashboard/student';
                    setMessage({ text: 'Login successful! Redirecting…', type: 'success' });
                    setTimeout(() => { window.location.href = redirectUrl; }, 800);
                } else {
                    setMessage({ text: 'Login successful! Redirecting to student dashboard…', type: 'success' });
                    setTimeout(() => { window.location.href = '/dashboard/student'; }, 800);
                }
            } else {
                const text = await response.text();
                setMessage({ text, type: 'error' });
            }
        } catch {
            setMessage({ text: 'Login failed. Please try again.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const response = await fetch('/forgot-password', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(resetData),
            });
            const text = await response.text();
            if (response.ok) {
                setMessage({ text, type: 'success' });
                setResetData({ email: '' });
            } else {
                setMessage({ text, type: 'error' });
            }
        } catch {
            setMessage({ text: 'Error sending reset request. Please try again.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const switchToForgotPassword = () => { setIsLogin(false); setMessage({ text: '', type: '' }); };
    const switchToLogin          = () => { setIsLogin(true);  setResetData({ email: '' }); setMessage({ text: '', type: '' }); };

    return (
        <div className="min-h-screen bg-gradient-to-br from-accent to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">

                <div className="text-center"><Logo /></div>

                <div className="bg-white shadow-2xl rounded-lg p-8">

                    {isLogin ? (
                        <>
                            <h2 className="text-3xl font-bold text-center text-primary mb-8">Login</h2>

                            <form onSubmit={handleLoginSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
                                    <input
                                        type="text" id="username" name="username"
                                        value={loginData.username} onChange={handleLoginChange} required
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                                    <input
                                        type="password" id="password" name="password"
                                        value={loginData.password} onChange={handleLoginChange} required
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
                                    />
                                </div>
                                <button
                                    type="submit" disabled={loading}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                >
                                    {loading ? 'Logging in…' : 'Login'}
                                </button>
                            </form>

                            <div className="mt-6 text-center space-y-2">
                                <button onClick={switchToForgotPassword} className="text-sm text-primary hover:text-secondary font-medium">
                                    Forgot Password?
                                </button>
                                <div>
                                    Don't have an account?{' '}
                                    <a href="/register" className="text-sm text-gray-600 hover:text-primary">Register</a>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="text-3xl font-bold text-center text-primary mb-8">Reset Password</h2>
                            <p className="text-sm text-gray-600 text-center mb-6">
                                Enter your email address and we'll send you a link to reset your password.
                            </p>

                            <form onSubmit={handleResetSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email" id="resetEmail" name="email"
                                        value={resetData.email} onChange={handleResetChange} required
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <button
                                        type="submit" disabled={loading}
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                    >
                                        {loading ? 'Sending…' : 'Send Reset Link'}
                                    </button>
                                    <button
                                        type="button" onClick={switchToLogin}
                                        className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                    >
                                        Back to Login
                                    </button>
                                </div>
                            </form>
                        </>
                    )}

                    {message.text && (
                        <div className={`mt-6 p-4 rounded-md ${
                            message.type === 'success'
                                ? 'bg-green-50 border border-green-200 text-green-700'
                                : 'bg-red-50 border border-red-200 text-red-700'
                        }`}>
                            {message.text}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Login />);
