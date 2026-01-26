// Demo button component for testing loyalty animations
const LoyaltyDemo = () => {
    const [isVisible, setIsVisible] = React.useState(false);
    
    // Show demo only in development or when URL contains ?demo=true
    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const isDemoMode = urlParams.get('demo') === 'true' || 
                          window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1';
        setIsVisible(isDemoMode);
    }, []);
    
    const testAnimations = [
        { points: 8, label: 'Small Order' },
        { points: 15, label: 'Medium Order' }, 
        { points: 25, label: 'Large Order' },
        { points: 50, label: 'Mega Order' }
    ];
    
    const showTestAnimation = (points) => {
        // Show the loyalty animation
        setTimeout(() => {
            showLoyaltyPointsAnimation(points);
        }, 100);
        
        // Show the notification
        setTimeout(() => {
            showSnapTrayNotification(
                'success',
                '🎉 Demo: Order Successfully Placed!',
                `Order ID: DEMO-${Date.now()}${points > 0 ? `\n⚡ Earned ${points} loyalty points!` : ''}`
            );
        }, 3600);
    };
    
    if (!isVisible) return null;
    
    return (
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-4 mb-6">
            <div className="text-center">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    🧪 Demo Mode - Test Loyalty Animations
                </h3>
                <div className="flex flex-wrap justify-center gap-2">
                    {testAnimations.map((test, index) => (
                        <button
                            key={index}
                            onClick={() => showTestAnimation(test.points)}
                            className="px-3 py-1 bg-primary text-white text-xs rounded-md hover:bg-secondary transition-colors"
                        >
                            {test.label} ({test.points} pts)
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    Add ?demo=true to URL to enable demo mode
                </p>
            </div>
        </div>
    );
};