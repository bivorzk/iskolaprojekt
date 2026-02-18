import React from 'react';
import { useParentData } from './useParentData';

export default function ParentStudentsSection() {
  const { students } = useParentData();

  return (
    <section id="students" className="mt-6">
      <h2 className="text-lg font-semibold mb-2">Your Students</h2>
      <ul className="space-y-1">
        {students.map(student => (
          <li key={student.id} className="p-2 border rounded hover:bg-gray-100">
            {student.name} ({student.email}) - Balance: {student.balance}
          </li>
        ))}
      </ul>
    </section>
  );
}


