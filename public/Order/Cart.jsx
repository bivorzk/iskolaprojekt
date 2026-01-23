const Cart = ({ cart, onUpdateQuantity, onRemoveFromCart, currency, onCurrencyChange, onGooglePay, onPayPal, onBalance }) => {
    const getCartTotal = () => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    };

    return (
        <div className="lg:w-96">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                <h2 className="text-xl font-bold text-primary mb-4">Your Cart</h2>

                {cart.length === 0 ? (
                    <div className="text-center py-8">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M7 13l-1.1 5M7 13h10m0 0v8a2 2 0 01-2 2H9a2 2 0 01-2-2v-3.03"></path>
                        </svg>
                        <p className="text-gray-600">Your cart is empty</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                            {cart.map((item) => (
                                <div key={item._id} className="flex items-center justify-between border-b border-gray-200 pb-4">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                                        <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => onUpdateQuantity(item._id, item.quantity - 1)}
                                            className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                                        >
                                            -
                                        </button>
                                        <span className="w-8 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => onUpdateQuantity(item._id, item.quantity + 1)}
                                            className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                                        >
                                            +
                                        </button>
                                        <button
                                            onClick={() => onRemoveFromCart(item._id)}
                                            className="ml-2 text-red-600 hover:text-red-800"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-gray-200 pt-4 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold">Total:</span>
                                <span className="text-lg font-bold text-primary">${getCartTotal().toFixed(2)}</span>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                <select
                                    value={currency}
                                    onChange={(e) => onCurrencyChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                                >
                                    <option value="HUF">HUF</option>
                                    <option value="EUR">EUR</option>
                                    <option value="USD">USD</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={onGooglePay}
                                    className="w-full bg-primary text-white py-3 px-4 rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors font-medium"
                                >
                                    Pay with Google Pay
                                </button>
                                <button
                                    onClick={onPayPal}
                                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-colors font-medium"
                                >
                                    Pay with PayPal
                                </button>

                                <button
                                    onClick={onBalance}
                                    className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 transition-colors font-medium"
                                >
                                    Pay with Account Balance
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};