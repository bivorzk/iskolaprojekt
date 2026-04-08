const OrdersSection = ({ orders }) => {
    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'delivered':
                return 'bg-green-100 text-green-800';
            case 'pending':
            case 'processing':
                return 'bg-yellow-100 text-yellow-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-primary mb-6">My Orders</h2>
            {orders.length === 0 ? (
                <div className="bg-white p-8 rounded-lg shadow text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                    <p className="text-gray-600 mb-4">Start ordering from the cafeteria to see your order history here.</p>
                    <a
                        href="/Order/"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                    >
                        Start Ordering
                    </a>
                </div>
            ) : (
                <>
                    <div className="space-y-3 md:hidden">
                        {orders.map((order, index) => (
                            <div key={order._id || order.orderId || index} className="bg-white rounded-2xl shadow p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Order</div>
                                        <div className="mt-1 text-base font-semibold text-gray-900">#{order.orderId}</div>
                                    </div>
                                    <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                        {order.status || 'Pending'}
                                    </span>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <div className="text-gray-400 uppercase tracking-wide text-[11px]">Date</div>
                                        <div className="mt-1 font-medium text-gray-700">{new Date(order.orderDate).toLocaleDateString()}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-gray-400 uppercase tracking-wide text-[11px]">Total</div>
                                        <div className="mt-1 text-base font-semibold text-primary">${order.totalAmount?.toFixed(2) || '0.00'}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {orders.map((order, index) => (
                                        <tr key={order._id || order.orderId || index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                #{order.orderId}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                {new Date(order.orderDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                ${order.totalAmount?.toFixed(2) || '0.00'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                                    {order.status || 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};