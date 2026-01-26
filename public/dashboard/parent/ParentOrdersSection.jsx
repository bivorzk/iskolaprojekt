const ParentOrdersSection = ({ orders }) => {
    return (
        <div>
            <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-6">Orders</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Date</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {orders.map((order, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{order._id}</td>
                                    <td className="px-4 py-4 text-sm text-gray-500">{order.studentName || order.student || '—'}</td>
                                    <td className="px-4 py-4 text-sm text-gray-500 text-right">${order.total?.toFixed(2) ?? '—'}</td>
                                    <td className="px-4 py-4 text-sm text-center">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {order.status?.toUpperCase() ?? '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-500 text-right">
                                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
