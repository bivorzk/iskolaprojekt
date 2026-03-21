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
            const welcomeData = await safeFetch('/dashboard/teacher/welcome-message', { message: 'Welcome, Teacher' });
            const userData = await safeFetch('/dashboard/teacher/userinfo', { username: 'Teacher' });

            setStudents(studentsData || []);
            setWelcomeMessage(welcomeData.message || 'Welcome, Teacher');
            setUserData(userData);
            setStats({
                totalStudents: studentsData?.length || 0,
                totalOrders: studentsData?.reduce((sum, s) => sum + (s.ordersMade || 0), 0),
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

// Export to window for global access
window.useTeacherData = useTeacherData;