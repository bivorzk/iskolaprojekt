import React from 'react';
import { useParentData } from './useParentData';

export default function ParentHeader() {
  const { welcome } = useParentData();

  return (
    <header className="bg-blue-500 text-white p-4 rounded-md shadow">
      <h1 className="text-xl font-bold">{welcome}</h1>
    </header>
  );
}


