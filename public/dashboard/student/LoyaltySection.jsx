const { useState, useEffect } = React;

const LoyaltySection = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [loyaltyData, setLoyaltyData] = useState({
        totalPoints: 0,
        userTier: 'NONE',
        pointHistory: [],
        milestonesAchieved: [],
        discounts: [],
        lastUpdated: null,
        currentStreak: 0,
        longestStreak: 0
    });
    const [rewards, setRewards] = useState([]);
    const [rewardsLoading, setRewardsLoading] = useState(false);
    const [rewardsError, setRewardsError] = useState(null);
    const [vouchers, setVouchers] = useState([]);
    const [rewardCategory, setRewardCategory] = useState('all');
    const [redeemingId, setRedeemingId] = useState(null);
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [previousPoints, setPreviousPoints] = useState(0);

    useEffect(() => {
        fetchLoyaltyData();
    }, []);

    useEffect(() => {
        if (activeTab === 'shop') fetchRewards();
        if (activeTab === 'vouchers') fetchVouchers();
    }, [activeTab]);

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

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchRewards = async () => {
        setRewardsLoading(true);
        setRewardsError(null);
        try {
            const response = await fetch('/dashboard/student/loyalty/rewards');
            if (!response.ok) throw new Error(`Server returned ${response.status}`);
            const data = await response.json();
            setRewards(data.rewards || []);
        } catch (error) {
            console.error('Error fetching rewards:', error);
            setRewardsError('Could not load rewards. Please try again.');
        } finally {
            setRewardsLoading(false);
        }
    };

    const fetchVouchers = async () => {
        try {
            const response = await fetch('/dashboard/student/loyalty/vouchers');
            if (response.ok) {
                const data = await response.json();
                setVouchers(data.vouchers || []);
            }
        } catch (error) {
            console.error('Error fetching vouchers:', error);
        }
    };

    const handleRedeem = async (rewardId) => {
        setRedeemingId(rewardId);
        try {
            const response = await fetch('/dashboard/student/loyalty/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rewardId })
            });
            const data = await response.json();
            if (response.ok) {
                showToast('🎉 Reward redeemed! Show the voucher code to cafeteria staff.');
                fetchLoyaltyData();
                fetchRewards();
                setActiveTab('vouchers');
                fetchVouchers();
            } else {
                showToast(data.error || 'Redemption failed', 'error');
            }
        } catch (error) {
            showToast('Failed to redeem reward. Please try again.', 'error');
        } finally {
            setRedeemingId(null);
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
    const categoryIcons = { all: '🛒', drink: '🥤', fruit: '🍎', dessert: '🍰', meal: '🍽️', upgrade: '⬆️', mystery: '🎁', token: '🎟️' };
    const filteredRewards = rewardCategory === 'all' ? rewards : rewards.filter(r => r.category === rewardCategory);

    return (
        <div className="space-y-6">
            {/* Toast notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium transition-all duration-300 ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
                    {toast.message}
                </div>
            )}

            {/* Header with streak badge */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-2xl font-bold text-primary">Loyalty Rewards</h2>
                {loyaltyData.currentStreak > 0 && (
                    <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2 rounded-full">
                        <span className="text-lg">🔥</span>
                        <span className="font-semibold text-orange-700">{loyaltyData.currentStreak}-day streak!</span>
                    </div>
                )}
            </div>

            {/* Tab navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6">
                    {[['overview', '📊 Overview'], ['shop', '🛒 Reward Shop'], ['vouchers', '🎫 My Vouchers']].map(([tab, label]) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            {label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Tier card */}
                    <div className={`bg-gradient-to-r ${tierInfo.bgGradient} rounded-lg shadow-lg p-6 text-black`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="text-3xl">{tierInfo.icon}</div>
                                <div>
                                    <h3 className="text-xl font-bold">{loyaltyData.totalPoints.toLocaleString()} Points</h3>
                                    <p className="text-black/90">{tierInfo.name} Member</p>
                                </div>
                            </div>
                            <button
                                onClick={() => refreshLoyaltyData()}
                                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                                title="Refresh loyalty data"
                            >
                                🔄
                            </button>
                        </div>
                        {tierInfo.nextPoints && (
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span>Progress to {tierInfo.nextTier}</span>
                                    <span>{loyaltyData.totalPoints.toLocaleString()} / {tierInfo.nextPoints.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-white/20 rounded-full h-2">
                                    <div
                                        className="bg-white h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${progressToNext}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-white/80 mt-2">
                                    {(tierInfo.nextPoints - loyaltyData.totalPoints).toLocaleString()} more points to {tierInfo.nextTier}
                                </p>
                            </div>
                        )}
                        {loyaltyData.currentStreak > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/20 flex justify-between text-sm">
                                <span>🔥 Current Streak</span>
                                <span className="font-bold">{loyaltyData.currentStreak} days</span>
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
                                                {Math.round(discount.rate * 100)}% off {discount.type.toLowerCase().replace(/_/g, ' ')}
                                            </p>
                                            {discount.validUntil && (
                                                <p className="text-sm text-green-600">Valid until {formatDate(discount.validUntil)}</p>
                                            )}
                                        </div>
                                        <div className="text-green-600">🎫</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div>
                                <p className="text-gray-500 text-sm mb-4">No active discounts. Keep ordering to unlock rewards!</p>
                                <button
                                    onClick={() => setActiveTab('shop')}
                                    className="text-sm text-primary hover:text-secondary font-medium"
                                >
                                    Browse Reward Shop →
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Point History */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Point History</h3>
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="text-primary hover:text-secondary transition-colors text-sm font-medium"
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
                                                    <p className={`font-medium ${entry.amount > 0 ? 'text-green-700' : 'text-red-600'}`}>
                                                        {entry.amount > 0 ? '+' : ''}{entry.amount} points
                                                    </p>
                                                    <p className="text-sm text-gray-600 capitalize">
                                                        {entry.reason?.replace(/_/g, ' ')}
                                                    </p>
                                                </div>
                                                <div className="text-sm text-gray-500">{formatDate(entry.date)}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">No point history yet. Start ordering to earn points!</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Achievements */}
                    {loyaltyData.milestonesAchieved && loyaltyData.milestonesAchieved.length > 0 && (
                        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h3>
                            <div className="flex flex-wrap gap-3">
                                {loyaltyData.milestonesAchieved.map((milestone, index) => (
                                    <div key={index} className="inline-flex items-center px-3 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                                        🏆 {milestone.replace('_FIRST', ' Member').replace(/_/g, ' ')}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* REWARD SHOP TAB */}
            {activeTab === 'shop' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-gray-600">You have <span className="font-bold text-primary">{loyaltyData.totalPoints.toLocaleString()} pts</span></p>
                        <p className="text-xs text-gray-400">100 pts ≈ $0.20 value</p>
                    </div>
                    {/* Category filter */}
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(categoryIcons).map(([cat, icon]) => (
                            <button
                                key={cat}
                                onClick={() => setRewardCategory(cat)}
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize ${rewardCategory === cat ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                                {icon} {cat}
                            </button>
                        ))}
                    </div>
                    {/* Rewards grid */}
                    {rewardsLoading ? (
                        <div className="text-center py-12 text-gray-400">
                            <div className="text-4xl mb-3 animate-spin">⏳</div>
                            <p>Loading rewards...</p>
                        </div>
                    ) : rewardsError ? (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-3">⚠️</div>
                            <p className="text-red-500 mb-3">{rewardsError}</p>
                            <button onClick={fetchRewards} className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-secondary">Try Again</button>
                        </div>
                    ) : rewards.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <div className="text-4xl mb-3">🛒</div>
                            <p>No rewards available yet.</p>
                        </div>
                    ) : filteredRewards.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <p>No rewards in this category yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredRewards.map(reward => (
                                <div
                                    key={reward._id}
                                    className={`bg-white rounded-lg shadow p-4 border-2 transition-all ${
                                        reward.tierLocked
                                            ? 'opacity-60 border-gray-200'
                                            : reward.canAfford
                                                ? 'border-green-200 hover:border-green-400 hover:shadow-md'
                                                : 'border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-semibold text-gray-900">{reward.name}</p>
                                            {reward.description && <p className="text-xs text-gray-500 mt-0.5">{reward.description}</p>}
                                        </div>
                                        <span className="text-2xl ml-2">{categoryIcons[reward.category] || '🎁'}</span>
                                    </div>
                                    {reward.healthDiscount && (
                                        <p className="text-xs text-green-600 font-medium mb-2 bg-green-50 px-2 py-1 rounded">🌿 -20% healthy discount applied</p>
                                    )}
                                    <div className="flex items-center justify-between mt-3">
                                        <div>
                                            <span className={`font-bold text-lg ${reward.canAfford ? 'text-primary' : 'text-gray-400'}`}>
                                                {reward.finalCost.toLocaleString()} pts
                                            </span>
                                            {!reward.canAfford && !reward.tierLocked && (
                                                <p className="text-xs text-gray-400">Need {(reward.finalCost - loyaltyData.totalPoints).toLocaleString()} more</p>
                                            )}
                                        </div>
                                        {reward.tierLocked ? (
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">🔒 {reward.minTier}+</span>
                                        ) : (
                                            <button
                                                onClick={() => handleRedeem(reward._id)}
                                                disabled={!reward.canAfford || redeemingId === reward._id}
                                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                                    reward.canAfford && redeemingId !== reward._id
                                                        ? 'bg-primary text-white hover:bg-secondary'
                                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                }`}
                                            >
                                                {redeemingId === reward._id ? '⏳' : 'Redeem'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">💡 How to Earn Points</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Earn 4–9 points per $1 spent on every order</li>
                            <li>• 🌿 Healthy items (score ≥75) give +40% bonus points and cost 20% less to redeem</li>
                            <li>• 🎉 Holiday orders earn +50% extra points</li>
                            <li>• Higher tiers get better point multipliers and exclusive rewards</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* MY VOUCHERS TAB */}
            {activeTab === 'vouchers' && (
                <div className="space-y-4">
                    {vouchers.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-5xl mb-3">🎫</div>
                            <p className="text-gray-500 mb-2">No vouchers yet.</p>
                            <p className="text-gray-400 text-sm mb-5">Redeem rewards in the shop to get vouchers you can use at the cafeteria.</p>
                            <button
                                onClick={() => setActiveTab('shop')}
                                className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors text-sm font-medium"
                            >
                                Browse Reward Shop
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {vouchers.filter(v => v.status === 'pending').length > 0 && (
                                <>
                                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">🟢 Active Vouchers</h3>
                                    {vouchers.filter(v => v.status === 'pending').map((voucher, i) => (
                                        <div key={i} className="bg-white border-2 border-green-300 rounded-lg p-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{voucher.rewardId?.name || 'Reward'}</p>
                                                    <div className="mt-2 bg-gray-50 border border-gray-200 rounded px-3 py-1.5 inline-block">
                                                        <p className="text-sm font-mono text-gray-700 tracking-widest">{voucher.voucherCode}</p>
                                                    </div>
                                                    <p className="text-xs text-red-500 mt-2">⏰ Expires {formatDate(voucher.voucherExpiresAt)}</p>
                                                </div>
                                                <div className="text-right ml-4">
                                                    <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">Active</span>
                                                    <p className="text-xs text-gray-400 mt-2">Show code to staff</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                            {vouchers.filter(v => v.status !== 'pending').length > 0 && (
                                <>
                                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mt-4">📋 Past Vouchers</h3>
                                    {vouchers.filter(v => v.status !== 'pending').map((voucher, i) => (
                                        <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between opacity-70">
                                            <div>
                                                <p className="font-medium text-gray-700">{voucher.rewardId?.name || 'Reward'}</p>
                                                <p className="text-xs text-gray-500 mt-1">{formatDate(voucher.createdAt)}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                voucher.status === 'fulfilled' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                                {voucher.status === 'fulfilled' ? '✅ Used' : '⏱ Expired'}
                                            </span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};