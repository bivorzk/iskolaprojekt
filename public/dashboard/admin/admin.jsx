const { useState, useEffect, useRef } = React;

const AdminDashboard = () => {
    const [activeSection, setActiveSection] = useState('users');
    const [stats, setStats] = useState({
        totalUsers: '--',
        activeSessions: '--',
        ordersMade: '--',
        totalMenuItems: '--',
        paymentStats: '--'
    });
    const [users, setUsers] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [signupData, setSignupData] = useState([]);
    const [welcomeMessage, setWelcomeMessage] = useState('Welcome, Admin');
    const [menuForm, setMenuForm] = useState({
        id: '',
        name: '',
        description: '',
        stock: '',
        price: '',
        category: '',
        allergens: '',
        calories: '',
        protein: '',
        healthScore: ''
    });
    const [loading, setLoading] = useState(true);
    const chartRef = useRef(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    useEffect(() => {
        if (activeSection === 'stats' && signupData.length > 0) {
            renderChart();
        }
    }, [activeSection, signupData]);

    const loadDashboardData = async () => {
        try {
            const [userCountRes, ordersRes, userListRes, signupStatsRes, menuItemsRes, welcomeRes] = await Promise.all([
                fetch('/dashboard/admin/usercount'),
                fetch('/dashboard/admin/orders'),
                fetch('/dashboard/admin/userlist'),
                fetch('/dashboard/admin/signup-stats'),
                fetch('/dashboard/admin/menulist'),
                fetch('/dashboard/admin/welcome-message')
            ]);

            // Check if all responses are ok
            if (!userCountRes.ok) console.error('usercount failed:', userCountRes.status);
            if (!ordersRes.ok) console.error('orders failed:', ordersRes.status);
            if (!userListRes.ok) console.error('userlist failed:', userListRes.status);
            if (!signupStatsRes.ok) console.error('signup-stats failed:', signupStatsRes.status);
            if (!menuItemsRes.ok) console.error('menulist failed:', menuItemsRes.status);
            if (!welcomeRes.ok) console.error('welcome-message failed:', welcomeRes.status);

            const [userCount, orders, userList, signupStats, menuData, welcome] = await Promise.all([
                userCountRes.json(),
                ordersRes.json(),
                userListRes.json(),
                signupStatsRes.json(),
                menuItemsRes.json(),
                welcomeRes.json()
            ]);

            console.log('API responses:', { userCount, orders, userList, signupStats, menuData, welcome });

            setStats({
                totalUsers: userCount.total || '--',
                activeSessions: '--', // This might need a separate endpoint
                ordersMade: orders.total || '--',
                totalMenuItems: menuData.menuItems ? menuData.menuItems.length : '--',
                paymentStats: '--' // This might need a separate endpoint
            });

            setUsers(userList.users || []);
            setSignupData(signupStats || []);
            setMenuItems(menuData.menuItems || []);
            setWelcomeMessage(welcome.message || 'Welcome, Admin');
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Set fallback values
            setStats({
                totalUsers: '--',
                activeSessions: '--',
                ordersMade: '--',
                totalMenuItems: '--',
                paymentStats: '--'
            });
        } finally {
            setLoading(false);
        }
    };

    const renderChart = () => {
        const ctx = document.getElementById('signupChart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const labels = signupData.map(item => `${item._id.year}-${item._id.month}-${item._id.day}`);
        const counts = signupData.map(item => item.count);

        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Registrations',
                    data: counts,
                    borderColor: '#FF6B35',
                    backgroundColor: 'rgba(255, 107, 53, 0.2)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'User Registrations Over Time'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Registrations'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    };

    const handleMenuFormSubmit = async (e) => {
        e.preventDefault();

        // Validate health score
        const healthScore = parseInt(menuForm.healthScore) || 0;
        if (healthScore < 0 || healthScore > 100) {
            alert('Health Score must be between 0 and 100');
            return;
        }

        try {
            const method = menuForm.id ? 'PUT' : 'POST';
            const url = menuForm.id ? `/dashboard/admin/menuitem/${menuForm.id}` : '/dashboard/admin/create_menuitem';

            // Prepare the data in the format expected by the backend
            const submitData = {
                name: menuForm.name,
                description: menuForm.description,
                stock: parseInt(menuForm.stock) || 0,
                price: parseFloat(menuForm.price) || 0,
                category: menuForm.category,
                allergens: menuForm.allergens ? menuForm.allergens.split(',').map(item => item.trim()) : [],
                nutritionalInfo: {
                    calories: parseInt(menuForm.calories) || 0,
                    protein: parseInt(menuForm.protein) || 0
                },
                healthScore: parseInt(menuForm.healthScore) || 0,
                available: parseInt(menuForm.stock) > 0
            };

            // Only include _id for updates, not for new items
            if (menuForm.id) {
                submitData._id = menuForm.id;
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submitData),
            });

            if (response.ok) {
                setMenuForm({
                    id: '',
                    name: '',
                    description: '',
                    stock: '',
                    price: '',
                    category: '',
                    allergens: '',
                    calories: '',
                    protein: '',
                    healthScore: ''
                });
                loadDashboardData(); // Reload menu items
                alert(menuForm.id ? 'Menu item updated successfully!' : 'Menu item created successfully!');
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.error || 'Failed to save menu item'}`);
            }
        } catch (error) {
            console.error('Error saving menu item:', error);
            alert('Error saving menu item. Please try again.');
        }
    };

    const handleMenuFormChange = (e) => {
        const { name, value } = e.target;
        setMenuForm({
            ...menuForm,
            [name]: value
        });
    };

    const editMenuItem = (item) => {
        setMenuForm(item);
    };

    const deleteMenuItem = async (id) => {
        if (!confirm('Are you sure you want to delete this menu item?')) return;
        try {
            const response = await fetch(`/dashboard/admin/delete_menuitem/${id}`);
            if (response.ok) {
                loadDashboardData(); // Reload menu items
            }
        } catch (error) {
            console.error('Error deleting menu item:', error);
        }
    };

    const exportMenuItems = () => {
        const csvContent = [
            ['Name', 'Description', 'Category', 'Stock', 'Price', 'Available', 'Allergens', 'Calories', 'Protein', 'Health Score'],
            ...menuItems.map(item => [
                item.name,
                item.description,
                item.category,
                item.stock,
                item.price,
                item.available ? 'Yes' : 'No',
                item.allergens?.join(', ') || '',
                item.calories || '',
                item.protein || '',
                item.healthScore || ''
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'menu-items.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-accent to-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-accent to-white">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="flex justify-between items-center py-4 w-full">
                    <div className="flex items-center space-x-4 px-4 sm:px-6 lg:px-8">
                        <svg viewBox="0 0 500 140" className="h-20 w-auto">
                            <rect x="25" y="55" width="90" height="50" rx="6" fill="#FF6B35"/>
                            <rect x="30" y="60" width="35" height="40" rx="3" fill="#FFE5DC"/>
                            <rect x="70" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                            <rect x="95" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                            <rect x="70" y="82" width="45" height="18" rx="3" fill="#FFE5DC"/>
                            <path d="M80 25 L65 52 L75 52 L60 80 L85 50 L75 50 L90 25 Z" fill="#FFC857" stroke="#FF6B35" strokeWidth="2" strokeLinejoin="round"/>
                            <text x="150" y="85" fontFamily="system-ui, -apple-system, sans-serif" fontSize="32" fontWeight="bold" fill="#FF6B35" letterSpacing="-1">SnapTray</text>
                            <text x="150" y="105" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fill="#6C757D" letterSpacing="2">ADMIN PANEL</text>
                        </svg>
                    </div>
                    <div className="flex items-center space-x-4 pr-4 sm:pr-6 lg:pr-8">
                        <span className="text-gray-700">{welcomeMessage}</span>
                        <a href="/logout" className="text-primary hover:text-secondary font-medium">Logout</a>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside className="w-64 bg-white shadow-lg min-h-screen">
                    <nav className="mt-8">
                        <div className="px-4 space-y-2">
                            <button
                                onClick={() => setActiveSection('users')}
                                className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                                    activeSection === 'users'
                                        ? 'bg-primary text-white'
                                        : 'text-gray-700 hover:bg-accent hover:text-primary'
                                }`}
                            >
                                Users
                            </button>
                            <button
                                onClick={() => setActiveSection('stats')}
                                className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                                    activeSection === 'stats'
                                        ? 'bg-primary text-white'
                                        : 'text-gray-700 hover:bg-accent hover:text-primary'
                                }`}
                            >
                                Statistics
                            </button>
                            <button
                                onClick={() => setActiveSection('menu-items')}
                                className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                                    activeSection === 'menu-items'
                                        ? 'bg-primary text-white'
                                        : 'text-gray-700 hover:bg-accent hover:text-primary'
                                }`}
                            >
                                Menu Items
                            </button>
                            <button
                                onClick={() => setActiveSection('settings')}
                                className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                                    activeSection === 'settings'
                                        ? 'bg-primary text-white'
                                        : 'text-gray-700 hover:bg-accent hover:text-primary'
                                }`}
                            >
                                Settings
                            </button>
                        </div>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8">
                    {activeSection === 'users' && (
                        <div>
                            <h2 className="text-2xl font-bold text-primary mb-6">User Management</h2>
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">User Type</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {users.map((user, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{user.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                        user.usertype === 'admin'
                                                            ? 'bg-red-100 text-red-800'
                                                            : user.usertype === 'student'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-green-100 text-green-800'
                                                    }`}>
                                                        {user.usertype}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    {new Date(user.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeSection === 'stats' && (
                        <div>
                            <h2 className="text-2xl font-bold text-primary mb-6">Statistics</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="text-2xl font-bold text-primary">{stats.totalUsers}</div>
                                    <div className="text-gray-600">Total Users</div>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="text-2xl font-bold text-primary">{stats.activeSessions}</div>
                                    <div className="text-gray-600">Active Sessions</div>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="text-2xl font-bold text-primary">{stats.ordersMade}</div>
                                    <div className="text-gray-600">Orders Made</div>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="text-2xl font-bold text-primary">{stats.totalMenuItems}</div>
                                    <div className="text-gray-600">Total Menu Items</div>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="text-2xl font-bold text-primary">{stats.paymentStats}</div>
                                    <div className="text-gray-600">Payment Stats</div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-lg font-semibold text-primary mb-4">Registrations by Date</h3>
                                <canvas id="signupChart" width="600" height="300"></canvas>
                            </div>
                        </div>
                    )}

                    {activeSection === 'menu-items' && (
                        <div>
                            <h2 className="text-2xl font-bold text-primary mb-6">Menu Item Management</h2>

                            <form onSubmit={handleMenuFormSubmit} className="bg-white p-6 rounded-lg shadow mb-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={menuForm.name}
                                            onChange={handleMenuFormChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <input
                                            type="text"
                                            name="description"
                                            value={menuForm.description}
                                            onChange={handleMenuFormChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                                        <input
                                            type="number"
                                            name="stock"
                                            value={menuForm.stock}
                                            onChange={handleMenuFormChange}
                                            min="0"
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                                        <input
                                            type="number"
                                            name="price"
                                            value={menuForm.price}
                                            onChange={handleMenuFormChange}
                                            step="0.01"
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                        <select
                                            name="category"
                                            value={menuForm.category}
                                            onChange={handleMenuFormChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                                        >
                                            <option value="">Select a category</option>
                                            <option value="Soup">Soup</option>
                                            <option value="Salad">Salad</option>
                                            <option value="MainDish">Main Dish</option>
                                            <option value="SideDish">Side Dish</option>
                                            <option value="Snack">Snack</option>
                                            <option value="Dessert">Dessert</option>
                                            <option value="Drink">Drink</option>
                                            <option value="Healthy">Healthy</option>
                                            <option value="SpecialDiet">Special Diet</option>
                                            <option value="DailySpecial">Daily Special</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Allergens</label>
                                        <input
                                            type="text"
                                            name="allergens"
                                            value={menuForm.allergens}
                                            onChange={handleMenuFormChange}
                                            placeholder="comma separated"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Calories</label>
                                        <input
                                            type="number"
                                            name="calories"
                                            value={menuForm.calories}
                                            onChange={handleMenuFormChange}
                                            min="0"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Protein</label>
                                        <input
                                            type="number"
                                            name="protein"
                                            value={menuForm.protein}
                                            onChange={handleMenuFormChange}
                                            min="0"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                                        />
                                        {(parseInt(menuForm.protein) < 0) && (
                                            <p className="mt-1 text-sm text-red-600">Protein cannot be negative</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Health Score</label>
                                        <input
                                            type="number"
                                            name="healthScore"
                                            value={menuForm.healthScore}
                                            onChange={handleMenuFormChange}
                                            min="0"
                                            max="100"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                                        />
                                        {(parseInt(menuForm.healthScore) < 0 || parseInt(menuForm.healthScore) > 100) && menuForm.healthScore !== '' && (
                                            <p className="mt-1 text-sm text-red-600">Health Score must be between 0 and 100</p>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-6 flex space-x-4">
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-primary text-white rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                                    >
                                        {menuForm.id ? 'Update' : 'Add'} Menu Item
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMenuForm({
                                            id: '',
                                            name: '',
                                            description: '',
                                            stock: '',
                                            price: '',
                                            category: '',
                                            allergens: '',
                                            calories: '',
                                            protein: '',
                                            healthScore: ''
                                        })}
                                        className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </form>

                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                    <h3 className="text-lg font-medium text-gray-900">Menu Items</h3>
                                    <button
                                        onClick={exportMenuItems}
                                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                                    >
                                        Export CSV
                                    </button>
                                </div>
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allergens</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Calories</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Protein</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Health Score</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {menuItems.map((item, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.description}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.stock}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${item.price?.toFixed(2)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                        item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {item.available ? 'Yes' : 'No'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.allergens?.join(', ')}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.nutritionalInfo?.calories}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.nutritionalInfo?.protein}g</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.healthScore}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                    <button
                                                        onClick={() => editMenuItem(item)}
                                                        className="text-primary hover:text-secondary"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteMenuItem(item._id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeSection === 'settings' && (
                        <div>
                            <h2 className="text-2xl font-bold text-primary mb-6">Settings</h2>
                            <div className="bg-white p-6 rounded-lg shadow">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">Account Settings</h3>                                        <a
                                            href="/password_reset.html"
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                                        >
                                            Change Password
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AdminDashboard />);