const TeacherStatsSection = ({ stats }) => {
    return (
        <div>
            <h2 className="text-2xl font-bold text-primary mb-6">Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="text-2xl font-bold text-primary">{stats.classOrders}</div>
                    <div className="text-gray-600">Class Orders</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="text-2xl font-bold text-primary">{stats.studentsCount}</div>
                    <div className="text-gray-600">Students</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="text-2xl font-bold text-primary">{stats.totalMenuItems}</div>
                    <div className="text-gray-600">Menu Items Available</div>
                </div>
            </div>
        </div>
    );
};