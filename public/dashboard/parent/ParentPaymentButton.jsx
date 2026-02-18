import React, { useState } from "react";

const ParentPaymentButton = ({ orderId, studentId, amount, onPaid }) => {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/parent/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, studentId, amount }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Payment successful!");
        if (onPaid) onPaid(orderId);
      } else {
        alert("Payment failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Payment error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
    >
      {loading ? "Paying..." : "Pay"}
    </button>
  );
};

export default ParentPaymentButton;


