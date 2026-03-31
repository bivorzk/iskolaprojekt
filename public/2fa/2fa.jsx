const { useState, useEffect, useRef } = React;

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

// ── TwoFAChallenge ────────────────────────────────────────────────────────────
const TwoFAChallenge = () => {
    const [code,   setCode]   = useState(null);
    const [token,  setToken]  = useState(null);
    const [status, setStatus] = useState('loading'); // loading | waiting | approved | expired | error
    const [dots,   setDots]   = useState('');
    const pollRef = useRef(null);
    const dotRef  = useRef(null);

    useEffect(() => {
        const storedCode  = sessionStorage.getItem('2fa_code');
        const storedToken = sessionStorage.getItem('2fa_token');

        if (!storedCode || !storedToken) {
            setStatus('error');
            return;
        }

        setCode(storedCode);
        setToken(storedToken);
        setStatus('waiting');

        // Animate the waiting dots
        dotRef.current = setInterval(() => {
            setDots(d => d.length >= 3 ? '' : d + '.');
        }, 500);

        // Poll for approval every 2 seconds
        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch('/2fa/status', {
                    headers: { 'Authorization': `Bearer ${storedToken}` },
                });

                if (res.status === 401) {
                    clearInterval(pollRef.current);
                    clearInterval(dotRef.current);
                    setStatus('expired');
                    return;
                }

                const data = await res.json();

                if (data.approved) {
                    clearInterval(pollRef.current);
                    clearInterval(dotRef.current);
                    sessionStorage.removeItem('2fa_code');
                    sessionStorage.removeItem('2fa_token');
                    setStatus('approved');
                    setTimeout(() => {
                        window.location.href = data.redirect || '/dashboard/student';
                    }, 1200);
                } else if (data.expired) {
                    clearInterval(pollRef.current);
                    clearInterval(dotRef.current);
                    setStatus('expired');
                }
            } catch {
                // Network hiccup — keep polling
            }
        }, 2000);

        return () => {
            clearInterval(pollRef.current);
            clearInterval(dotRef.current);
        };
    }, []);

    const handleCancel = () => {
        clearInterval(pollRef.current);
        clearInterval(dotRef.current);
        sessionStorage.removeItem('2fa_code');
        sessionStorage.removeItem('2fa_token');
        window.location.href = '/login';
    };

    // ── Approved ─────────────────────────────────────────────────────────────
    if (status === 'approved') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-accent to-white flex items-center justify-center py-12 px-4">
                <div className="text-center space-y-4">
                    <Logo />
                    <div className="bg-white shadow-2xl rounded-lg p-10 flex flex-col items-center">
                        <svg className="h-16 w-16 mb-4" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <p className="text-xl font-semibold text-gray-700">Login approved!</p>
                        <p className="text-sm text-gray-400 mt-1">Redirecting you now…</p>
                    </div>
                </div>
            </div>
        );
    }

    // ── Expired / Error ───────────────────────────────────────────────────────
    if (status === 'expired' || status === 'error') {
        const msg = status === 'expired'
            ? 'Your verification session has expired. Please log in again.'
            : 'No active verification session found. Please log in again.';
        return (
            <div className="min-h-screen bg-gradient-to-br from-accent to-white flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center"><Logo /></div>
                    <div className="bg-white shadow-2xl rounded-lg p-8 text-center space-y-4">
                        <svg className="mx-auto h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                        </svg>
                        <p className="text-gray-700 font-medium">{msg}</p>
                        <a href="/login"
                           className="inline-block w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary transition-colors duration-200 text-center">
                            Back to Login
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // ── Waiting (main view) ───────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-accent to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">

                <div className="text-center"><Logo /></div>

                <div className="bg-white shadow-2xl rounded-lg p-8 text-center space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Verify Your Identity</h2>
                        <p className="text-sm text-gray-400 mt-1">A sign-in attempt was detected for your account</p>
                    </div>

                    {/* Big number circle */}
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Your sign-in number</p>
                        <div
                            className="ring-pulse w-40 h-40 rounded-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #FFC857 100%)' }}
                        >
                            {code !== null && (
                                <span className="number-pop text-8xl font-black text-white select-none leading-none">
                                    {code}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Instruction */}
                    <div className="space-y-1">
                        <p className="text-lg font-semibold text-gray-800">
                            Match the number on the mobile app
                        </p>
                        <p className="text-sm text-gray-400">
                            Open the SnapTray app and tap the number that matches the one above to approve the sign-in.
                        </p>
                    </div>

                    {/* Spinner */}
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                        <svg className="spin h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        <span className="text-sm">Waiting for approval{dots}</span>
                    </div>

                    {/* Cancel */}
                    <button
                        onClick={handleCancel}
                        className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors duration-200"
                    >
                        Cancel — use a different account
                    </button>
                </div>

                <p className="text-center text-xs text-gray-400">
                    This page will expire in 25 minutes. Having trouble?{' '}
                    <a href="/login" className="text-primary hover:underline">Go back to login</a>.
                </p>
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<TwoFAChallenge />);
