const ParentSettingsSection = ({ userData }) => {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Settings</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50 p-6 rounded-lg">
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
                            <div className="text-sm text-gray-600 space-y-1">
                                <p><span className="font-medium">Email:</span> {userData.email || 'N/A'}</p>
                                <p><span className="font-medium">Username:</span> {userData.username || 'N/A'}</p>
                                <p><span className="font-medium">Account Type:</span> Parent</p>
                                <p><span className="font-medium">Email Verified:</span> {userData.IsVerified ? 'Yes' : 'No'}</p>
                                <p><span className="font-medium">Account Created:</span> {userData.createdAt && !isNaN(new Date(userData.createdAt).getTime()) ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Student Management</h3>
                    <div className="text-sm text-gray-600">
                        <p className="mb-4">Students can link to your account by entering your email address in their dashboard settings.</p>
                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-blue-800 font-medium">Your Email for Linking:</p>
                            <p className="text-blue-600 font-mono">{userData.email || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-xs text-gray-500">Make sure your email is correct so students can find and link to your account.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};


