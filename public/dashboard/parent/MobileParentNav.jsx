import React from 'react';

export default function MobileParentNav() {
  return (
    <nav className="md:hidden bg-gray-800 text-white fixed bottom-0 left-0 right-0 flex justify-around p-2">
      <a href="#students">Students</a>
      <a href="#stats">Stats</a>
      <a href="#orders">Orders</a>
      <a href="#settings">Settings</a>
    </nav>
  );
}

