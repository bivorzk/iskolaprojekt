import React from 'react';
import { useParentData } from './useParentData';

export default function ParentOrdersSection() {
  const { orders } = useParentData();

  return (
    <section id="orders" className="mt-6">
      <h2 className="text-lg font-semibold mb-2">Recent Orders</h2>
      <ul className="space-y-2">
        {orders.map(order => (
          <li key={order._id} className="p-2 border rounded hover:bg-gray-50">
            {order.studentName} - {order.total} - {order.status} - {new Date(order.createdAt).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </section>
  );
}





