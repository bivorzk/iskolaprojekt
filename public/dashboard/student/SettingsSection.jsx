const SettingsSection = ({ parentLinkStatus, userData }) => {
    const [parentEmail, setParentEmail] = React.useState('');
    const [linking, setLinking] = React.useState(false);
    const [linkError, setLinkError] = React.useState('');
    const [linkSuccess, setLinkSuccess] = React.useState('');

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
                    </div>
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