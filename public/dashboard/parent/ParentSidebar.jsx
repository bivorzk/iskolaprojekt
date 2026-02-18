import React from 'react';

export default function ParentSidebar() {
  return (
    <aside className="bg-gray-800 text-white w-64 min-h-screen p-4 hidden md:block">
      <nav className="flex flex-col space-y-2">
        <a href="#students" className="hover:bg-gray-700 p-2 rounded">Students</a>
        <a href="#stats" className="hover:bg-gray-700 p-2 rounded">Stats</a>
        <a href="#orders" className="hover:bg-gray-700 p-2 rounded">Orders</a>
        <a href="#settings" className="hover:bg-gray-700 p-2 rounded">Settings</a>
      </nav>
    </aside>
  );
}



                    
