const MobileCart = ({ cart, onUpdateQuantity, onRemoveFromCart, currency, onCurrencyChange, onGooglePay, onPayPal, onBalance, isVisible, onToggle }) => {
    const getCartTotal = () => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    };

    const getCartItemsCount = () => {
        return cart.reduce((total, item) => total + item.quantity, 0);
    };

    if (!isVisible) {
        return (
            // Floating Cart Button for Mobile
            <div className="lg:hidden fixed bottom-6 right-6 z-50">
                <button
                    onClick={onToggle}
                    className="relative bg-primary text-white p-4 rounded-full shadow-lg hover:bg-secondary transition-all duration-300 transform hover:scale-110"
                    style={{ minWidth: '60px', minHeight: '60px' }}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M7 13l-1.1 5M7 13h10m0 0v8a2 2 0 01-2 2H9a2 2 0 01-2-2v-3.03" />
                    </svg>
                    {cart.length > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold animate-pulse">
                            {getCartItemsCount()}
                        </div>
                    )}
                </button>
            </div>
        );
    }

    return (
        <>
            {/* Mobile Cart Modal Overlay */}
            <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onToggle}></div>
            
            {/* Mobile Cart Modal */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl z-50 transform transition-transform duration-300 ease-out max-h-[80vh] flex flex-col">
                {/* Handle Bar */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-primary">Your Cart ({getCartItemsCount()})</h2>
                    <button
                        onClick={onToggle}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8">
                        <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M7 13l-1.1 5M7 13h10m0 0v8a2 2 0 01-2 2H9a2 2 0 01-2-2v-3.03" />
                        </svg>
                        <p className="text-gray-600 text-lg mb-2">Your cart is empty</p>
                        <p className="text-gray-500 text-sm">Add some delicious items to get started!</p>
                    </div>
                ) : (
                    <>
                        {/* Cart Items - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {cart.map((item) => (
                                <div key={item._id} className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900 text-lg">{item.name}</h4>
                                            <p className="text-primary font-semibold">${item.price.toFixed(2)} each</p>
                                        </div>
                                        <button
                                            onClick={() => onRemoveFromCart(item._id)}
                                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <button
                                                onClick={() => onUpdateQuantity(item._id, item.quantity - 1)}
                                                className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors"
                                            >
                                                <span className="text-lg font-semibold text-gray-600">-</span>
                                            </button>
                                            <span className="text-xl font-bold text-gray-900 min-w-[3ch] text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => onUpdateQuantity(item._id, item.quantity + 1)}
                                                className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-secondary active:bg-orange-600 transition-colors"
                                            >
                                                <span className="text-lg font-semibold">+</span>
                                            </button>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-gray-900">
                                                ${(item.price * item.quantity).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer with Total and Payment Buttons */}
                        <div className="border-t border-gray-200 p-4 space-y-4 bg-white">
                            {/* Currency Selector */}
                            <div>
                                <select
                                    value={currency}
                                    onChange={(e) => onCurrencyChange(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
                                >
                                    <option value="HUF">Hungarian Forint (HUF)</option>
                                    <option value="EUR">Euro (EUR)</option>
                                    <option value="USD">US Dollar (USD)</option>
                                </select>
                            </div>

                            {/* Total */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xl font-semibold text-gray-700">Total:</span>
                                    <span className="text-2xl font-bold text-primary">${getCartTotal().toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Payment Buttons */}
                            <div className="space-y-3">
                                <button
                                    onClick={onGooglePay}
                                    className="w-full bg-primary text-white py-4 px-4 rounded-xl hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors font-medium text-lg active:bg-orange-600"
                                >
                                    Pay with Google Pay
                                </button>
                                <button
                                    onClick={onPayPal}
                                    className="w-full bg-blue-600 text-white py-4 px-4 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-colors font-medium text-lg active:bg-blue-800"
                                >
                                    Pay with PayPal
                                </button>
                                <button
                                    onClick={onBalance}
                                    className="w-full bg-green-600 text-white py-4 px-4 rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 transition-colors font-medium text-lg active:bg-green-800"
                                >
                                    Pay with Account Balance
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
};