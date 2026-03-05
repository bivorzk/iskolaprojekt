const { useState, useEffect } = React;

const useStudentData = () => {
    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState({
        totalUsers: '--',
        activeSessions: '--',
        ordersMade: '--',
        totalMenuItems: '--',
        paymentStats: '--'
    });
    const [walletAmount, setWalletAmount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [parentLinkStatus, setParentLinkStatus] = useState({ linked: false, parentEmail: '' });
    const [userData, setUserData] = useState({});

    const loadDashboardData = async () => {
        try {
            // Helper function to safely fetch and parse JSON
            const safeFetch = async (url, fallbackData = null) => {
                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        console.warn(`API endpoint ${url} returned ${response.status}`);
                        return fallbackData;
                    }
                    const data = await response.json();
                    return data;
                } catch (error) {
                    console.warn(`Failed to fetch ${url}:`, error.message);
                    return fallbackData;
                }
            };

            // Fetch data with fallbacks
            const ordersData = await safeFetch('/dashboard/student/order_history', { orderData: [] });
            const menuData = await safeFetch('/api/menu-items', []);
            const welcomeData = await safeFetch('/dashboard/student/welcome-message', { message: 'Welcome, Student' });
            const transactionsData = await safeFetch('/dashboard/student/transactions', { transactions: [] });
            const parentDataRaw = await safeFetch('/dashboard/student/parent', null);
            const userData = await safeFetch('/dashboard/student/userinfo', { username: 'Student' });
            // Get wallet balance using the dedicated function
            const currentBalance = await refreshWalletBalance();
            if (currentBalance === null) {
                // Fallback to direct API call if refreshWalletBalance fails
                const walletData = await safeFetch('/dashboard/student/wallet/balance', { balance: 0 });
                setWalletAmount(walletData.balance || 0);
            }

            // Process parent data
            let parentData = { linked: false, parentEmail: '' };
            if (parentDataRaw && parentDataRaw.parent) {
                parentData = {
                    linked: true,
                    parentEmail: parentDataRaw.parent.email
                };
            }

            setOrders(ordersData.orderData || []);
            setWelcomeMessage(welcomeData.message || 'Welcome, Student');
            setTransactions(transactionsData.transactions || []);
            setParentLinkStatus(parentData);
            setUserData(userData);
            setStats({
                totalUsers: '--',
                activeSessions: '--',
                ordersMade: ordersData.orderData?.length || 0,
                totalMenuItems: menuData.length || 0,
                paymentStats: '--'
            });
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Set fallback data
            setOrders([]);
            setWelcomeMessage('Welcome, Student');
            setTransactions([]);
            setParentLinkStatus({ linked: false, parentEmail: '' });
            setUserData({ username: 'Student' });
            setStats({
                totalUsers: '--',
                activeSessions: '--',
                ordersMade: 0,
                totalMenuItems: 0,
                paymentStats: '--'
            });
        } finally {
            setLoading(false);
        }
    };

    const refreshWalletBalance = async () => {
        try {
            const balanceResponse = await fetch('/dashboard/student/wallet/balance');
            if (balanceResponse.ok) {
                const balanceData = await balanceResponse.json();
                setWalletAmount(balanceData.balance || 0);
                console.log('Wallet balance refreshed:', balanceData.balance);
                return balanceData.balance;
            } else {
                console.warn('Failed to refresh wallet balance');
                return null;
            }
        } catch (error) {
            console.error('Error refreshing wallet balance:', error);
            return null;
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    return {
        orders,
        stats,
        walletAmount,
        loading,
        welcomeMessage,
        transactions,
        parentLinkStatus,
        userData,
        loadDashboardData,
        refreshWalletBalance,
        setWalletAmount
    };
};

// Export to window for global access
window.useStudentData = useStudentData;