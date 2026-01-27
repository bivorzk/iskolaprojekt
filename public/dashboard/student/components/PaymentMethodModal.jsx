const PaymentMethodModal = ({ 
    isOpen, 
    onClose, 
    onSelectMethod, 
    amount, 
    currency, 
    googlePayReady, 
    paypalReady 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Payment Method</h3>
                <p className="text-sm text-gray-600 mb-6">
                    Add {amount} {currency} to your wallet using:
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => onSelectMethod('googlepay')}
                        disabled={!googlePayReady}
                        className={`w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                            googlePayReady 
                                ? 'hover:bg-gray-50 cursor-pointer' 
                                : 'bg-gray-100 cursor-not-allowed opacity-50'
                        }`}
                    >
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded mr-3 flex items-center justify-center">
                                <span className="text-white text-xs font-bold">G</span>
                            </div>
                            <span className="font-medium">
                                Google Pay {!googlePayReady && '(Not Available)'}
                            </span>
                        </div>
                    </button>

                    <button
                        onClick={() => onSelectMethod('paypal')}
                        disabled={!paypalReady}
                        className={`w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                            paypalReady 
                                ? 'hover:bg-gray-50 cursor-pointer' 
                                : 'bg-gray-100 cursor-not-allowed opacity-50'
                        }`}
                    >
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-600 rounded mr-3 flex items-center justify-center">
                                <span className="text-white text-xs font-bold">PP</span>
                            </div>
                            <span className="font-medium">
                                PayPal {!paypalReady && '(Loading...)'}
                            </span>
                        </div>
                    </button>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 focus:outline-none"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

window.PaymentMethodModal = PaymentMethodModal;