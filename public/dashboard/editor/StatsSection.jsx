const { useState, useEffect } = React;

const StatsSection = ({ stats }) => {
    return (
        <div>
            <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-6">Dashboard Statistics</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                            <span className="text-2xl">👥</span>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Users</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-green-100 text-green-600">
                            <span className="text-2xl">🟢</span>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Active Users (24h)</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                            <span className="text-2xl">🛒</span>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Orders</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.ordersMade}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                            <span className="text-2xl">🍽️</span>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Menu Items</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalMenuItems}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-red-100 text-red-600">
                            <span className="text-2xl">⭐</span>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Points</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalPoints}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                            <span className="text-2xl">🎁</span>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Active Rewards</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.activeRewards}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};