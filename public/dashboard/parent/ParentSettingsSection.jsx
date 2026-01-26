const ParentSettingsSection = () => {
    return (
        <div>
            <h2 className="text-2xl font-bold text-primary mb-6">Settings</h2>
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
                </div>
            </div>
        </div>
    );
};
