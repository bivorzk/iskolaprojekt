const { useEffect, useRef } = React;

const ParentStatsSection = ({ stats }) => {
    const chartRef = useRef(null);

    useEffect(() => {
        if (stats.signupData?.length > 0) {
            renderChart();
        }
    }, [stats.signupData]);

    const renderChart = () => {
        const ctx = document.getElementById('parentSignupChart');
        if (!ctx) return;

        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const labels = stats.signupData.map(item => `${item._id.year}-${item._id.month}-${item._id.day}`);
        const counts = stats.signupData.map(item => item.count);

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
                    legend: { position: 'top' },
                    title: { display: true, text: 'Student Registrations Over Time' }
                },
                scales: {
                    x: { title: { display: true, text: 'Date' } },
                    y: { title: { display: true, text: 'Registrations' }, beginAtZero: true }
                }
            }
        });
    };

    return (
        <div>
            <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-6">Statistics</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="text-xl sm:text-2xl font-bold text-primary">{stats.totalStudents ?? '--'}</div>
                    <div className="text-sm sm:text-base text-gray-600">Total Students</div>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="text-xl sm:text-2xl font-bold text-primary">{stats.activeChildren ?? '--'}</div>
                    <div className="text-sm sm:text-base text-gray-600">Active Children</div>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="text-xl sm:text-2xl font-bold text-primary">{stats.ordersMade ?? '--'}</div>
                    <div className="text-sm sm:text-base text-gray-600">Orders Made</div>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="text-xl sm:text-2xl font-bold text-primary">{stats.totalPayments ?? '--'}</div>
                    <div className="text-sm sm:text-base text-gray-600">Total Payments</div>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="text-xl sm:text-2xl font-bold text-primary">{stats.balance ?? '--'}</div>
                    <div className="text-sm sm:text-base text-gray-600">Current Balance</div>
                </div>
            </div>

            <div className="bg-white p-3 sm:p-6 rounded-lg shadow">
                <h3 className="text-base sm:text-lg font-semibold text-primary mb-3 sm:mb-4">Registrations by Date</h3>
                <div className="w-full max-w-4xl mx-auto h-48 sm:h-96">
                    <canvas id="parentSignupChart"></canvas>
                </div>
            </div>
        </div>
    );
};
