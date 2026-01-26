const { useState, useEffect } = React;

const LoyaltyStatus = () => {
    const [loyaltyData, setLoyaltyData] = useState({
        totalPoints: 0,
        userTier: 'NONE',
        lastUpdated: null
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLoyaltyData();
    }, []);

    const fetchLoyaltyData = async () => {
        try {
            const response = await fetch('/dashboard/student/loyalty');
            if (response.ok) {
                const data = await response.json();
                setLoyaltyData(data);
            }
        } catch (error) {
            console.log('Could not fetch loyalty data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTierInfo = (tier) => {
        switch (tier) {
            case 'FIVE':
                return { name: 'Bronze', color: '#CD7F32', icon: '🥉' };
            case 'TEN':
                return { name: 'Silver', color: '#C0C0C0', icon: '🥈' };
            case 'FIFTEEN':
                return { name: 'Gold', color: '#FFD700', icon: '🥇' };
            case 'TWENTY':
                return { name: 'Platinum', color: '#E5E4E2', icon: '💎' };
            default:
                return { name: 'None', color: '#6C757D', icon: '⭐' };
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
                <div className="animate-pulse flex space-x-4">
                    <div className="rounded-full bg-gray-300 h-10 w-10"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                    </div>
                </div>
            </div>
        );
    }

    const tierInfo = getTierInfo(loyaltyData.userTier);

    return (
        <div className="bg-gradient-to-r from-primary to-secondary rounded-lg shadow-lg p-4 mb-6 text-white">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="text-2xl">{tierInfo.icon}</div>
                    <div>
                        <h3 className="font-semibold text-lg">
                            {loyaltyData.totalPoints} Points
                        </h3>
                        <p className="text-accent opacity-90">
                            {tierInfo.name} Member
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-sm text-accent opacity-90">
                        Earn points with every order!
                    </div>
                    <div className="text-xs text-accent opacity-75 mt-1">
                        ⚡ Random 4-9 pts per $1 spent
                    </div>
                </div>
            </div>
        </div>
    );
};