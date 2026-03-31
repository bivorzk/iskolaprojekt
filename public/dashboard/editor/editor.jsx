const { useState } = React;

// Import components
// Note: In a real setup, these would be imported properly, but since this is a static file, we'll assume they are loaded separately

const EditorDashboard = () => {
    const [activeSection, setActiveSection] = useState('stats');

    const { stats, menuItems, rewards, welcomeMessage, userData, loading, loadDashboardData } = useEditorData();

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-accent to-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading editor dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-accent to-white">
            <EditorHeader welcomeMessage={welcomeMessage} userData={userData} />

            <div className="flex">
                <EditorSidebar activeSection={activeSection} setActiveSection={setActiveSection} />

                {/* Main Content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
                    {activeSection === 'stats' && <StatsSection stats={stats} />}
                    {activeSection === 'menu-items' && <MenuItemsSection menuItems={menuItems} loadDashboardData={loadDashboardData} />}
                    {activeSection === 'rewards' && <RewardsSection rewards={rewards} loadDashboardData={loadDashboardData} />}
                </main>
            </div>

            {/* Mobile Navigation */}
            <MobileEditorNav activeSection={activeSection} setActiveSection={setActiveSection} />

            {/* Editor Toast Notifications */}
            <EditorMobileToast />
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<EditorDashboard />);