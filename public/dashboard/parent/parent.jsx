const { useState } = React;

const ParentDashboard = () => {
    const [activeSection, setActiveSection] = useState('students');

    const {
        students,
        orders,
        stats,
        walletAmount,
        transactions,
        userData,
        pendingRequests,
        loading,
        welcomeMessage,
        loadDashboardData,
        refreshWalletBalance,
        setWalletAmount
    } = useParentData();

    const renderActiveSection = () => {
        switch (activeSection) {
            case 'students':
                return <ParentStudentsSection students={students} pendingRequests={pendingRequests} refreshData={loadDashboardData} />;
            case 'orders':
                return <ParentOrdersSection orders={orders} />;
            case 'wallet':
                return (
                    <ParentWalletSection
                        walletAmount={walletAmount}
                        refreshWalletBalance={refreshWalletBalance}
                        setWalletAmount={setWalletAmount}
                        students={students}
                        refreshData={loadDashboardData}
                    />
                );
            case 'transactions':
                return <ParentTransactionsSection transactions={transactions} />;
            case 'stats':
                return <ParentStatsSection stats={stats} walletAmount={walletAmount} />;
            case 'settings':
                return <ParentSettingsSection userData={userData} />;
            default:
                return <ParentStudentsSection students={students} pendingRequests={pendingRequests} refreshData={loadDashboardData} />;
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
            <ParentHeader welcomeMessage={welcomeMessage} walletAmount={walletAmount} />
            <div className="flex">
                <ParentSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
                <main className="flex-1 p-4 sm:p-8 pb-20 lg:pb-8">
                    {renderActiveSection()}
                </main>
            </div>
            <MobileParentNav activeSection={activeSection} setActiveSection={setActiveSection} />
        </div>
    );
};

ReactDOM.render(<ParentDashboard />, document.getElementById('root'));




