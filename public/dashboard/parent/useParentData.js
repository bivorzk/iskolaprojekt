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
            // Load data individually to handle failures gracefully
            let studentList = { students: [] };
            let ordersData = { orders: [] };
            let statsData = {
                totalStudents: 0,
                activeChildren: 0,
                ordersMade: 0,
                totalPayments: 0,
                balance: 0,
                signupData: []
            };
            let welcomeData = { message: 'Welcome, Parent' };

            try {
                const studentListRes = await fetch('/dashboard/parent/studentlist', { credentials: 'include' });
                if (studentListRes.ok) {
                    studentList = await studentListRes.json();
                } else {
                    console.error('Student list fetch failed:', studentListRes.status);
                }
            } catch (error) {
                console.error('Error fetching student list:', error);
            }

            try {
                const ordersRes = await fetch('/dashboard/parent/orders', { credentials: 'include' });
                if (ordersRes.ok) {
                    ordersData = await ordersRes.json();
                } else {
                    console.error('Orders fetch failed:', ordersRes.status);
                }
            } catch (error) {
                console.error('Error fetching orders:', error);
            }

            try {
                const statsRes = await fetch('/dashboard/parent/stats', { credentials: 'include' });
                if (statsRes.ok) {
                    statsData = await statsRes.json();
                } else {
                    console.error('Stats fetch failed:', statsRes.status);
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            }

            try {
                const welcomeRes = await fetch('/dashboard/parent/welcome-message', { credentials: 'include' });
                if (welcomeRes.ok) {
                    welcomeData = await welcomeRes.json();
                } else {
                    console.error('Welcome fetch failed:', welcomeRes.status);
                }
            } catch (error) {
                console.error('Error fetching welcome message:', error);
            }

            console.log('Welcome data:', welcomeData);
            console.log('Welcome message:', welcomeData.message);

            setStudents(studentList.students || []);
            setOrders(ordersData.orders || []);
            setStats({
                totalStudents: statsData.totalStudents || 0,
                activeChildren: statsData.activeChildren || 0,
                ordersMade: statsData.ordersMade || 0,
                totalPayments: statsData.totalPayments || 0,
                balance: statsData.balance || 0,
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
