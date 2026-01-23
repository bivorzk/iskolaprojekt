const MenuItem = ({ item, onAddToCart, onViewInfo }) => {
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                    <span className="text-lg font-bold text-primary">${item.price.toFixed(2)}</span>
                </div>
                <p className="text-gray-600 text-sm mb-3">{item.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-primary">
                        {item.category}
                    </span>
                    {item.allergens && item.allergens.length > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Allergens: {item.allergens.join(', ')}
                        </span>
                    )}
                </div>

                {item.calories && (
                    <div className="text-sm text-gray-600 mb-4">
                        <span className="font-medium">Calories:</span> {item.calories} kcal
                        {item.protein && <span className="ml-4"><span className="font-medium">Protein:</span> {item.protein}g</span>}
                    </div>
                )}

                {item.healthScore && (
                    <div className="mb-4">
                        <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-700 mr-2">Health Score:</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-green-500 h-2 rounded-full"
                                    style={{ width: `${item.healthScore}%` }}
                                ></div>
                            </div>
                            <span className="text-sm text-gray-600 ml-2">{item.healthScore}/100</span>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between mt-4">
                    <button
                        onClick={() => onViewInfo(item.name)}
                        className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="More information"
                    >
                        i
                    </button>
                    <button
                        onClick={() => onAddToCart(item)}
                        className="flex-1 ml-4 bg-primary text-white py-2 px-4 rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                    >
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    );
};