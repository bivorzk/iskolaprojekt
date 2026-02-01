const { useState } = React;

const ParentDashboard = () => {
    const [activeSection, setActiveSection] = useState('students');

    const { stats, students, orders, welcomeMessage, loading, loadDashboardData } = useParentData();

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-accent to-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading parent dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-accent to-white">
            <ParentHeader welcomeMessage={welcomeMessage} />

            <div className="flex">
                <ParentSidebar activeSection={activeSection} setActiveSection={setActiveSection} />

                <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
                    {activeSection === 'students' && <ParentStudentsSection students={students} />}
                    {activeSection === 'stats' && <ParentStatsSection stats={stats} />}
                    {activeSection === 'orders' && <ParentOrdersSection orders={orders} />}
                    {activeSection === 'settings' && <ParentSettingsSection />}
                </main>
            </div>
            
            <MobileParentNav activeSection={activeSection} setActiveSection={setActiveSection} />
        </div>
    );
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
