const ParentTransactionsSection = ({ transactions }) => {
    return (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Transaction History</h2>

            {transactions.length === 0 ? (
                <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                    <p className="text-gray-600">Your transactions will appear here.</p>
                </div>
            ) : (
                <>
                    <div className="space-y-3 md:hidden">
                        {transactions.map((tx, index) => (
                            <div key={tx._id || index} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Type</div>
                                        <div className="mt-1 text-base font-semibold text-gray-900">{tx.type || 'Transfer'}</div>
                                    </div>
                                    <div className={`text-base font-semibold ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {tx.amount < 0 ? '-' : ''}${Math.abs(tx.amount)?.toFixed(2) || '0.00'}
                                    </div>
                                </div>
                                <div className="mt-4 space-y-3 text-sm text-gray-700">
                                    <div>
                                        <div className="text-gray-400 uppercase tracking-wide text-[11px]">Description</div>
                                        <div className="mt-1">{tx.description || `Transfer to ${tx.recipient || 'student'}`}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-400 uppercase tracking-wide text-[11px]">Date</div>
                                        <div className="mt-1 font-medium">{tx.date && !isNaN(new Date(tx.date).getTime()) ? new Date(tx.date).toLocaleDateString() : 'N/A'}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {transactions.map((tx, index) => (
                                    <tr key={tx._id || index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {tx.type || 'Transfer'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {tx.description || `Transfer to ${tx.recipient || 'student'}`}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                            {tx.date && !isNaN(new Date(tx.date).getTime()) ? new Date(tx.date).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                            <span className={tx.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                                                {tx.amount < 0 ? '-' : ''}${Math.abs(tx.amount)?.toFixed(2) || '0.00'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}