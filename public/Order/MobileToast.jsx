// Toast notification system for mobile feedback
const MobileToast = () => {
    const [toasts, setToasts] = React.useState([]);

    React.useEffect(() => {
        const handleShowToast = (event) => {
            const { message, type = 'success' } = event.detail;
            const id = Date.now();
            const newToast = { id, message, type };
            
            setToasts(current => [...current, newToast]);
            
            // Auto remove after 3 seconds
            setTimeout(() => {
                setToasts(current => current.filter(toast => toast.id !== id));
            }, 3000);
        };

        window.addEventListener('showMobileToast', handleShowToast);
        return () => window.removeEventListener('showMobileToast', handleShowToast);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-20 left-4 right-4 z-50 space-y-2 lg:hidden">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`transform transition-all duration-300 ease-out animate-bounce ${
                        toast.type === 'success' 
                            ? 'bg-green-500' 
                            : toast.type === 'error'
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                    } text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between`}
                >
                    <div className="flex items-center">
                        {toast.type === 'success' && (
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                        <span className="font-medium">{toast.message}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

// Helper function to show toasts
window.showMobileToast = (message, type = 'success') => {
    if (window.innerWidth < 1024) { // Only show on mobile/tablet
        window.dispatchEvent(new CustomEvent('showMobileToast', {
            detail: { message, type }
        }));
    }
};