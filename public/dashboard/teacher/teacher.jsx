const { useState } = React;

const TeacherDashboard = () => {
    const [activeSection, setActiveSection] = useState('orders');
    const {
        orders,
        stats,
        parentLinkStatus, 
        userData,
        loading,
        welcomeMessage,
        students
    } = useTeacherData();

    const renderActiveSection = () => {
        switch (activeSection) {
            case 'orders':
                return <TeacherOrdersSection orders={orders} />;
            case 'students': 
                return <TeacherStudentsSection students={students} />;
            case 'stats':
                return <TeacherStatsSection stats={stats} />;
            case 'settings':
                return <TeacherSettingsSection userData={userData} />;
            default:
                return <TeacherOrdersSection orders={orders} />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <TeacherHeader welcomeMessage={welcomeMessage} />
            <div className="flex">
                <TeacherSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
                <main className="flex-1 p-4 sm:p-8 pb-20 lg:pb-8">
                    {renderActiveSection()}
                </main>
            </div>
            <MobileTeacherNav activeSection={activeSection} setActiveSection={setActiveSection} />
        </div>
    );
};

ReactDOM.render(<TeacherDashboard />, document.getElementById('root'));