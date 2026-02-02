const MenuItem = ({ item, onAddToCart, onViewInfo }) => {
    const [isAdding, setIsAdding] = React.useState(false);

    const handleAddToCart = async () => {
        setIsAdding(true);
        onAddToCart(item);
        
        // Brief animation feedback
        setTimeout(() => {
            setIsAdding(false);
        }, 600);
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-[1.02] min-h-[350px] flex flex-col">
            <div className="p-4 sm:p-6 flex flex-col flex-1">
                <div className="flex-grow">
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 pr-2">{item.name}</h3>
                        <span className="text-lg sm:text-xl font-bold text-primary whitespace-nowrap">${item.price.toFixed(2)}</span>
                    </div>
                    <p className="text-gray-600 text-sm sm:text-base mb-3 leading-relaxed">{item.description}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent text-primary">
                            {item.category}
                        </span>
                        {item.allergens && item.allergens.length > 0 && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
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
                                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${item.healthScore}%` }}
                                    ></div>
                                </div>
                                <span className="text-sm text-gray-600 ml-2">{item.healthScore}/100</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between mt-6 gap-3">
                    <button
                        onClick={() => onViewInfo(item.name)}
                        className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm sm:text-base font-bold hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all active:scale-95"
                        title="More information"
                    >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                    <button
                        onClick={handleAddToCart}
                        disabled={isAdding}
                        className={`flex-1 py-3 sm:py-2 px-4 rounded-lg font-medium text-base sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-95 ${
                            isAdding 
                                ? 'bg-green-500 text-white' 
                                : 'bg-primary text-white hover:bg-secondary'
                        }`}
                    >
                        {isAdding ? (
                            <div className="flex items-center justify-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Added!
                            </div>
                        ) : (
                            <div className="flex items-center justify-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add to Cart
                            </div>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};