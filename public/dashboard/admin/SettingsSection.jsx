const SettingsSection = ({ userData }) => {
    // 2FA state
    const [is2FAEnabled, setIs2FAEnabled] = React.useState(false);
    const [twoFALoading, setTwoFALoading] = React.useState(false);
    const [twoFAMsg, setTwoFAMsg] = React.useState('');

    // Personal info state
    const [personalInfo, setPersonalInfo] = React.useState({ firstName: '', lastName: '', dateOfBirth: '', school: '', street: '', city: '', state: '', postalCode: '', country: '' });
    const [piLoading, setPiLoading] = React.useState(false);
    const [piFetchLoading, setPiFetchLoading] = React.useState(true);
    const [piMsg, setPiMsg] = React.useState('');

    React.useEffect(() => {
        fetch('/dashboard/admin/settings/personal-info')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) setPersonalInfo({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    dateOfBirth: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '',
                    school: data.school || '',
                    street: data.address?.street || '',
                    city: data.address?.city || '',
                    state: data.address?.state || '',
                    postalCode: data.address?.postalCode || '',
                    country: data.address?.country || ''
                });
            })
            .catch(() => {})
            .finally(() => setPiFetchLoading(false));

        fetch('/dashboard/admin/settings/2fa/status')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setIs2FAEnabled(data.is2Active); })
            .catch(() => {});
    }, []);

    const handleToggle2FA = async () => {
        setTwoFALoading(true);
        setTwoFAMsg('');
        try {
            const res = await fetch('/dashboard/admin/settings/2fa/toggle', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setIs2FAEnabled(data.is2Active);
                setTwoFAMsg(data.is2Active ? '2FA enabled.' : '2FA disabled.');
            } else {
                setTwoFAMsg(data.error || 'Failed to toggle 2FA.');
            }
        } catch { setTwoFAMsg('Network error.'); } finally { setTwoFALoading(false); }
        setTimeout(() => setTwoFAMsg(''), 4000);
    };

    const handleSavePersonalInfo = async (e) => {
        e.preventDefault();
        setPiLoading(true);
        setPiMsg('');
        try {
            const res = await fetch('/dashboard/admin/settings/personal-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName: personalInfo.firstName,
                    lastName: personalInfo.lastName,
                    dateOfBirth: personalInfo.dateOfBirth || undefined,
                    school: personalInfo.school || undefined,
                    address: { street: personalInfo.street, city: personalInfo.city, state: personalInfo.state, postalCode: personalInfo.postalCode, country: personalInfo.country }
                })
            });
            const data = await res.json();
            setPiMsg(res.ok ? 'Personal information saved.' : (data.error || 'Failed to save.'));
        } catch { setPiMsg('Network error.'); } finally { setPiLoading(false); }
        setTimeout(() => setPiMsg(''), 5000);
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-primary mb-6">Settings</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Account Settings */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Account Settings</h3>
                            <a
                                href="/password_reset.html"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                            >
                                Change Password
                            </a>
                        </div>
                        {userData && (
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Account Details</h3>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p><span className="font-medium">Email:</span> {userData.email || 'N/A'}</p>
                                    <p><span className="font-medium">Username:</span> {userData.username || 'N/A'}</p>
                                    <p><span className="font-medium">Account Created:</span> {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}</p>
                                </div>
                            </div>
                        )}
                        {/* 2FA Toggle */}
                        <div className="border-t pt-4">
                            <h3 className="text-lg font-medium text-gray-900 mb-1">Two-Factor Authentication</h3>
                            <p className="text-sm text-gray-500 mb-3">Use the SnapTray mobile app to approve logins.</p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleToggle2FA}
                                    disabled={twoFALoading}
                                    aria-label="Toggle Two-Factor Authentication"
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 ${is2FAEnabled ? 'bg-primary' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${is2FAEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Enable Two-Factor Authentication</p>
                                    <p className="text-xs text-gray-500">{is2FAEnabled ? '\u2713 Currently active' : 'Currently inactive'}</p>
                                </div>
                            </div>
                            {twoFAMsg && <p className={`mt-2 text-sm ${twoFAMsg.includes('error') || twoFAMsg.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>{twoFAMsg}</p>}
                        </div>
                    </div>
                </div>

                {/* Personal Information */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                    {piFetchLoading ? (
                        <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
                    ) : (
                        <form onSubmit={handleSavePersonalInfo} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                                    <input type="text" value={personalInfo.firstName} onChange={e => setPersonalInfo({...personalInfo, firstName: e.target.value})} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                                    <input type="text" value={personalInfo.lastName} onChange={e => setPersonalInfo({...personalInfo, lastName: e.target.value})} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                                <input type="date" value={personalInfo.dateOfBirth} onChange={e => setPersonalInfo({...personalInfo, dateOfBirth: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Institution</label>
                                <input type="text" value={personalInfo.school} onChange={e => setPersonalInfo({...personalInfo, school: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Street Address</label>
                                <input type="text" value={personalInfo.street} onChange={e => setPersonalInfo({...personalInfo, street: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                                    <input type="text" value={personalInfo.city} onChange={e => setPersonalInfo({...personalInfo, city: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Postal Code</label>
                                    <input type="text" value={personalInfo.postalCode} onChange={e => setPersonalInfo({...personalInfo, postalCode: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">State / Province</label>
                                    <input type="text" value={personalInfo.state} onChange={e => setPersonalInfo({...personalInfo, state: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
                                    <input type="text" value={personalInfo.country} onChange={e => setPersonalInfo({...personalInfo, country: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                            </div>
                            {piMsg && <p className={`text-sm ${piMsg.includes('saved') ? 'text-green-600' : 'text-red-600'}`}>{piMsg}</p>}
                            <button type="submit" disabled={piLoading} className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-secondary disabled:opacity-50 transition-colors text-sm font-medium">
                                {piLoading ? 'Saving...' : 'Save Personal Information'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};