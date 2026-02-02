const { useState, useEffect } = React;

const ItemInformation = () => {
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadItemInformation();
    }, []);

    const loadItemInformation = async () => {
        try {
            // Get item name from URL
            const pathParts = window.location.pathname.split('/');
            const itemName = decodeURIComponent(pathParts[pathParts.length - 1]);

            const response = await fetch('/api/menu-items');
            const data = await response.json();
            const foundItem = data.find(menuItem => menuItem.name === itemName && menuItem.available);

            if (foundItem) {
                setItem(foundItem);
            } else {
                setError('Item not found');
            }
        } catch (err) {
            console.error('Error loading item information:', err);
            setError('Failed to load item information');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-accent to-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading item information...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-accent to-white flex items-center justify-center">
                <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
                    <p className="text-gray-600">{error}</p>
                    <button
                        onClick={() => navigate('/Order/')}
                        className="mt-4 bg-primary text-white px-4 py-2 rounded-md hover:bg-secondary"
                    >
                        Back to Menu
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-accent to-white">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-4">
                            <svg viewBox="0 0 500 140" className="h-20 w-auto">
                                <rect x="25" y="55" width="90" height="50" rx="6" fill="#FF6B35"/>
                                <rect x="30" y="60" width="35" height="40" rx="3" fill="#FFE5DC"/>
                                <rect x="70" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                                <rect x="95" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                                <rect x="70" y="82" width="45" height="18" rx="3" fill="#FFE5DC"/>
                                <path d="M80 25 L65 52 L75 52 L60 80 L85 50 L75 50 L90 25 Z" fill="#FFC857" stroke="#FF6B35" strokeWidth="2" strokeLinejoin="round"/>
                                <text x="150" y="85" fontFamily="system-ui, -apple-system, sans-serif" fontSize="32" fontWeight="bold" fill="#FF6B35" letterSpacing="-1">SnapTray</text>
                                <text x="150" y="105" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fill="#6C757D" letterSpacing="2">CAFETERIA ORDERING</text>
                            </svg>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate('/Order/')}
                                className="text-primary hover:text-secondary font-medium"
                            >
                                Back to Menu
                            </button>
                            <a href="/logout" className="text-gray-700 hover:text-primary font-medium">Logout</a>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="lg:flex">
                        {/* Image Section */}
                        <div className="lg:w-1/2">
                            <img
                                src={item.image || 'https://loremflickr.com/400/300/food'}
                                alt={item.name}
                                className="w-full h-80 lg:h-full object-cover"
                            />
                        </div>

                        {/* Information Section */}
                        <div className="lg:w-1/2 p-8">
                            <div className="flex justify-between items-start mb-6">
                                <h1 className="text-4xl font-bold text-primary">{item.name}</h1>
                                <span className="text-3xl font-bold text-primary">${item.price.toFixed(2)}</span>
                            </div>

                            <p className="text-gray-700 text-xl mb-6 leading-relaxed">{item.description}</p>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center">
                                    <span className="font-semibold text-gray-800 w-32">Category:</span>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-base font-medium bg-accent text-primary">
                                        {item.category}
                                    </span>
                                </div>

                                {item.calories && (
                                    <div className="flex items-center">
                                        <span className="font-semibold text-gray-800 w-32">Calories:</span>
                                        <span className="text-gray-700 text-lg">{item.calories} kcal</span>
                                        {item.protein && <span className="ml-6 text-gray-700">Protein: {item.protein}g</span>}
                                    </div>
                                )}

                                {item.allergens && item.allergens.length > 0 && (
                                    <div className="flex items-start">
                                        <span className="font-semibold text-gray-800 w-32">Allergens:</span>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-base font-medium bg-yellow-100 text-yellow-800">
                                            {item.allergens.join(', ')}
                                        </span>
                                    </div>
                                )}

                                {item.healthScore && (
                                    <div>
                                        <div className="flex items-center mb-2">
                                            <span className="font-semibold text-gray-800 w-32">Health Score:</span>
                                            <span className="text-gray-700 text-lg">{item.healthScore}/100</span>
                                        </div>
                                        <div className="bg-gray-200 rounded-full h-3">
                                            <div
                                                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                                                style={{ width: `${item.healthScore}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}

                                {/* Additional Information for Future Improvements */}
                                <div className="border-t border-gray-200 pt-4 mt-6">
                                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Additional Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <span className="font-medium text-gray-700">Ingredients:</span>
                                            <p className="text-gray-600 mt-1">{item.ingredients || 'Fresh ingredients including vegetables, proteins, and seasonings'}</p>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-700">Preparation Time:</span>
                                            <p className="text-gray-600 mt-1">{item.prepTime || 'Approximately 15-20 minutes'}</p>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-700">Serving Size:</span>
                                            <p className="text-gray-600 mt-1">{item.servingSize || 'One serving'}</p>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-700">Dietary Info:</span>
                                            <p className="text-gray-600 mt-1">{item.dietaryInfo || 'Please check allergens above'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Nutritional Facts Table */}
                                {item.nutrition && (
                                    <div className="border-t border-gray-200 pt-4 mt-6">
                                        <h3 className="text-xl font-semibold text-gray-800 mb-4">Nutritional Facts</h3>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div><span className="font-medium">Fat:</span> {item.nutrition.fat || 'N/A'}g</div>
                                                <div><span className="font-medium">Carbs:</span> {item.nutrition.carbs || 'N/A'}g</div>
                                                <div><span className="font-medium">Fiber:</span> {item.nutrition.fiber || 'N/A'}g</div>
                                                <div><span className="font-medium">Sugar:</span> {item.nutrition.sugar || 'N/A'}g</div>
                                                <div><span className="font-medium">Sodium:</span> {item.nutrition.sodium || 'N/A'}mg</div>
                                                <div><span className="font-medium">Cholesterol:</span> {item.nutrition.cholesterol || 'N/A'}mg</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex space-x-4">
                                <button
                                    onClick={() => navigate('/Order/')}
                                    className="flex-1 bg-primary text-white py-3 px-6 rounded-lg hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors font-medium text-lg"
                                >
                                    Back to Menu
                                </button>
                                <button
                                    onClick={() => {
                                        // Future: Add to cart functionality
                                        alert('Add to cart functionality coming soon!');
                                    }}
                                    className="flex-1 bg-secondary text-white py-3 px-6 rounded-lg hover:bg-primary focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 transition-colors font-medium text-lg"
                                >
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

ReactDOM.render(<ItemInformation />, document.getElementById('root'));
