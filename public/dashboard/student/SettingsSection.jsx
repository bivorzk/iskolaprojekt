const SettingsSection = ({ parentLinkStatus, userData }) => {
    const [parentEmail, setParentEmail] = React.useState('');
    const [linking, setLinking] = React.useState(false);
    const [linkError, setLinkError] = React.useState('');
    const [linkSuccess, setLinkSuccess] = React.useState('');

    // 2FA state
    const [is2FAEnabled, setIs2FAEnabled] = React.useState(userData?.is2Active || false);
    const [twoFALoading, setTwoFALoading] = React.useState(false);
    const [twoFAMsg, setTwoFAMsg] = React.useState('');

    // Personal info state
    const [personalInfo, setPersonalInfo] = React.useState({ firstName: '', lastName: '', dateOfBirth: '', grade: '', school: '', street: '', city: '', state: '', postalCode: '', country: '' });
    const [piLoading, setPiLoading] = React.useState(false);
    const [piFetchLoading, setPiFetchLoading] = React.useState(true);
    const [piMsg, setPiMsg] = React.useState('');

    React.useEffect(() => {
        fetch('/dashboard/student/settings/personal-info')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) setPersonalInfo({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    dateOfBirth: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '',
                    grade: data.grade || '',
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

        fetch('/dashboard/student/settings/2fa/status')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setIs2FAEnabled(data.is2Active); })
            .catch(() => {});
    }, []);

    const handleToggle2FA = async () => {
        setTwoFALoading(true);
        setTwoFAMsg('');
        try {
            const res = await fetch('/dashboard/student/settings/2fa/toggle', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setIs2FAEnabled(data.is2Active);
                setTwoFAMsg(data.is2Active ? '2FA enabled successfully.' : '2FA disabled.');
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
            const res = await fetch('/dashboard/student/settings/personal-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName: personalInfo.firstName,
                    lastName: personalInfo.lastName,
                    dateOfBirth: personalInfo.dateOfBirth || undefined,
                    grade: personalInfo.grade || undefined,
                    school: personalInfo.school || undefined,
                    address: { street: personalInfo.street, city: personalInfo.city, state: personalInfo.state, postalCode: personalInfo.postalCode, country: personalInfo.country }
                })
            });
            const data = await res.json();
            setPiMsg(res.ok ? 'Personal information saved.' : (data.error || 'Failed to save.'));
        } catch { setPiMsg('Network error.'); } finally { setPiLoading(false); }
        setTimeout(() => setPiMsg(''), 5000);
    };

    const handleLinkParent = async (e) => {
        e.preventDefault();
        if (!parentEmail.trim()) {
            setLinkError('Please enter a parent email address');
            return;
        }

        setLinking(true);
        setLinkError('');
        setLinkSuccess('');

        try {
            const response = await fetch('/dashboard/student/parent/link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ parentEmail: parentEmail.trim() })
            });

            const data = await response.json();

            if (response.ok) {
                setLinkSuccess('Parent link request sent successfully! Waiting for approval.');
                setParentEmail('');
                // Don't refresh immediately since it's pending
            } else {
                setLinkError(data.error || 'Failed to link parent');
            }
        } catch (error) {
            console.error('Link parent error:', error);
            setLinkError('Failed to link parent. Please try again.');
        } finally {
            setLinking(false);
        }
    };

    const handleUnlinkParent = async () => {
        if (!confirm('Are you sure you want to unlink from your parent?')) {
            return;
        }

        try {
            const response = await fetch('/dashboard/student/parent/unlink', {
                method: 'GET'
            });

            if (response.ok) {
                setLinkSuccess('Parent unlinked successfully!');
                // Refresh the page to update the parent link status
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                setLinkError('Failed to unlink parent');
            }
        } catch (error) {
            console.error('Unlink parent error:', error);
            setLinkError('Failed to unlink parent. Please try again.');
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-primary mb-6">Settings</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Account Details</h3>
                            <div className="text-sm text-gray-600">
                                <p><span className="font-medium">Email:</span> {userData.email}</p>
                                <p><span className="font-medium">Username:</span> {userData.username}</p>
                                <p><span className="font-medium">Email Verified:</span> {userData.IsVerified ? 'Yes' : 'No'}</p>
                                <p><span className="font-medium">Account Created:</span> {userData.createdAt && !isNaN(new Date(userData.createdAt).getTime()) ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}</p>
                            </div>
                        </div>

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
                            {twoFAMsg && <p className={`mt-2 text-sm ${twoFAMsg.includes('success') || twoFAMsg.includes('enabled') || twoFAMsg.includes('disabled') ? 'text-green-600' : 'text-red-600'}`}>{twoFAMsg}</p>}
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
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                                    <input type="date" value={personalInfo.dateOfBirth} onChange={e => setPersonalInfo({...personalInfo, dateOfBirth: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Grade</label>
                                    <select value={personalInfo.grade} onChange={e => setPersonalInfo({...personalInfo, grade: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
                                        <option value="">Select grade</option>
                                        {['1st Grade','2nd Grade','3rd Grade','4th Grade','5th Grade','6th Grade','7th Grade','8th Grade','9th Grade','10th Grade','11th Grade','12th Grade','13th Grade'].map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">School</label>
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

                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Parent Account Link</h3>
                    <div className="text-sm text-gray-600 mb-4">
                        {parentLinkStatus.linked ? (
                            <div>
                                <p className="text-green-600 mb-2">
                                    <span className="font-medium">✅ Linked to parent account:</span><br/>
                                    {parentLinkStatus.parentEmail}
                                </p>
                                <button
                                    onClick={handleUnlinkParent}
                                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                                >
                                    Unlink Parent
                                </button>
                            </div>
                        ) : (
                            <div>
                                <p className="text-gray-500 mb-4">Link your account to a parent for money transfers and monitoring.</p>
                                <form onSubmit={handleLinkParent} className="space-y-3">
                                    <div>
                                        <label htmlFor="parentEmail" className="block text-sm font-medium text-gray-700 mb-1">
                                            Parent Email Address
                                        </label>
                                        <input
                                            type="email"
                                            id="parentEmail"
                                            value={parentEmail}
                                            onChange={(e) => setParentEmail(e.target.value)}
                                            placeholder="parent@example.com"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={linking}
                                        className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {linking ? 'Linking...' : 'Link Parent Account'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                    {linkError && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-600 text-sm">{linkError}</p>
                        </div>
                    )}
                    {linkSuccess && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-green-600 text-sm">{linkSuccess}</p>
                        </div>
                    )}
                    <div className="mt-4">
                        <p className="text-xs text-gray-500">
                            {parentLinkStatus.linked
                                ? 'Your parent can now transfer money to your account and monitor your spending.'
                                : 'Enter your parent\'s email address. They must approve your link request before you can receive transfers.'
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};