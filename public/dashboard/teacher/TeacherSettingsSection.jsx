const TeacherSettingsSection = ({ userData }) => {
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
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Account details - WIP</h3>
                            <div className="text-sm text-gray-600">
                                <p><span className="font-medium">Email:</span> {userData.email}</p>
                                <p><span className="font-medium">Full Name:</span> {userData.fullName}</p>
                                <p><span className="font-medium">Teacher ID:</span> {userData.teacherId || 'N/A'}</p>
                                <p><span className="font-medium">Email verification status:</span> {userData.IsVerified}</p>
                                <p><span className="font-medium">Account Creation date:</span> {userData.createdAt && !isNaN(new Date(userData.createdAt).getTime()) ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'} </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};