const ParentStudentsSection = ({ students }) => {
    return (
        <div>
            <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-6">Student Management</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                                <th className="hidden sm:table-cell px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Class</th>
                                <th className="hidden md:table-cell px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {students.map((student, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-3 py-4 text-sm font-medium text-gray-900">
                                        <div className="max-w-32 overflow-hidden">
                                            <div className="truncate" title={student.name}>{student.name}</div>
                                        </div>
                                    </td>
                                    <td className="hidden sm:table-cell px-3 py-4 text-sm text-gray-500 text-center">
                                        <div className="truncate max-w-48" title={student.email}>{student.email}</div>
                                    </td>
                                    <td className="px-3 py-4 text-center">
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {student.class || '—'}
                                        </span>
                                    </td>
                                    <td className="hidden md:table-cell px-3 py-4 text-sm text-gray-500 text-right">
                                        {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '—'}
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

export default ParentStudentsSection;

