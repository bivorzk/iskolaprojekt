const { useEffect, useRef } = React;

const StatsSection = ({ stats, signupData }) => {
    const chartRef = useRef(null);

    useEffect(() => {
        if (signupData.length > 0) {
            renderChart();
        }
    }, [signupData]);

    const renderChart = () => {
        const ctx = document.getElementById('signupChart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const labels = signupData.map(item => `${item._id.year}-${item._id.month}-${item._id.day}`);
        const counts = signupData.map(item => item.count);

        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Registrations',
                    data: counts,
                    borderColor: '#FF6B35',
                    backgroundColor: 'rgba(255, 107, 53, 0.2)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'User Registrations Over Time'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Registrations'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    };

    return (
        <div>
            <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-6">Statistics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="text-xl sm:text-2xl font-bold text-primary">{stats.totalUsers}</div>
                    <div className="text-sm sm:text-base text-gray-600">Total Users</div>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="text-xl sm:text-2xl font-bold text-primary">{stats.activeSessions}</div>
                    <div className="text-sm sm:text-base text-gray-600">Active Sessions</div>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="text-xl sm:text-2xl font-bold text-primary">{stats.ordersMade}</div>
                    <div className="text-sm sm:text-base text-gray-600">Orders Made</div>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="text-xl sm:text-2xl font-bold text-primary">{stats.totalMenuItems}</div>
                    <div className="text-sm sm:text-base text-gray-600">Total Menu Items</div>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="text-xl sm:text-2xl font-bold text-primary">
                        {typeof stats.paymentStats === 'number' ? stats.paymentStats.toFixed(2) : stats.paymentStats}
                    </div>
                    <div className="text-sm sm:text-base text-gray-600">Payment Stats</div>
                </div>
                
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="text-xl sm:text-2xl font-bold text-primary">{
                        Array.isArray(stats.revenueLastMonth) && stats.revenueLastMonth.length > 0
                            ? stats.revenueLastMonth[0].totalRevenue
                            : '--'
                    }</div>
                    <div className="text-sm sm:text-base text-gray-600">Revenue Last Month</div>
                </div>
                
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-8">
                 <div className="text-xl sm:text-2xl font-bold text-primary">{
                    Array.isArray(stats.averageOrderValue) && stats.averageOrderValue.length > 0
                        ? stats.averageOrderValue[0].averageOrderValue.toFixed(2)
                        : (typeof stats.averageOrderValue === 'object' && stats.averageOrderValue !== null && typeof stats.averageOrderValue.averageOrderValue === 'number')
                            ? stats.averageOrderValue.averageOrderValue.toFixed(2)
                            : '--'
                 }</div>
                    <h3 className="text-sm sm:text-base text-gray-600">Average Order Value</h3>

                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-8">
                 <div className="text-xl sm:text-2xl font-bold text-primary">{
                    Array.isArray(stats.totalRevenue) && stats.totalRevenue.length > 0
                        ? stats.totalRevenue[0].totalRevenue
                        : (typeof stats.totalRevenue === 'object' && stats.totalRevenue !== null && typeof stats.totalRevenue.totalRevenue === 'number')
                            ? stats.totalRevenue.totalRevenue
                            : '--'
                 }</div>
                    <h3 className="text-sm sm:text-base text-gray-600">Total Revenue</h3>
                </div>
            </div>

            <div className="bg-white p-3 sm:p-6 rounded-lg shadow mb-4 sm:mb-8">
                <h3 className="text-base sm:text-lg font-semibold text-primary mb-3 sm:mb-4">Most Bought Items All Time</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Menu Item</th>
                            <th className="px-4 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Times Bought</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {stats.mostBoughtItems && stats.mostBoughtItems.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.itemName}</td>
                                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.totalQuantity}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>

            <div className="bg-white p-3 sm:p-6 rounded-lg shadow mb-4 sm:mb-8">
                <h3 className="text-base sm:text-lg font-semibold text-primary mb-3 sm:mb-4">Most Bought Items Last Week</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Menu Item</th>
                            <th className="px-4 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Times Bought</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {stats.mostBoughtItemsLastWeek && stats.mostBoughtItemsLastWeek.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.itemName}</td>
                                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.totalQuantity}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>

            <div className="bg-white p-3 sm:p-6 rounded-lg shadow">
                <h3 className="text-base sm:text-lg font-semibold text-primary mb-3 sm:mb-4">Registrations by Date</h3>
                <div className="w-full max-w-4xl mx-auto h-48 sm:h-96">
                    <canvas id="signupChart"></canvas>
                </div>
            </div>
        </div>
    );
};