const ReportsSection = ({ securityLogs = [], reportedMenuItems = [], loadDashboardData }) => {
    const { useState, useMemo } = React;
    const [activeTab, setActiveTab] = useState('logs');
    const [filterUser, setFilterUser] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState(null);
    const [loadingBan, setLoadingBan] = useState(new Set());
    const [loadingLogs, setLoadingLogs] = useState(new Set());
    const [loadingDeleteReview, setLoadingDeleteReview] = useState(new Set());
    const [loadingResolve, setLoadingResolve] = useState(new Set());

    const getMenuItemId = (menuItem) => menuItem?._id?.toString?.() || menuItem?._id || '';
    const getReviewId = (review) => review?._id?.toString?.() || review?._id || '';
    const getReviewActionKey = (menuItem, review) => {
        const menuItemId = getMenuItemId(menuItem);
        const reviewId = getReviewId(review);
        return reviewId ? `${menuItemId}-${reviewId}` : `${menuItemId}-${review?.comment || 'review'}`;
    };

    const handleDeleteReview = async (menuItemId, reviewId) => {
        if (!menuItemId || !reviewId) {
            showMessage('Missing menu item or review ID. Reload the page and try again.', 'error');
            return;
        }

        if (!window.confirm('Delete this review message? This cannot be undone.')) {
            return;
        }

        const actionKey = `${menuItemId}-${reviewId}`;
        setLoadingDeleteReview((prev) => new Set(prev).add(actionKey));
        try {
            const response = await fetch(`/dashboard/admin/menu-items/${menuItemId}/reviews/${reviewId}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (response.ok) {
                showMessage(result.message || 'Review deleted successfully', 'success');
                if (loadDashboardData) loadDashboardData();
            } else {
                showMessage(result.error || 'Failed to delete review', 'error');
            }
        } catch (error) {
            console.error('Delete review failed', error);
            showMessage('Failed to delete review. Please try again.', 'error');
        } finally {
            setLoadingDeleteReview((prev) => {
                const copy = new Set(prev);
                copy.delete(actionKey);
                return copy;
            });
        }
    };

    const handleResolveReport = async (menuItemId, reviewId) => {
        if (!menuItemId || !reviewId) {
            showMessage('Missing menu item or review ID. Reload the page and try again.', 'error');
            return;
        }

        setLoadingResolve((prev) => new Set(prev).add(`${menuItemId}-${reviewId}`));
        try {
            const response = await fetch(`/dashboard/admin/menu-items/${menuItemId}/reviews/${reviewId}/resolve-report`, {
                method: 'PATCH'
            });
            const result = await response.json();
            if (response.ok) {
                showMessage(result.message || 'Report resolved successfully', 'success');
                if (loadDashboardData) loadDashboardData();
            } else {
                showMessage(result.error || 'Failed to resolve report', 'error');
            }
        } catch (error) {
            console.error('Resolve report failed', error);
            showMessage('Failed to resolve report. Please try again.', 'error');
        } finally {
            setLoadingResolve((prev) => {
                const copy = new Set(prev);
                copy.delete(`${menuItemId}-${reviewId}`);
                return copy;
            });
        }
    };

    const showMessage = (text, variant = 'success') => {
        setMessage({ text, variant });
        setTimeout(() => setMessage(null), 5000);
    };

    const filteredLogs = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return securityLogs
            .filter((log) => {
                const matchesUserSelection = filterUser
                    ? log.userId?._id?.toString() === filterUser
                    : true;
                const matchesSearch = !term || [
                    log.action,
                    log.details,
                    log.userId?.username,
                    log.userId?.email
                ].some(value => value?.toLowerCase().includes(term));
                return matchesUserSelection && matchesSearch;
            })
            .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
    }, [securityLogs, filterUser, searchTerm]);

    const uniqueUsers = useMemo(() => {
        const map = new Map();
        securityLogs.forEach((log) => {
            if (log.userId && log.userId._id) {
                map.set(log.userId._id, log.userId);
            }
        });
        return Array.from(map.values());
    }, [securityLogs]);

    const handleDeleteLog = async (logId) => {
        setLoadingLogs((prev) => new Set(prev).add(logId));
        try {
            const response = await fetch(`/dashboard/admin/security-logs/${logId}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (response.ok) {
                showMessage(result.message || 'Log removed successfully', 'success');
                if (loadDashboardData) loadDashboardData();
            } else {
                showMessage(result.error || 'Failed to remove log', 'error');
            }
        } catch (error) {
            console.error('Delete log failed', error);
            showMessage('Failed to remove log. Please try again.', 'error');
        } finally {
            setLoadingLogs((prev) => {
                const copy = new Set(prev);
                copy.delete(logId);
                return copy;
            });
        }
    };

    const handleToggleBan = async (userId, isBanned) => {
        setLoadingBan((prev) => new Set(prev).add(userId));
        try {
            const response = await fetch(`/dashboard/admin/user/${userId}/ban`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isBanned: !isBanned })
            });
            const result = await response.json();
            if (response.ok) {
                showMessage(result.message || `User ${!isBanned ? 'banned' : 'unbanned'} successfully`, 'success');
                if (loadDashboardData) loadDashboardData();
            } else {
                showMessage(result.error || 'Failed to update ban status', 'error');
            }
        } catch (error) {
            console.error('Toggle ban failed', error);
            showMessage('Unable to update ban status. Please try again.', 'error');
        } finally {
            setLoadingBan((prev) => {
                const copy = new Set(prev);
                copy.delete(userId);
                return copy;
            });
        }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-primary">Reports & Moderation</h2>
                    <p className="text-gray-600 mt-1 max-w-2xl">Monitor security logs by user, review reported menu items, and moderate accounts from one central panel.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('logs')}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeTab === 'logs' ? 'bg-primary text-white' : 'bg-white text-primary border border-primary hover:bg-primary hover:bg-opacity-10'}`}
                    >
                        Security Logs
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('reported')}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeTab === 'reported' ? 'bg-primary text-white' : 'bg-white text-primary border border-primary hover:bg-primary hover:bg-opacity-10'}`}
                    >
                        Reported Menu Items
                    </button>
                </div>
            </div>

            {message && (
                <div className={`mb-6 rounded-lg px-4 py-3 ${message.variant === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.text}
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
                        <input
                            type="text"
                            placeholder="Search by user, action, or details"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <select
                            value={filterUser}
                            onChange={(e) => setFilterUser(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                            <option value="">All users</option>
                            {uniqueUsers.map((user) => (
                                <option key={user._id} value={user._id}>{user.username || user.email}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => { setSearchTerm(''); setFilterUser(''); }}
                            className="w-full px-4 py-3 rounded-xl bg-secondary text-white font-semibold hover:bg-primary transition-colors"
                        >
                            Clear filters
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm text-gray-700">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Timestamp</th>
                                    <th className="px-4 py-3 font-semibold">User</th>
                                    <th className="px-4 py-3 font-semibold">Action</th>
                                    <th className="px-4 py-3 font-semibold">Type</th>
                                    <th className="px-4 py-3 font-semibold">Details</th>
                                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                                    <tr key={log._id} className="border-t border-gray-100 hover:bg-accent transition-colors">
                                        <td className="px-4 py-3 align-top text-xs text-gray-500">{new Date(log.Timestamp).toLocaleString()}</td>
                                        <td className="px-4 py-3 align-top">
                                            {log.userId ? (
                                                <div className="space-y-1">
                                                    <div className="font-medium text-gray-900">{log.userId.username || log.userId.email}</div>
                                                    <div className="text-xs text-gray-500">{log.userId.email || 'No email'}</div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500">Anonymous</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 align-top font-medium text-gray-900">{log.action}</td>
                                        <td className="px-4 py-3 align-top text-sm text-gray-600">{log.type}</td>
                                        <td className="px-4 py-3 align-top text-gray-600">{log.details || '-'}</td>
                                        <td className="px-4 py-3 align-top text-right space-x-2">
                                            {log.userId && log.userId._id && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleBan(log.userId._id, log.userId.isBanned)}
                                                    disabled={loadingBan.has(log.userId._id)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${log.userId.isBanned ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                                                >
                                                    {loadingBan.has(log.userId._id) ? '...' : log.userId.isBanned ? 'Unban' : 'Ban'}
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteLog(log._id)}
                                                disabled={loadingLogs.has(log._id)}
                                                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 text-xs font-semibold transition-colors"
                                            >
                                                {loadingLogs.has(log._id) ? 'Removing...' : 'Remove'}
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">No security logs match your filters.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'reported' && (
                <div className="grid gap-5">
                    {reportedMenuItems.length > 0 ? reportedMenuItems.map((item) => (
                        <div key={item._id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-primary">{item.name}</h3>
                                    <p className="text-sm text-gray-600">Category: {item.category || 'Unknown'} · ${item.price?.toFixed?.(2) ?? item.price ?? 'N/A'}</p>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                                    {item.reportedReviews?.length || 0} Reported Review{(item.reportedReviews?.length || 0) !== 1 ? 's' : ''}
                                </div>
                            </div>
                            <div className="bg-accent px-5 py-4 border-t border-gray-100">
                                {item.reportedReviews?.map((review) => (
                                    <div key={getReviewId(review) || review.comment} className="mb-4 last:mb-0">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-sm text-gray-700 font-medium">Review by {review.user?.username || 'Unknown reviewer'}</div>
                                            <div className="text-xs uppercase tracking-wide text-gray-500">Reported {review.reportedCount ?? 0} times</div>
                                        </div>
                                        <p className="mt-2 text-gray-700">{review.comment || 'No comment available'}</p>
                                        <div className="mt-2 text-xs text-gray-500">Rating: {review.rating} / 5</div>
                                        <div className="mt-3 flex flex-col items-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteReview(getMenuItemId(item), getReviewId(review))}
                                                disabled={!getReviewId(review) || loadingDeleteReview.has(getReviewActionKey(item, review))}
                                                className="px-3 py-1.5 rounded-lg bg-red-100 text-red-800 hover:bg-red-200 text-xs font-semibold transition-colors disabled:opacity-50"
                                            >
                                                {loadingDeleteReview.has(getReviewActionKey(item, review)) ? 'Deleting...' : 'Delete Message'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleResolveReport(getMenuItemId(item), getReviewId(review))}
                                                disabled={!getReviewId(review) || loadingResolve.has(getReviewActionKey(item, review))}
                                                className="px-3 py-1.5 rounded-lg bg-green-100 text-green-800 hover:bg-green-200 text-xs font-semibold transition-colors disabled:opacity-50"
                                            >
                                                {loadingResolve.has(getReviewActionKey(item, review)) ? 'Resolving...' : 'Resolve Report'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )) : (
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center text-gray-500">
                            No reported menu items found.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};