import React from 'react';

export default function ParentPaymentButton() {
  const handlePay = async () => {
    try {
      const res = await fetch('/api/parent/pay', { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'Payment processed');
    } catch (err) {
      console.error('Payment error:', err);
      alert('Payment failed');
    }
  };

  return (
    <button onClick={handlePay} className="mt-4 p-2 bg-green-500 text-white rounded hover:bg-green-600">
      Pay Now
    </button>
  );
}


