// Mobile toast notification system for admin actions
const AdminMobileToast = () => {
    const [toasts, setToasts] = React.useState([]);

    React.useEffect(() => {
        const handleShowToast = (event) => {
            const { message, type = 'info', duration = 3000 } = event.detail;
            const id = Date.now();
            const newToast = { id, message, type };
            
            setToasts(current => [...current, newToast]);
            
            // Auto remove after specified duration
            setTimeout(() => {
                setToasts(current => current.filter(toast => toast.id !== id));
            }, duration);
        };

        window.addEventListener('showAdminToast', handleShowToast);
        return () => window.removeEventListener('showAdminToast', handleShowToast);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-20 left-4 right-4 z-50 space-y-2 lg:top-24 lg:right-6 lg:left-auto lg:w-80">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`transform transition-all duration-300 ease-out ${
                        toast.type === 'success' 
                            ? 'bg-green-500' 
                            : toast.type === 'error'
                            ? 'bg-red-500'
                            : toast.type === 'warning'
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                    } text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between animate-bounce`}
                    style={{ animationDuration: '0.5s', animationIterationCount: '1' }}
                >
                    <div className="flex items-center">
                        {toast.type === 'success' && (
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                        {toast.type === 'error' && (
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                        {toast.type === 'warning' && (
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        )}
                        {toast.type === 'info' && (
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        <span className="font-medium text-sm">{toast.message}</span>
                    </div>
                    <button
                        onClick={() => setToasts(current => current.filter(t => t.id !== toast.id))}
                        className="ml-3 hover:opacity-70 transition-opacity"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    );
};

// Helper functions to show admin toasts
window.showAdminToast = (message, type = 'info', duration = 3000) => {
    window.dispatchEvent(new CustomEvent('showAdminToast', {
        detail: { message, type, duration }
    }));
};

// Convenience methods
window.showAdminSuccess = (message) => window.showAdminToast(message, 'success');
window.showAdminError = (message) => window.showAdminToast(message, 'error');
window.showAdminWarning = (message) => window.showAdminToast(message, 'warning');
window.showAdminInfo = (message) => window.showAdminToast(message, 'info');