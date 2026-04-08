const { useState } = React;

// Import components
// Note: In a real setup, these would be imported properly, but since this is a static file, we'll assume they are loaded separately

const AdminDashboard = () => {
    const [activeSection, setActiveSection] = useState('users');

    const { stats, users, menuItems, rewards, signupData, securityLogs, reportedMenuItems, welcomeMessage, userData, loading, loadDashboardData } = useAdminData();

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-accent to-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading admin dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-accent to-white">
            <AdminHeader welcomeMessage={welcomeMessage} userData={userData} />

            <div className="flex flex-col lg:flex-row">
                <AdminSidebar activeSection={activeSection} setActiveSection={setActiveSection} />

                {/* Main Content */}
                <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 mobile-main-offset lg:pb-8">
                    {activeSection === 'users' && <UsersSection users={users} loadDashboardData={loadDashboardData} />}
                    {activeSection === 'stats' && <StatsSection stats={stats} signupData={signupData} />}
                    {activeSection === 'menu-items' && <MenuItemsSection menuItems={menuItems} loadDashboardData={loadDashboardData} />}
                    {activeSection === 'reports' && <ReportsSection securityLogs={securityLogs} reportedMenuItems={reportedMenuItems} loadDashboardData={loadDashboardData} />}
                    {activeSection === 'rewards' && <RewardsSection rewards={rewards} loadDashboardData={loadDashboardData} />}
                    {activeSection === 'health' && <HealthCheckSection />}
                    {activeSection === 'settings' && <SettingsSection userData={userData} />}
                </main>
            </div>
            
            {/* Mobile Navigation */}
            <MobileAdminNav activeSection={activeSection} setActiveSection={setActiveSection} />
            
            {/* Admin Toast Notifications */}
            <AdminMobileToast />
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AdminDashboard />);