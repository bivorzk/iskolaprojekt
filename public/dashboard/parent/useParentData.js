const { useState, useEffect } = React;

const useParentData = () => {
    const [students, setStudents] = useState([]);
    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState({
        totalStudents: '--',
        activeChildren: '--',
        ordersMade: '--',
        totalPayments: '--',
        balance: 0
    });
    const [walletAmount, setWalletAmount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [userData, setUserData] = useState({});
    const [pendingRequests, setPendingRequests] = useState([]);

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
            const studentsData = await safeFetch('/dashboard/parent/studentlist', { students: [] });
            const ordersData = await safeFetch('/dashboard/parent/orders', { orders: [] });
            const statsData = await safeFetch('/dashboard/parent/stats', {
                totalStudents: 0,
                activeChildren: 0,
                ordersMade: 0,
                totalPayments: 0,
                balance: 0
            });
            const welcomeData = await safeFetch('/dashboard/parent/welcome-message', { message: 'Welcome, Parent' });
            const transactionsData = await safeFetch('/dashboard/parent/transactions', { transactions: [] });
            const userData = await safeFetch('/dashboard/parent/userinfo', { username: 'Parent' });
            const requestsData = await safeFetch('/dashboard/parent/link-requests', { requests: [] });

            // Get wallet balance using the dedicated function
            const currentBalance = await refreshWalletBalance();
            if (currentBalance === null) {
                // Fallback to direct API call if refreshWalletBalance fails
                const walletData = await safeFetch('/dashboard/parent/wallet/balance', { balance: 0 });
                setWalletAmount(walletData.balance || 0);
            }

            setStudents(studentsData.students || []);
            setOrders(ordersData.orders || []);
            setWelcomeMessage(welcomeData.message || 'Welcome, Parent');
            setTransactions(transactionsData.transactions || []);
            setUserData(userData);
            setPendingRequests(requestsData.requests || []);
            setStats({
                totalStudents: statsData.totalStudents || 0,
                activeChildren: statsData.activeChildren || 0,
                ordersMade: statsData.ordersMade || 0,
                totalPayments: statsData.totalPayments || 0,
                balance: statsData.balance || 0
            });
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Set fallback data
            setStudents([]);
            setOrders([]);
            setWelcomeMessage('Welcome, Parent');
            setTransactions([]);
            setUserData({ username: 'Parent' });
            setPendingRequests([]);
            setStats({
                totalStudents: 0,
                activeChildren: 0,
                ordersMade: 0,
                totalPayments: 0,
                balance: 0
            });
        } finally {
            setLoading(false);
        }
    };

    const refreshWalletBalance = async () => {
        try {
            const balanceResponse = await fetch('/dashboard/parent/wallet/balance');
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
        students,
        orders,
        stats,
        walletAmount,
        loading,
        welcomeMessage,
        transactions,
        userData,
        pendingRequests,
        loadDashboardData,
        refreshWalletBalance,
        setWalletAmount
    };
};


