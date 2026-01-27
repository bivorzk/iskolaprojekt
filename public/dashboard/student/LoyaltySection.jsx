const { useState, useEffect } = React;

const LoyaltySection = () => {
    const [loyaltyData, setLoyaltyData] = useState({
        totalPoints: 0,
        userTier: 'NONE',
        pointHistory: [],
        milestonesAchieved: [],
        discounts: [],
        lastUpdated: null
    });
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [previousPoints, setPreviousPoints] = useState(0);

    useEffect(() => {
        fetchLoyaltyData();
    }, []);

    // Listen for order completion events to refresh loyalty data and show animation
    useEffect(() => {
        const handleOrderComplete = () => {
            setTimeout(() => {
                fetchLoyaltyData();
            }, 2000); // Wait 2 seconds after order to ensure backend processing is complete
        };
        
        const handleLoyaltyPointsEarned = (event) => {
            if (event.detail && event.detail.pointsEarned) {
                showLoyaltyPointsAnimation(event.detail.pointsEarned);
            }
        };
        
        window.addEventListener('orderComplete', handleOrderComplete);
        window.addEventListener('loyaltyPointsEarned', handleLoyaltyPointsEarned);
        
        return () => {
            window.removeEventListener('orderComplete', handleOrderComplete);
            window.removeEventListener('loyaltyPointsEarned', handleLoyaltyPointsEarned);
        };
    }, []);

    const fetchLoyaltyData = async () => {
        setLoading(true);
        try {
            const response = await fetch('/dashboard/student/loyalty');
            if (response.ok) {
                const data = await response.json();
                
                // Check if points increased and show animation
                if (!loading && previousPoints > 0 && data.totalPoints > previousPoints) {
                    const pointsEarned = data.totalPoints - previousPoints;
                    setTimeout(() => {
                        showLoyaltyPointsAnimation(pointsEarned);
                    }, 500); // Delay to ensure UI updates first
                }
                
                setPreviousPoints(data.totalPoints);
                setLoyaltyData(data);
            } else {
                console.error('Failed to fetch loyalty data');
            }
        } catch (error) {
            console.error('Error fetching loyalty data:', error);
        } finally {
            setLoading(false);
        }
    };

    const refreshLoyaltyData = async () => {
        try {
            const response = await fetch('/dashboard/student/loyalty/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                
                // Check if points increased and show animation
                if (previousPoints > 0 && data.totalPoints > previousPoints) {
                    const pointsEarned = data.totalPoints - previousPoints;
                    setTimeout(() => {
                        showLoyaltyPointsAnimation(pointsEarned);
                    }, 500);
                }
                
                setPreviousPoints(data.totalPoints);
                setLoyaltyData(data);
            } else {
                console.error('Failed to refresh loyalty data');
            }
        } catch (error) {
            console.error('Error refreshing loyalty data:', error);
        }
    };

    const showLoyaltyPointsAnimation = (pointsAwarded) => {
        if (!pointsAwarded || pointsAwarded <= 0) return;
        
        // Create the animation container
        const animationContainer = document.createElement('div');
        animationContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        
        // Create the points display with site theme
        const pointsDisplay = document.createElement('div');
        pointsDisplay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #FF6B35, #FFC857);
                color: white;
                padding: 24px 32px;
                border-radius: 16px;
                box-shadow: 0 20px 40px rgba(255, 107, 53, 0.3), 0 8px 16px rgba(255, 107, 53, 0.2);
                text-align: center;
                transform: scale(0);
                animation: snapTrayBounceIn 0.7s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
                border: 2px solid rgba(255, 229, 220, 0.3);
                backdrop-filter: blur(10px);
            ">
                <div style="
                    font-size: 18px; 
                    font-weight: 600; 
                    margin-bottom: 12px;
                    color: #FFE5DC;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                ">⚡ Loyalty Points Earned!</div>
                <div style="
                    font-size: 42px; 
                    font-weight: bold; 
                    color: white;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    margin: 8px 0;
                ">+${pointsAwarded}</div>
                <div style="
                    font-size: 14px; 
                    margin-top: 12px; 
                    opacity: 0.9;
                    color: #FFE5DC;
                    font-weight: 500;
                ">Keep ordering with SnapTray!</div>
            </div>
        `;
        
        // Add SnapTray themed keyframes
        if (!document.getElementById('snapTrayLoyaltyStyles')) {
            const style = document.createElement('style');
            style.id = 'snapTrayLoyaltyStyles';
            style.textContent = `
                @keyframes snapTrayBounceIn {
                    0% {
                        transform: scale(0) rotate(-180deg);
                        opacity: 0;
                    }
                    50% {
                        transform: scale(1.15) rotate(-10deg);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(1) rotate(0deg);
                        opacity: 1;
                    }
                }
                
                @keyframes snapTrayFadeOut {
                    0% {
                        transform: scale(1) translate(-50%, -50%);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(0.9) translate(-50%, -60%);
                        opacity: 0;
                    }
                }
                
                @keyframes snapTraySparkle {
                    0% {
                        transform: translateY(0) scale(0) rotate(0deg);
                        opacity: 1;
                    }
                    25% {
                        transform: translateY(-20px) scale(1) rotate(90deg);
                        opacity: 1;
                    }
                    50% {
                        transform: translateY(-60px) scale(1.2) rotate(180deg);
                        opacity: 0.8;
                    }
                    100% {
                        transform: translateY(-120px) scale(0) rotate(360deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        animationContainer.appendChild(pointsDisplay);
        document.body.appendChild(animationContainer);
        
        // Add SnapTray themed sparkle effects
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                const sparkleTypes = ['⚡', '✨', '💎', '🔥'];
                sparkle.innerHTML = sparkleTypes[Math.floor(Math.random() * sparkleTypes.length)];
                sparkle.style.cssText = `
                    position: absolute;
                    font-size: ${Math.random() * 16 + 20}px;
                    left: ${Math.random() * 400 - 200}px;
                    top: ${Math.random() * 200 - 100}px;
                    pointer-events: none;
                    animation: snapTraySparkle ${Math.random() * 1.5 + 1.2}s ease-out forwards;
                    z-index: 10001;
                    filter: drop-shadow(0 0 4px rgba(255, 107, 53, 0.6));
                `;
                
                animationContainer.appendChild(sparkle);
                
                setTimeout(() => {
                    if (sparkle.parentNode) {
                        sparkle.parentNode.removeChild(sparkle);
                    }
                }, 2500);
            }, i * 80);
        }
        
        // Remove animation after delay with SnapTray style fadeout
        setTimeout(() => {
            animationContainer.style.animation = 'snapTrayFadeOut 0.6s ease-in forwards';
            setTimeout(() => {
                if (animationContainer.parentNode) {
                    animationContainer.parentNode.removeChild(animationContainer);
                }
            }, 600);
        }, 3500);
    };

    const getTierInfo = (tier) => {
        switch (tier) {
            case 'Bronze':
                return { 
                    name: 'Bronze', 
                    color: '#CD7F32',
                    bgGradient: 'from-yellow-600 to-yellow-800',
                    icon: '🥉',
                    nextTier: 'Silver',
                    nextPoints: 5000
                };
            case 'Silver':
                return { 
                    name: 'Silver', 
                    color: '#C0C0C0',
                    bgGradient: 'from-gray-400 to-gray-600',
                    icon: '🥈',
                    nextTier: 'Gold',
                    nextPoints: 15000
                };
            case 'Gold':
                return { 
                    name: 'Gold', 
                    color: '#FFD700',
                    bgGradient: 'from-yellow-400 to-yellow-600',
                    icon: '🥇',
                    nextTier: 'Platinum',
                    nextPoints: 40000
                };
            case 'Platinum':
                return { 
                    name: 'Platinum', 
                    color: '#E5E4E2',
                    bgGradient: 'from-purple-400 to-purple-600',
                    icon: '💎',
                    nextTier: 'Max Level',
                    nextPoints: null
                };
            default:
                return { 
                    name: 'None', 
                    color: '#6C757D',
                    bgGradient: 'from-gray-500 to-gray-700',
                    icon: '⭐',
                    nextTier: 'Bronze',
                    nextPoints: 1200
                };
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-primary">Loyalty Rewards</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[1, 2].map(i => (
                        <div key={i} className="bg-white rounded-lg shadow p-6">
                            <div className="animate-pulse space-y-4">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 bg-gray-300 rounded w-24"></div>
                                        <div className="h-3 bg-gray-300 rounded w-16"></div>
                                    </div>
                                </div>
                                <div className="h-3 bg-gray-300 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const tierInfo = getTierInfo(loyaltyData.userTier);
    const progressToNext = tierInfo.nextPoints ? 
        Math.min(100, (loyaltyData.totalPoints / tierInfo.nextPoints) * 100) : 100;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-primary mb-6">Loyalty Rewards</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Status */}
                <div className={`bg-gradient-to-r ${tierInfo.bgGradient} rounded-lg shadow-lg p-6 text-white`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="text-3xl">{tierInfo.icon}</div>
                            <div>
                                <h3 className="text-xl font-bold">{loyaltyData.totalPoints} Points</h3>
                                <p className="text-white/90">{tierInfo.name} Member</p>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => refreshLoyaltyData()}
                                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                                title="Refresh loyalty data"
                            >
                                🔄
                            </button>
                        </div>
                    </div>
                    
                    {tierInfo.nextPoints && (
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span>Progress to {tierInfo.nextTier}</span>
                                <span>{loyaltyData.totalPoints}/{tierInfo.nextPoints}</span>
                            </div>
                            <div className="w-full bg-white/20 rounded-full h-2">
                                <div 
                                    className="bg-white h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progressToNext}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Active Discounts */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Discounts</h3>
                    {loyaltyData.discounts && loyaltyData.discounts.length > 0 ? (
                        <div className="space-y-3">
                            {loyaltyData.discounts.map((discount, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                    <div>
                                        <p className="font-medium text-green-800">
                                            {discount.rate}% off {discount.type.toLowerCase().replace('_', ' ')}
                                        </p>
                                        {discount.validUntil && (
                                            <p className="text-sm text-green-600">
                                                Valid until {formatDate(discount.validUntil)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-green-600">
                                        🎫
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No active discounts. Keep ordering to unlock rewards!</p>
                    )}
                </div>

                {/* Point History */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Point History</h3>
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="text-primary hover:text-secondary transition-colors"
                            >
                                {showHistory ? 'Hide' : 'Show'} History
                            </button>
                        </div>
                        
                        {showHistory && (
                            <div className="max-h-64 overflow-y-auto">
                                {loyaltyData.pointHistory && loyaltyData.pointHistory.length > 0 ? (
                                    <div className="space-y-2">
                                        {loyaltyData.pointHistory.slice().reverse().map((entry, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 border-l-4 border-l-primary bg-gray-50 rounded-r">
                                                <div>
                                                    <p className="font-medium">
                                                        {entry.amount > 0 ? '+' : ''}{entry.amount} points
                                                    </p>
                                                    <p className="text-sm text-gray-600 capitalize">
                                                        {entry.reason?.replace(/_/g, ' ')}
                                                    </p>
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {formatDate(entry.date)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500">No point history yet. Start ordering to earn points!</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Achievements */}
                {loyaltyData.milestonesAchieved && loyaltyData.milestonesAchieved.length > 0 && (
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h3>
                            <div className="flex flex-wrap gap-3">
                                {loyaltyData.milestonesAchieved.map((milestone, index) => (
                                    <div key={index} className="inline-flex items-center px-3 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                                        🏆 {milestone.replace('_FIRST', ' Member').replace('_', ' ')}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 How to Earn Points</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Earn 4-9 points per item when you order</li>
                    <li>• Healthy items give bonus points (up to +40%)</li>
                    <li>• Holiday orders earn extra rewards</li>
                    <li>• Higher tiers get better point multipliers</li>
                </ul>
            </div>
        </div>
    );
};