import React from 'react';
import { useParentData } from './useParentData';

export default function ParentStatsSection() {
  const { stats } = useParentData();

  return (
    <section id="stats" className="mt-6">
      <h2 className="text-lg font-semibold mb-2">Stats</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded">Total Students: {stats.totalStudents}</div>
        <div className="p-4 border rounded">Active Children: {stats.activeChildren}</div>
        <div className="p-4 border rounded">Orders Made: {stats.ordersMade}</div>
        <div className="p-4 border rounded">Total Payments: {stats.totalPayments}</div>
        <div className="p-4 border rounded">Balance: {stats.balance}</div>
      </div>
    </section>
  );
}


