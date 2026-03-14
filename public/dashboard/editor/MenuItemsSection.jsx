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
            const url = menuForm.id ? `/dashboard/editor/menuitem/${menuForm.id}` : '/dashboard/editor/create_menuitem';

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
            const response = await fetch(`/dashboard/editor/menuitem/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                loadDashboardData(); // Reload menu items
            }
        } catch (error) {
            console.error('Error deleting menu item:', error);
        }
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Health Score (0-100)</label>
                        <input
                            type="number"
                            name="healthScore"
                            value={menuForm.healthScore}
                            onChange={handleMenuFormChange}
                            min="0"
                            max="100"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                        />
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Allergens (comma-separated)</label>
                        <input
                            type="text"
                            name="allergens"
                            value={menuForm.allergens}
                            onChange={handleMenuFormChange}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Protein (g)</label>
                        <input
                            type="number"
                            name="protein"
                            value={menuForm.protein}
                            onChange={handleMenuFormChange}
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                        />
                    </div>
                </div>
                <div className="mt-4 flex gap-2">
                    <button
                        type="submit"
                        className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-secondary transition-colors"
                    >
                        {menuForm.id ? 'Update Item' : 'Create Item'}
                    </button>
                    {menuForm.id && (
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
                            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Cancel Edit
                        </button>
                    )}
                </div>
            </form>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Menu Items</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {menuItems.map((item) => (
                                <tr key={item._id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.price}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.stock}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                            item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {item.available ? 'Yes' : 'No'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => editMenuItem(item)}
                                            className="text-primary hover:text-secondary mr-2"
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
        </div>
    );
};