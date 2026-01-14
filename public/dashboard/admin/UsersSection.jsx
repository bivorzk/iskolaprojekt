const UsersSection = ({ users }) => {
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
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="px-3 py-4 text-sm font-medium text-gray-900">
                                    <div className="max-w-32 overflow-hidden">
                                        <div className="truncate" title={user.username}>{user.username}</div>
                                    </div>
                                </td>
                                <td className="hidden sm:table-cell px-3 py-4 text-sm text-gray-500 text-center">
                                    <div className="truncate max-w-48" title={user.email}>{user.email}</div>
                                </td>
                                <td className="px-3 py-4 text-center">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        user.usertype === 'admin'
                                            ? 'bg-red-100 text-red-800'
                                            : user.usertype === 'student'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-green-100 text-green-800'
                                    }`}>
                                        {user.usertype.toUpperCase()}
                                    </span>
                                </td>
                                <td className="hidden md:table-cell px-3 py-4 text-sm text-gray-500 text-right">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
};