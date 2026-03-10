const { useState } = React;

const RewardsSection = ({ rewards, loadDashboardData }) => {
    const [rewardForm, setRewardForm] = useState({
        name: '',
        description: '',
        category: '',
        pointCost: '',
        marketValue: '',
        healthScore: '',
        minTier: 'none',
        dailyStockLimit: '',
        availableFrom: '',
        availableUntil: ''
    });

    const handleRewardFormSubmit = async (e) => {
        e.preventDefault();

        try {
            const method = rewardForm._id ? 'PUT' : 'POST';
            const url = rewardForm._id ? `/dashboard/editor/reward/${rewardForm._id}` : '/dashboard/editor/create_reward';

            const submitData = {
                name: rewardForm.name,
                description: rewardForm.description,
                category: rewardForm.category,
                pointCost: parseInt(rewardForm.pointCost),
                marketValue: parseFloat(rewardForm.marketValue),
                healthScore: parseInt(rewardForm.healthScore) || 0,
                minTier: rewardForm.minTier,
                dailyStockLimit: rewardForm.dailyStockLimit ? parseInt(rewardForm.dailyStockLimit) : undefined,
                availableFrom: rewardForm.availableFrom || undefined,
                availableUntil: rewardForm.availableUntil || undefined
            };

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submitData),
            });

            if (response.ok) {
                setRewardForm({
                    name: '',
                    description: '',
                    category: '',
                    pointCost: '',
                    marketValue: '',
                    healthScore: '',
                    minTier: 'none',
                    dailyStockLimit: '',
                    availableFrom: '',
                    availableUntil: ''
                });
                loadDashboardData();
                alert(rewardForm._id ? 'Reward updated successfully!' : 'Reward created successfully!');
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.error || 'Failed to save reward'}`);
            }
        } catch (error) {
            console.error('Error saving reward:', error);
            alert('Error saving reward. Please try again.');
        }
    };

    const handleRewardFormChange = (e) => {
        const { name, value } = e.target;
        setRewardForm({
            ...rewardForm,
            [name]: value
        });
    };

    const editReward = (reward) => {
        setRewardForm({
            ...reward,
            availableFrom: reward.availableFrom ? new Date(reward.availableFrom).toISOString().split('T')[0] : '',
            availableUntil: reward.availableUntil ? new Date(reward.availableUntil).toISOString().split('T')[0] : ''
        });
    };

    const deleteReward = async (id) => {
        if (!confirm('Are you sure you want to delete this reward?')) return;
        try {
            const response = await fetch(`/dashboard/editor/reward/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                loadDashboardData();
            }
        } catch (error) {
            console.error('Error deleting reward:', error);
        }
    };

    const toggleRewardStatus = async (id, currentStatus) => {
        try {
            const response = await fetch(`/dashboard/editor/reward/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isActive: !currentStatus }),
            });

            if (response.ok) {
                loadDashboardData();
            }
        } catch (error) {
            console.error('Error updating reward status:', error);
        }
    };

    return (
        <div>
            <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-6">Reward Management</h2>

            <form onSubmit={handleRewardFormSubmit} className="bg-white p-4 sm:p-6 rounded-lg shadow mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            name="name"
                            value={rewardForm.name}
                            onChange={handleRewardFormChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                            name="category"
                            value={rewardForm.category}
                            onChange={handleRewardFormChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                        >
                            <option value="">Select a category</option>
                            <option value="drink">Drink</option>
                            <option value="fruit">Fruit</option>
                            <option value="dessert">Dessert</option>
                            <option value="meal">Meal</option>
                            <option value="upgrade">Upgrade</option>
                            <option value="mystery">Mystery</option>
                            <option value="token">Token</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Point Cost</label>
                        <input
                            type="number"
                            name="pointCost"
                            value={rewardForm.pointCost}
                            onChange={handleRewardFormChange}
                            min="1"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Market Value ($)</label>
                        <input
                            type="number"
                            name="marketValue"
                            value={rewardForm.marketValue}
                            onChange={handleRewardFormChange}
                            step="0.01"
                            min="0"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Health Score (0-100)</label>
                        <input
                            type="number"
                            name="healthScore"
                            value={rewardForm.healthScore}
                            onChange={handleRewardFormChange}
                            min="0"
                            max="100"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Tier</label>
                        <select
                            name="minTier"
                            value={rewardForm.minTier}
                            onChange={handleRewardFormChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                        >
                            <option value="none">None</option>
                            <option value="Bronze">Bronze</option>
                            <option value="Silver">Silver</option>
                            <option value="Gold">Gold</option>
                            <option value="Platinum">Platinum</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Daily Stock Limit</label>
                        <input
                            type="number"
                            name="dailyStockLimit"
                            value={rewardForm.dailyStockLimit}
                            onChange={handleRewardFormChange}
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Available From</label>
                        <input
                            type="date"
                            name="availableFrom"
                            value={rewardForm.availableFrom}
                            onChange={handleRewardFormChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Available Until</label>
                        <input
                            type="date"
                            name="availableUntil"
                            value={rewardForm.availableUntil}
                            onChange={handleRewardFormChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        name="description"
                        value={rewardForm.description}
                        onChange={handleRewardFormChange}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    ></textarea>
                </div>
                <div className="mt-4 flex gap-2">
                    <button
                        type="submit"
                        className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-secondary transition-colors"
                    >
                        {rewardForm._id ? 'Update Reward' : 'Create Reward'}
                    </button>
                    {rewardForm._id && (
                        <button
                            type="button"
                            onClick={() => setRewardForm({
                                name: '',
                                description: '',
                                category: '',
                                pointCost: '',
                                marketValue: '',
                                healthScore: '',
                                minTier: 'none',
                                dailyStockLimit: '',
                                availableFrom: '',
                                availableUntil: ''
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
                    <h3 className="text-lg font-medium text-gray-900">Existing Rewards</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {rewards.map((reward) => (
                                <tr key={reward._id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reward.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{reward.category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reward.pointCost}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${reward.marketValue}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => toggleRewardStatus(reward._id, reward.isActive)}
                                            className={`px-2 py-1 text-xs rounded-full ${
                                                reward.isActive
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}
                                        >
                                            {reward.isActive ? 'Active' : 'Inactive'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => editReward(reward)}
                                            className="text-primary hover:text-secondary mr-2"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => deleteReward(reward._id)}
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