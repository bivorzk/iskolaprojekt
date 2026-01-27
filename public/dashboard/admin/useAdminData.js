const { useState, useEffect } = React;

const useAdminData = () => {
    const [stats, setStats] = useState({
        totalUsers: '--',
        activeSessions: '--',
        ordersMade: '--',
        totalMenuItems: '--',
        paymentStats: '--',
        mostBoughtItems: [],
        mostBoughtItemsLastWeek: [],
        revenueLastMonth: {},
        averageOrderValue: {},
        totalRevenue: {},
    });
    const [users, setUsers] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [signupData, setSignupData] = useState([]);
    const [welcomeMessage, setWelcomeMessage] = useState('Welcome, Admin');
    const [loading, setLoading] = useState(true);

    const loadDashboardData = async () => {
        try {
            const [userCountRes, ordersRes, userListRes, signupStatsRes, menuItemsRes, welcomeRes, mostBoughtItemsRes, mostBoughtItemsLastWeekRes, revenueLastMonthRes, averageOrderValueRes, totalRevenueRes, paymentStatsRes] = await Promise.all([
                fetch('/dashboard/admin/usercount'),
                fetch('/dashboard/admin/orders'),
                fetch('/dashboard/admin/userlist'),
                fetch('/dashboard/admin/signup-stats'),
                fetch('/dashboard/admin/menulist'),
                fetch('/dashboard/admin/welcome-message'),
                fetch('/dashboard/admin/stats/most_bought_items'),
                fetch('/dashboard/admin/stats/most_bought_items-lastweek'),
                fetch('/dashboard/admin/stats/revenue-lastmonth'),
                fetch('/dashboard/admin/stats/average-order-value'),
                fetch('/dashboard/admin/stats/total-revenue'),
                fetch('/dashboard/admin/paymentstats')
            ]);

            // Check if all responses are ok
            if (!userCountRes.ok) console.error('usercount failed:', userCountRes.status);
            if (!ordersRes.ok) console.error('orders failed:', ordersRes.status);
            if (!userListRes.ok) console.error('userlist failed:', userListRes.status);
            if (!signupStatsRes.ok) console.error('signup-stats failed:', signupStatsRes.status);
            if (!menuItemsRes.ok) console.error('menulist failed:', menuItemsRes.status);
            if (!welcomeRes.ok) console.error('welcome-message failed:', welcomeRes.status);
            if (!mostBoughtItemsRes.ok) console.error('most_bought_items failed:', mostBoughtItemsRes.status);
            if (!mostBoughtItemsLastWeekRes.ok) console.error('most_bought_items_lastweek failed:', mostBoughtItemsLastWeekRes.status);
            if (!revenueLastMonthRes.ok) console.error('revenue_lastmonth failed:', revenueLastMonthRes.status);
            if (!averageOrderValueRes.ok) console.error('average_order_value failed:', averageOrderValueRes.status);
            if (!totalRevenueRes.ok) console.error('total_revenue failed:', totalRevenueRes.status);
            if (!paymentStatsRes.ok) console.error('paymentstats failed:', paymentStatsRes.status);

            const [userCount, orders, userList, signupStats, menuData, welcome, mostBoughtItems, mostBoughtItemsLastWeek, revenueLastMonth, averageOrderValue, totalRevenue, paymentStatsData] = await Promise.all([
                userCountRes.json(),
                ordersRes.json(),
                userListRes.json(),
                signupStatsRes.json(),
                menuItemsRes.json(),
                welcomeRes.json(),
                mostBoughtItemsRes.json(),
                mostBoughtItemsLastWeekRes.json(),
                revenueLastMonthRes.json(),
                averageOrderValueRes.json(),
                totalRevenueRes.json(),
                paymentStatsRes.json()
            ]);

            console.log('API responses:', { userCount, orders, userList, signupStats, menuData, welcome, mostBoughtItems, mostBoughtItemsLastWeek, revenueLastMonth, averageOrderValue, totalRevenue, paymentStatsData });
            setStats({
                totalUsers: userCount.total || '--',
                activeSessions: '--', // This might need a separate endpoint
                ordersMade: orders.total || '--',
                totalMenuItems: menuData.menuItems ? menuData.menuItems.length : '--',
                paymentStats: paymentStatsData.totalAmount?.[1] || '--',
                mostBoughtItems: mostBoughtItems || [],
                mostBoughtItemsLastWeek: mostBoughtItemsLastWeek || [],
                revenueLastMonth: revenueLastMonth || {} || '--',
                averageOrderValue: averageOrderValue || {} || '--',
                totalRevenue: totalRevenue || {} || '--'
            });

            setUsers(userList.users || []);
            setSignupData(signupStats || []);
            setMenuItems(menuData.menuItems || []);
            setWelcomeMessage(welcome.message || 'Welcome, Admin');
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Set fallback values
            setStats({
                totalUsers: '--',
                activeSessions: '--',
                ordersMade: '--',
                totalMenuItems: '--',
                paymentStats: '--',
                mostBoughtItems: [],
                mostBoughtItemsLastWeek: [],
                revenueLastMonth: {},
                averageOrderValue: {},
                totalRevenue: {},
                paymentStats: {}
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
        users,
        menuItems,
        signupData,
        welcomeMessage,
        loading,
        loadDashboardData
    };
};