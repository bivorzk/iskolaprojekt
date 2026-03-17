// ── User type badge helper ────────────────────────────────────────────────────
const UserTypeBadge = ({ usertype }) => {
    const colours = {
        admin:   'bg-red-100 text-red-800',
        student: 'bg-blue-100 text-blue-800',
        parent:  'bg-purple-100 text-purple-800',
        teacher: 'bg-yellow-100 text-yellow-800',
        editor:  'bg-cyan-100 text-cyan-800',
        frozen:  'bg-gray-100 text-gray-600',
    };
    return (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colours[usertype] || 'bg-green-100 text-green-800'}`}>
            {usertype.toUpperCase()}
        </span>
    );
};

// ── User Info Popup ────────────────────────────────────────────────────────────
const UserInfoPopup = ({ user, onClose, onUpdated }) => {
    const { useState: useLocalState } = React;
    const [selectedRole, setSelectedRole] = useLocalState(user.usertype);
    const [roleLoading, setRoleLoading] = useLocalState(false);
    const [banLoading, setBanLoading] = useLocalState(false);
    const [message, setMessage] = useLocalState(null); // { text, type: 'success'|'error' }

    const showMsg = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleRoleChange = async () => {
        if (selectedRole === user.usertype) return;
        setRoleLoading(true);
        try {
            const res = await fetch(`/dashboard/admin/user/${user._id}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usertype: selectedRole }),
            });
            const data = await res.json();
            if (res.ok) {
                showMsg(`Role changed to ${selectedRole} successfully`);
                onUpdated();
            } else {
                showMsg(data.error || 'Failed to change role', 'error');
                setSelectedRole(user.usertype);
            }
        } catch {
            showMsg('Network error', 'error');
        } finally {
            setRoleLoading(false);
        }
    };

    const handleBanToggle = async () => {
        const newBanState = !user.isBanned;
        setBanLoading(true);
        try {
            const res = await fetch(`/dashboard/admin/user/${user._id}/ban`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isBanned: newBanState }),
            });
            const data = await res.json();
            if (res.ok) {
                showMsg(newBanState ? 'User banned' : 'User unbanned');
                onUpdated();
                onClose();
            } else {
                showMsg(data.error || 'Failed to update ban status', 'error');
            }
        } catch {
            showMsg('Network error', 'error');
        } finally {
            setBanLoading(false);
        }
    };

    const allowedRoles = ['student', 'parent', 'teacher', 'frozen', 'editor'];
    const isAdmin = user.usertype === 'admin';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-secondary px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white bg-opacity-25 rounded-full p-2">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg leading-tight">{user.username}</h3>
                            <p className="text-white text-opacity-80 text-xs">{user.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white hover:text-accent transition-colors p-1 rounded-full hover:bg-white hover:bg-opacity-20">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Notification banner */}
                {message && (
                    <div className={`px-6 py-2 text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border-b border-green-200' : 'bg-red-50 text-red-700 border-b border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                {/* Info grid */}
                <div className="px-6 py-4 grid grid-cols-2 gap-3">
                    <div className="bg-accent rounded-xl p-3">
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Role</p>
                        <UserTypeBadge usertype={user.usertype} />
                    </div>
                    <div className="bg-accent rounded-xl p-3">
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Status</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${user.isBanned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.isBanned ? 'bg-red-500' : 'bg-green-500'}`}></span>
                            {user.isBanned ? 'Banned' : 'Active'}
                        </span>
                    </div>
                    <div className="bg-accent rounded-xl p-3">
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Verified</p>
                        <span className={`text-sm font-semibold ${user.isVerified ? 'text-green-600' : 'text-red-500'}`}>
                            {user.isVerified ? '✓ Yes' : '✗ No'}
                        </span>
                    </div>
                    <div className="bg-accent rounded-xl p-3">
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Balance</p>
                        <span className="text-sm font-semibold text-gray-800">{user.balance ?? 0} pts</span>
                    </div>
                    <div className="bg-accent rounded-xl p-3 col-span-2">
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Joined</p>
                        <span className="text-sm text-gray-800">{new Date(user.createdAt).toLocaleString()}</span>
                    </div>
                    {user.lastActive && (
                        <div className="bg-accent rounded-xl p-3 col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Last Active</p>
                            <span className="text-sm text-gray-800">{new Date(user.lastActive).toLocaleString()}</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {!isAdmin && (
                    <div className="px-6 pb-5 space-y-3 border-t border-gray-100 pt-4">
                        {/* Change Role */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Change Role</label>
                            <div className="flex gap-2">
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-800"
                                >
                                    {allowedRoles.map(r => (
                                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleRoleChange}
                                    disabled={roleLoading || selectedRole === user.usertype}
                                    className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                >
                                    {roleLoading ? (
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                    Apply
                                </button>
                            </div>
                        </div>

                        {/* Ban / Unban */}
                        <button
                            onClick={handleBanToggle}
                            disabled={banLoading}
                            className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                                user.isBanned
                                    ? 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100'
                                    : 'bg-red-50 text-red-700 border border-red-300 hover:bg-red-100'
                            }`}
                        >
                            {banLoading ? (
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                </svg>
                            ) : user.isBanned ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            )}
                            {user.isBanned ? 'Unban User' : 'Ban User'}
                        </button>
                    </div>
                )}
                {isAdmin && (
                    <div className="px-6 pb-5 pt-1">
                        <p className="text-xs text-gray-400 text-center">Administrator accounts cannot be modified.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Quick-action ban button (inline in row) ───────────────────────────────────
const QuickBanButton = ({ user, onUpdated }) => {
    const { useState: useLocalState } = React;
    const [loading, setLoading] = useLocalState(false);

    const handleClick = async (e) => {
        e.stopPropagation();
        if (user.usertype === 'admin') return;
        const newBanState = !user.isBanned;
        if (!confirm(`${newBanState ? 'Ban' : 'Unban'} ${user.username}?`)) return;
        setLoading(true);
        try {
            await fetch(`/dashboard/admin/user/${user._id}/ban`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isBanned: newBanState }),
            });
            onUpdated();
        } catch { /* silent */ } finally { setLoading(false); }
    };

    if (user.usertype === 'admin') return null;
    return (
        <button
            onClick={handleClick}
            disabled={loading}
            title={user.isBanned ? 'Unban user' : 'Ban user'}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${user.isBanned ? 'text-green-600 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'}`}
        >
            {loading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
            ) : user.isBanned ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
            )}
        </button>
    );
};

// ── Quick-action role dropdown (inline in row) ────────────────────────────────
const QuickRoleButton = ({ user, onUpdated }) => {
    const { useState: useLocalState } = React;
    const [open, setOpen] = useLocalState(false);
    const [loading, setLoading] = useLocalState(false);
    const allowedRoles = ['student', 'parent', 'teacher', 'frozen', 'editor'];

    if (user.usertype === 'admin') return null;

    const handleSelect = async (e, role) => {
        e.stopPropagation();
        setOpen(false);
        if (role === user.usertype) return;
        setLoading(true);
        try {
            await fetch(`/dashboard/admin/user/${user._id}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usertype: role }),
            });
            onUpdated();
        } catch { /* silent */ } finally { setLoading(false); }
    };

    return (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                disabled={loading}
                title="Change role"
                className="p-1.5 rounded-lg text-primary hover:bg-accent transition-colors disabled:opacity-50"
            >
                {loading ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                )}
            </button>
            {open && (
                <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                    {allowedRoles.map(role => (
                        <button
                            key={role}
                            onClick={(e) => handleSelect(e, role)}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors ${role === user.usertype ? 'bg-accent text-primary font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                        >
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Main Users Section ─────────────────────────────────────────────────────────
const UsersSection = ({ users, loadDashboardData }) => {
    const { useState } = React;
    const [selectedUser, setSelectedUser] = useState(null);

    const handleRowClick = (user) => setSelectedUser(user);
    const handleClose = () => setSelectedUser(null);
    const handleUpdated = () => {
        if (loadDashboardData) loadDashboardData();
        setSelectedUser(null);
    };

    return (
        <div>
            <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-6">User Management</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                                <th className="hidden sm:table-cell px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="hidden md:table-cell px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Joined</th>
                                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user, index) => (
                                <tr
                                    key={user._id || index}
                                    className={`hover:bg-accent cursor-pointer transition-colors ${user.isBanned ? 'opacity-60' : ''}`}
                                    onClick={() => handleRowClick(user)}
                                    title="Click for details"
                                >
                                    <td className="px-3 py-4 text-sm font-medium text-gray-900">
                                        <div className="flex items-center gap-1.5">
                                            {user.isBanned && (
                                                <span title="Banned" className="text-red-400">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                    </svg>
                                                </span>
                                            )}
                                            <div className="max-w-32 overflow-hidden">
                                                <div className="truncate" title={user.username}>{user.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="hidden sm:table-cell px-3 py-4 text-sm text-gray-500 text-center">
                                        <div className="truncate max-w-48" title={user.email}>{user.email}</div>
                                    </td>
                                    <td className="px-3 py-4 text-center">
                                        <UserTypeBadge usertype={user.usertype} />
                                    </td>
                                    <td className="hidden md:table-cell px-3 py-4 text-sm text-gray-500 text-right">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-3 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <QuickBanButton user={user} onUpdated={() => { if (loadDashboardData) loadDashboardData(); }} />
                                            <QuickRoleButton user={user} onUpdated={() => { if (loadDashboardData) loadDashboardData(); }} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedUser && (
                <UserInfoPopup
                    user={selectedUser}
                    onClose={handleClose}
                    onUpdated={handleUpdated}
                />
            )}
        </div>
    );
};