const { useState } = React;

const StudentDashboard = () => {
    const [activeSection, setActiveSection] = useState('orders');

    const {
        orders,
        stats,
        walletAmount,
        transactions,
        parentLinkStatus,
        userData,
        loading,
        welcomeMessage,
        uploadForm,
        setUploadForm,
        showPaymentModal,
        setShowPaymentModal,
        refreshWalletBalance,
        loadDashboardData
    } = useStudentData();

    const renderActiveSection = () => {
        switch (activeSection) {
            case 'orders':
                return <OrdersSection orders={orders} />;
            case 'wallet':
                return (
                    <WalletSection
                        walletAmount={walletAmount}
                        uploadForm={uploadForm}
                        setUploadForm={setUploadForm}
                        showPaymentModal={showPaymentModal}
                        setShowPaymentModal={setShowPaymentModal}
                        refreshWalletBalance={refreshWalletBalance}
                    />
                );
            case 'transactions':
                return <TransactionsSection transactions={transactions} />;
            case 'stats':
                return <StatsSection stats={stats} walletAmount={walletAmount} />;
            case 'settings':
                return <SettingsSection parentLinkStatus={parentLinkStatus} userData={userData} />;
            default:
                return <OrdersSection orders={orders} />;
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
            <StudentHeader welcomeMessage={welcomeMessage} walletAmount={walletAmount} />
            <div className="flex">
                <StudentSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
                <main className="flex-1 p-8">
                    {renderActiveSection()}
                </main>
            </div>
        </div>
    );
};

ReactDOM.render(<StudentDashboard />, document.getElementById('root'));