import { useState, useEffect } from 'react';

export function useParentData() {
  const [students, setStudents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [welcome, setWelcome] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [studentRes, ordersRes, statsRes, welcomeRes] = await Promise.all([
          fetch('/dashboard/parent/studentlist'),
          fetch('/dashboard/parent/orders'),
          fetch('/dashboard/parent/stats'),
          fetch('/dashboard/parent/welcome-message')
        ]);

        const studentData = await studentRes.json();
        setStudents(studentData.students || []);

        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);

        const statsData = await statsRes.json();
        setStats(statsData);

        const welcomeData = await welcomeRes.json();
        setWelcome(welcomeData.message || '');
      } catch (err) {
        console.error('Error fetching parent data:', err);
      }
    }

    fetchData();
  }, []);

  return { students, orders, stats, welcome };
}


