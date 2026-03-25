const { useState, useEffect } = React;

const useTeacherData = () => {
    const [students, setStudents] = useState([]);
    const [stats, setStats] = useState({
        totalStudents: '--',
        totalOrders: '--',
        totalMenuItems: '--',
    });
    const [loading, setLoading] = useState(true);
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [userData, setUserData] = useState({});

    const loadDashboardData = async () => {
        try {
            const safeFetch = async (url, fallbackData = null) => {
                try {
                    const response = await fetch(url);
                    if (!response.ok) return fallbackData;
                    const data = await response.json();
                    return data;
                } catch (error) {
                    console.warn(`Failed to fetch ${url}:`, error.message);
                    return fallbackData;
                }
            };

            const studentsData = await safeFetch('/dashboard/teacher/students', []);
            const menuData = await safeFetch('/api/menu-items', []);
            const ordersData = await safeFetch('/dashboard/teacher/student-orders', []);
            const welcomeData = await safeFetch('/dashboard/teacher/welcome-message', { message: 'Welcome, Teacher' });
            const userInfo = await safeFetch('/dashboard/teacher/userinfo', { username: 'Teacher' });

            // Add latest order & status to each student
            const enrichedStudents = studentsData.map(s => {
                const latestOrder = ordersData
                    .filter(o => o.studentId === s._id)
                    .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))[0];

                return {
                    ...s,
                    latestOrder: latestOrder ? latestOrder.orderId : null,
                    orderStatus: latestOrder ? latestOrder.status : null
                };
            });

            setStudents(enrichedStudents);
            setWelcomeMessage(welcomeData.message || 'Welcome, Teacher');
            setUserData(userInfo);
            setStats({
                totalStudents: studentsData.length || 0,
                totalOrders: ordersData.length || 0,
                totalMenuItems: menuData.length || 0
            });
        } catch (error) {
            console.error('Error loading teacher dashboard data:', error);
            setStudents([]);
            setWelcomeMessage('Welcome, Teacher');
            setUserData({ username: 'Teacher' });
            setStats({ totalStudents: 0, totalOrders: 0, totalMenuItems: 0 });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    return {
        students,
        stats,
        loading,
        welcomeMessage,
        userData,
        loadDashboardData
    };
};

// Export to global
window.useTeacherData = useTeacherData;