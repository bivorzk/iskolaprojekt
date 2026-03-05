const ParentStatsSection = ({ stats, walletAmount }) => {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                    <div className="text-3xl font-bold text-blue-600">{stats.totalStudents || 0}</div>
                    <div className="text-gray-600 font-medium">Linked Students</div>
                    <div className="text-sm text-gray-500 mt-1">Children connected to your account</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                    <div className="text-3xl font-bold text-green-600">{stats.activeChildren || 0}</div>
                    <div className="text-gray-600 font-medium">Active Children</div>
                    <div className="text-sm text-gray-500 mt-1">Students active in last 30 days</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                    <div className="text-3xl font-bold text-purple-600">{stats.ordersMade || 0}</div>
                    <div className="text-gray-600 font-medium">Total Orders</div>
                    <div className="text-sm text-gray-500 mt-1">Orders made by your students</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg border border-yellow-200">
                    <div className="text-3xl font-bold text-yellow-600">${(stats.totalPayments || 0).toFixed(2)}</div>
                    <div className="text-gray-600 font-medium">Total Spent</div>
                    <div className="text-sm text-gray-500 mt-1">Money spent by your students</div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
                    <div className="text-3xl font-bold text-red-600">${walletAmount?.toFixed(2) || '0.00'}</div>
                    <div className="text-gray-600 font-medium">Your Balance</div>
                    <div className="text-sm text-gray-500 mt-1">Available for transfers</div>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-lg border border-indigo-200">
                    <div className="text-3xl font-bold text-indigo-600">{stats.balance ? '$' + stats.balance.toFixed(2) : '$0.00'}</div>
                    <div className="text-gray-600 font-medium">Account Balance</div>
                    <div className="text-sm text-gray-500 mt-1">Your total account balance</div>
                </div>
            </div>
        </div>
    );
};


