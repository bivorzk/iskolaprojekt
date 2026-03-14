const { useState } = React;

const MenuItemsSection = ({ menuItems, loadDashboardData }) => {
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
                allergens: Array.isArray(menuForm.allergens) 
                    ? menuForm.allergens 
                    : (menuForm.allergens ? menuForm.allergens.split(',').map(item => item.trim()) : []),
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
        setMenuForm({
            id: item._id || item.id,
            name: item.name,
            description: item.description,
            stock: item.stock,
            price: item.price,
            category: item.category,
            allergens: Array.isArray(item.allergens) ? item.allergens.join(', ') : item.allergens || '',
            calories: item.nutritionalInfo?.calories || item.calories || '',
            protein: item.nutritionalInfo?.protein || item.protein || '',
            healthScore: item.healthScore
        });
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

    return (
        <div>
            <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-6">Menu Item Management</h2>

            <form onSubmit={handleMenuFormSubmit} className="bg-white p-4 sm:p-6 rounded-lg shadow mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                <div className="mt-6 flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                    <button
                        type="submit"
                        className="px-4 sm:px-6 py-2 bg-primary text-white rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
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
                        className="px-4 sm:px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </form>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Menu Items</h3>
                    <button
                        onClick={exportMenuItems}
                        className="px-3 sm:px-4 py-2 bg-primary text-white rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors text-sm sm:text-base"
                    >
                        Export CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-1 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="hidden md:table-cell px-1 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-1 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                            <th className="px-1 sm:px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                            <th className="px-1 sm:px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                            <th className="hidden lg:table-cell px-1 sm:px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase">Available</th>
                            <th className="hidden lg:table-cell px-1 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Allergens</th>
                            <th className="hidden xl:table-cell px-1 sm:px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase">Calories</th>
                            <th className="hidden xl:table-cell px-1 sm:px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase">Protein</th>
                            <th className="hidden xl:table-cell px-1 sm:px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase">Health Score</th>
                            <th className="px-1 sm:px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {menuItems.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="px-1 sm:px-6 py-2 sm:py-4 text-sm font-medium text-gray-900">
                                    <div className="truncate max-w-20 sm:max-w-none">{item.name}</div>
                                </td>
                                <td className="hidden md:table-cell px-1 sm:px-6 py-2 sm:py-4 text-sm text-gray-500">
                                    <div className="truncate max-w-32">{item.description}</div>
                                </td>
                                <td className="px-1 sm:px-6 py-2 sm:py-4 text-sm text-gray-500">
                                    <div className="truncate max-w-16 sm:max-w-none">{item.category}</div>
                                </td>
                                <td className="px-1 sm:px-6 py-2 sm:py-4 text-sm text-gray-500 text-right">{item.stock}</td>
                                <td className="px-1 sm:px-6 py-2 sm:py-4 text-sm text-gray-500 text-right">${item.price?.toFixed(2)}</td>
                                <td className="hidden lg:table-cell px-1 sm:px-6 py-2 sm:py-4 text-center">
                                    <span className={`inline-flex px-1 sm:px-2 py-1 text-xs font-semibold rounded-full ${
                                        item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                        {item.available ? 'Yes' : 'No'}
                                    </span>
                                </td>
                                <td className="hidden lg:table-cell px-1 sm:px-6 py-2 sm:py-4 text-sm text-gray-500">{item.allergens?.join(', ')}</td>
                                <td className="hidden xl:table-cell px-1 sm:px-6 py-2 sm:py-4 text-sm text-gray-500 text-right">{item.nutritionalInfo?.calories}</td>
                                <td className="hidden xl:table-cell px-1 sm:px-6 py-2 sm:py-4 text-sm text-gray-500 text-right">{item.nutritionalInfo?.protein}g</td>
                                <td className="hidden xl:table-cell px-1 sm:px-6 py-2 sm:py-4 text-sm text-gray-500 text-right">{item.healthScore}</td>
                                <td className="px-1 sm:px-6 py-2 sm:py-4 text-right text-sm font-medium space-y-1 sm:space-y-0 sm:space-x-2">
                                    <button
                                        onClick={() => editMenuItem(item)}
                                        className="block sm:inline text-primary hover:text-secondary text-xs sm:text-sm"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => deleteMenuItem(item._id)}
                                        className="block sm:inline text-red-600 hover:text-red-900 text-xs sm:text-sm"
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
        </div>
    );
};