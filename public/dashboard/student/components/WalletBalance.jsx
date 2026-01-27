const { useEffect } = React;

const WalletBalance = ({ walletAmount, refreshWalletBalance }) => {
    useEffect(() => {
        // Periodic wallet balance refresh
        const interval = setInterval(() => {
            refreshWalletBalance();
        }, 30000);

        return () => clearInterval(interval);
    }, [refreshWalletBalance]);

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Balance</h3>
            <div className="text-3xl font-bold text-primary mb-2">${walletAmount.toFixed(2)}</div>
            <p className="text-gray-600">Available for cafeteria purchases</p>
        </div>
    );
};

window.WalletBalance = WalletBalance;