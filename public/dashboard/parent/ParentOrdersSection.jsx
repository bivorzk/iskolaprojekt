import React from "react";
import ParentPaymentButton from "./ParentPaymentButton";

const ParentOrdersSection = ({ orders, onOrderPaid }) => {
  if (!orders || orders.length === 0) {
    return <p>Nincs fizetendő rendelés.</p>;
  }

  return (
    <div className="space-y-2">
      {orders.map(order => (
        <div
          key={order.id}
          className="flex items-center justify-between border p-2 rounded"
        >
          <div>
            <p className="font-semibold">Rendelés #{order.id}</p>
            <p className="text-sm text-gray-600">
              Összeg: {order.amount} Ft
            </p>
          </div>

          <ParentPaymentButton
            orderId={order.id}
            studentId={order.studentId}
            amount={order.amount}
            onPaid={onOrderPaid}
          />
        </div>
      ))}
    </div>
  );
};

export default ParentOrdersSection;




