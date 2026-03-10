const { useState, useEffect } = React;

const useEditorData = () => {
    const [stats, setStats] = useState({
        totalUsers: '--',
        activeUsers: '--',
        ordersMade: '--',
        totalMenuItems: '--',
        totalPoints: '--',
        totalRewards: '--',
        activeRewards: '--'
    });
    const [menuItems, setMenuItems] = useState([]);
    const [rewards, setRewards] = useState([]);
    const [welcomeMessage, setWelcomeMessage] = useState('Welcome, Editor');
    const [loading, setLoading] = useState(true);

    const loadDashboardData = async () => {
        try {
            const [userCountRes, ordersRes, menuItemsRes, rewardsRes, totalPointsRes, activeUsersRes, rewardStatsRes, welcomeRes] = await Promise.all([
                fetch('/dashboard/editor/usercount'),
                fetch('/dashboard/editor/orders'),
                fetch('/dashboard/editor/menulist'),
                fetch('/dashboard/editor/rewards_list'),
                fetch('/dashboard/editor/totalpoints'),
                fetch('/dashboard/editor/activeusers'),
                fetch('/dashboard/editor/reward_stats'),
                fetch('/dashboard/editor/welcome-message')
            ]);

            // Check if all responses are ok
            if (!userCountRes.ok) console.error('usercount failed:', userCountRes.status);
            if (!ordersRes.ok) console.error('orders failed:', ordersRes.status);
            if (!menuItemsRes.ok) console.error('menulist failed:', menuItemsRes.status);
            if (!rewardsRes.ok) console.error('rewards_list failed:', rewardsRes.status);
            if (!totalPointsRes.ok) console.error('totalpoints failed:', totalPointsRes.status);
            if (!activeUsersRes.ok) console.error('activeusers failed:', activeUsersRes.status);
            if (!rewardStatsRes.ok) console.error('reward_stats failed:', rewardStatsRes.status);
            if (!welcomeRes.ok) console.error('welcome-message failed:', welcomeRes.status);

            const [userCount, orders, menuData, rewardsData, totalPoints, activeUsers, rewardStats, welcome] = await Promise.all([
                userCountRes.json(),
                ordersRes.json(),
                menuItemsRes.json(),
                rewardsRes.json(),
                totalPointsRes.json(),
                activeUsersRes.json(),
                rewardStatsRes.json(),
                welcomeRes.json()
            ]);

            console.log('Editor API responses:', { userCount, orders, menuData, rewardsData, totalPoints, activeUsers, rewardStats, welcome });
            setStats({
                totalUsers: userCount.total || '--',
                activeUsers: activeUsers.activeUsers || '--',
                ordersMade: orders.total || '--',
                totalMenuItems: menuData.menuItems ? menuData.menuItems.length : '--',
                totalPoints: totalPoints.totalPoints || '--',
                totalRewards: rewardStats.totalRewards || '--',
                activeRewards: rewardStats.activeRewards || '--'
            });

            setMenuItems(menuData.menuItems || []);
            setRewards(rewardsData.rewards || []);
            setWelcomeMessage(welcome.message || 'Welcome, Editor');
        } catch (error) {
            console.error('Error loading editor dashboard data:', error);
            // Set fallback values
            setStats({
                totalUsers: '--',
                activeUsers: '--',
                ordersMade: '--',
                totalMenuItems: '--',
                totalPoints: '--',
                totalRewards: '--',
                activeRewards: '--'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    return {
        stats,
        menuItems,
        rewards,
        welcomeMessage,
        loading,
        loadDashboardData
    };
};