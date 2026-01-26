const { useState, useEffect } = React;

const useParentData = () => {
    const [stats, setStats] = useState({
        totalStudents: '--',
        activeChildren: '--',
        ordersMade: '--',
        totalPayments: '--',
        balance: '--',
        signupData: []
    });
    const [students, setStudents] = useState([]);
    const [orders, setOrders] = useState([]);
    const [welcomeMessage, setWelcomeMessage] = useState('Welcome, Parent');
    const [loading, setLoading] = useState(true);

    const loadDashboardData = async () => {
        try {
            const [studentListRes, ordersRes, statsRes, welcomeRes] = await Promise.all([
                fetch('/dashboard/parent/studentlist'),
                fetch('/dashboard/parent/orders'),
                fetch('/dashboard/parent/stats'),
                fetch('/dashboard/parent/welcome-message')
            ]);

            const [studentList, ordersData, statsData, welcomeData] = await Promise.all([
                studentListRes.json(),
                ordersRes.json(),
                statsRes.json(),
                welcomeRes.json()
            ]);

            setStudents(studentList.students || []);
            setOrders(ordersData.orders || []);
            setStats({
                totalStudents: statsData.totalStudents || '--',
                activeChildren: statsData.activeChildren || '--',
                ordersMade: statsData.ordersMade || '--',
                totalPayments: statsData.totalPayments || '--',
                balance: statsData.balance || '--',
                signupData: statsData.signupData || []
            });
            setWelcomeMessage(welcomeData.message || 'Welcome, Parent');
        } catch (error) {
            console.error('Error loading parent dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    return {
        stats,
        students,
        orders,
        welcomeMessage,
        loading,
        loadDashboardData
    };
};
