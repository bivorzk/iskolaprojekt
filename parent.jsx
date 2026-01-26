const { useState } = React;

const ParentDashboard = () => {
    const [activeSection, setActiveSection] = useState('students');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const { stats, students, orders, welcomeMessage, loading, loadDashboardData } = useParentData();

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
            <ParentHeader welcomeMessage={welcomeMessage} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

            <div className="flex">
                <ParentSidebar activeSection={activeSection} setActiveSection={setActiveSection} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    ></div>
                )}

                <main className="flex-1 p-2 sm:p-4 lg:p-8 md:ml-0">
                    {activeSection === 'students' && <ParentStudentsSection students={students} />}
                    {activeSection === 'stats' && <ParentStatsSection stats={stats} />}
                    {activeSection === 'orders' && <ParentOrdersSection orders={orders} />}
                    {activeSection === 'settings' && <ParentSettingsSection />}
                </main>
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ParentDashboard />);
