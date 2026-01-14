const { useState } = React;

// Import components
// Note: In a real setup, these would be imported properly, but since this is a static file, we'll assume they are loaded separately

const AdminDashboard = () => {
    const [activeSection, setActiveSection] = useState('users');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const { stats, users, menuItems, signupData, welcomeMessage, loading, loadDashboardData } = useAdminData();

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-accent to-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-accent to-white">
            <AdminHeader welcomeMessage={welcomeMessage} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

            <div className="flex">
                <AdminSidebar activeSection={activeSection} setActiveSection={setActiveSection} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

                {/* Mobile overlay */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    ></div>
                )}

                {/* Main Content */}
                <main className="flex-1 p-2 sm:p-4 lg:p-8 md:ml-0">
                    {activeSection === 'users' && <UsersSection users={users} />}
                    {activeSection === 'stats' && <StatsSection stats={stats} signupData={signupData} />}
                    {activeSection === 'menu-items' && <MenuItemsSection menuItems={menuItems} loadDashboardData={loadDashboardData} />}
                    {activeSection === 'settings' && <SettingsSection />}
                </main>
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AdminDashboard />);