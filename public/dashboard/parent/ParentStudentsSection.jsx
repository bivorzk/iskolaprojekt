const ParentStudentsSection = ({ students, pendingRequests, refreshData }) => {
    const [transferAmount, setTransferAmount] = React.useState('');
    const [selectedStudent, setSelectedStudent] = React.useState(null);
    const [loading, setLoading] = React.useState(false);

    const handleRequestAction = async (requestId, action) => {
        try {
            const response = await fetch(`/dashboard/parent/link-request/${requestId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action })
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message);
                refreshData(); // Refresh all data including pending requests
            } else {
                alert(data.error || 'Action failed');
            }
        } catch (error) {
            console.error('Error processing request:', error);
            alert('Action failed');
        }
    };

    const handleTransfer = async (studentId) => {
        if (!transferAmount || transferAmount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/dashboard/parent/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studentId,
                    amount: parseFloat(transferAmount)
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Transfer successful!');
                setTransferAmount('');
                setSelectedStudent(null);
                refreshData(); // Refresh the dashboard data
            } else {
                alert(data.error || 'Transfer failed');
            }
        } catch (error) {
            console.error('Transfer error:', error);
            alert('Transfer failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Students</h2>

            {/* Pending Link Requests */}
            {pendingRequests.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Pending Link Requests</h3>
                    <div className="space-y-3">
                        {pendingRequests.map(request => (
                            <div key={request.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-medium text-gray-800">{request.studentName}</h4>
                                        <p className="text-sm text-gray-600">{request.studentEmail}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Requested on {new Date(request.requestedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleRequestAction(request.id, 'approve')}
                                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleRequestAction(request.id, 'deny')}
                                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                                        >
                                            Deny
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Linked Students */}
            {students.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-500 text-lg">No students linked yet.</p>
                    <p className="text-gray-400 text-sm mt-2">Students can link to your account from their dashboard.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {students.map(student => (
                        <div key={student.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-semibold text-gray-800">{student.name}</h3>
                                    <p className="text-sm text-gray-600">{student.email}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Balance</p>
                                    <p className="font-semibold text-green-600">${student.balance?.toFixed(2) || '0.00'}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {selectedStudent === student.id ? (
                                    <div className="space-y-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={transferAmount}
                                            onChange={(e) => setTransferAmount(e.target.value)}
                                            placeholder="Amount to transfer"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleTransfer(student.id)}
                                                disabled={loading}
                                                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loading ? 'Transferring...' : 'Transfer'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedStudent(null);
                                                    setTransferAmount('');
                                                }}
                                                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setSelectedStudent(student.id)}
                                        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                                    >
                                        Transfer Money
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


