const Cart = ({ cart, onUpdateQuantity, onRemoveFromCart, currency, onCurrencyChange, onGooglePay, onPayPal, onBalance, selectedDiscount, onDiscountChange, appliedVoucher, onVoucherChange, isLoggedIn, isEditor, isParent, selectedChildId }) => {
    const [activeTab, setActiveTab] = React.useState('cart');
    const [loyaltyData, setLoyaltyData] = React.useState(null);
    const [notLoggedIn, setNotLoggedIn] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [voucherCode, setVoucherCode] = React.useState('');
    const [voucherLoading, setVoucherLoading] = React.useState(false);
    const [voucherError, setVoucherError] = React.useState(null);

    const handlePaymentClick = (action) => {
        if (isEditor) {
            return;
        }
        if (isParent && !selectedChildId) {
            alert('Please select a child before placing the order.');
            return;
        }
        if (!isLoggedIn) {
            window.location.href = '/login';
            return;
        }
        action();
    };

    React.useEffect(() => {
        if (activeTab === 'discounts') {
            fetchLoyaltyData();
        }
    }, [activeTab]);

    const fetchLoyaltyData = async () => {
        setLoading(true);
        try {
            const response = await fetch('/dashboard/student/loyalty');
            if (response.status === 401) {
                setNotLoggedIn(true);
                return;
            }
            if (response.ok) {
                const data = await response.json();
                setLoyaltyData(data);
            }
        } catch (error) {
            console.error('Error fetching loyalty data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCartTotal = () => {
        const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        let total = selectedDiscount ? subtotal * (1 - selectedDiscount.rate) : subtotal;
        if (appliedVoucher) total = Math.max(0, total - appliedVoucher.marketValue);
        return total;
    };

    const getDiscountAmount = () => {
        if (!selectedDiscount) return 0;
        const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        return subtotal * selectedDiscount.rate;
    };

    const handleVoucherValidate = async () => {
        if (!voucherCode.trim()) return;
        setVoucherLoading(true);
        setVoucherError(null);
        try {
            const response = await fetch('/dashboard/student/loyalty/voucher/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voucherCode: voucherCode.trim() })
            });
            const data = await response.json();
            if (response.ok && data.valid) {
                onVoucherChange(data);
                setVoucherCode('');
            } else {
                setVoucherError(data.error || 'Invalid voucher code');
            }
        } catch (err) {
            setVoucherError('Could not validate voucher. Please try again.');
        } finally {
            setVoucherLoading(false);
        }
    };

    return (
        <div className="lg:w-96">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                <h2 className="text-xl font-bold text-primary mb-4">Your Cart</h2>

                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200 mb-4">
                    {[['cart', 'Cart'], ['discounts', 'Discounts'], ['vouchers', '🎫 Vouchers']].map(([tab, label]) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 px-2 text-center font-medium text-sm ${
                                activeTab === tab
                                    ? 'text-primary border-b-2 border-primary'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {activeTab === 'cart' && (
                    <>
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
                                                    disabled={item.quantity >= item.stock}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                        item.quantity >= item.stock
                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                            : 'bg-gray-200 hover:bg-gray-300'
                                                    }`}
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
                                        <span className="text-lg font-semibold">Subtotal:</span>
                                        <span className="text-lg font-bold text-primary">
                                            ${cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}
                                        </span>
                                    </div>

                                    {selectedDiscount && (
                                        <div className="flex justify-between items-center text-green-600">
                                            <span className="text-sm font-medium">
                                                Discount ({selectedDiscount.type} - {(selectedDiscount.rate * 100).toFixed(0)}%):
                                            </span>
                                            <span className="text-sm font-medium">
                                                -${getDiscountAmount().toFixed(2)}
                                            </span>
                                        </div>
                                    )}

                                    {appliedVoucher && (
                                        <div className="flex justify-between items-center text-purple-600">
                                            <span className="text-sm font-medium">🎫 {appliedVoucher.rewardName}:</span>
                                            <span className="text-sm font-medium">-${appliedVoucher.marketValue.toFixed(2)}</span>
                                        </div>
                                    )}

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
                                            onClick={() => handlePaymentClick(onGooglePay)}
                                            disabled={isEditor || (isParent && !selectedChildId)}
                                            className={`w-full py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2 transition-colors font-semibold ${isEditor || (isParent && !selectedChildId) ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                                        >
                                            {isEditor ? 'Ordering disabled' : isParent && !selectedChildId ? 'Select a child first' : isLoggedIn ? 'Pay with Google Pay' : 'Login to Pay'}
                                        </button>
                                        <button
                                            onClick={() => handlePaymentClick(onPayPal)}
                                            disabled={isEditor || (isParent && !selectedChildId)}
                                            className={`w-full py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 transition-colors font-semibold ${isEditor || (isParent && !selectedChildId) ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                        >
                                            {isEditor ? 'Ordering disabled' : isParent && !selectedChildId ? 'Select a child first' : isLoggedIn ? 'Pay with PayPal' : 'Login to Pay'}
                                        </button>

                                        <button
                                            onClick={() => handlePaymentClick(onBalance)}
                                            disabled={isEditor || (isParent && !selectedChildId)}
                                            className={`w-full py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-offset-2 transition-colors font-semibold ${isEditor || (isParent && !selectedChildId) ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                                        >
                                            {isEditor ? 'Ordering disabled' : isParent && !selectedChildId ? 'Select a child first' : isLoggedIn ? 'Pay with Account Balance' : 'Login to Pay'}
                                        </button>
                                        {!isLoggedIn && !isEditor && (
                                            <p className="text-sm text-gray-600 mt-2">Please login to use payment methods and complete your order.</p>
                                        )}
                                        {isEditor && (
                                            <p className="text-sm text-orange-700 mt-2">Editor accounts may browse the menu but cannot complete purchases.</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}

                {activeTab === 'vouchers' && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">Apply a voucher code from your Loyalty Rewards. The reward's value will be deducted from your order total.</p>

                        {appliedVoucher ? (
                            <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-semibold text-purple-900">🎫 {appliedVoucher.rewardName}</p>
                                        <p className="text-sm text-purple-700 mt-1">-${appliedVoucher.marketValue.toFixed(2)} off your order</p>
                                        <p className="text-xs text-purple-400 font-mono mt-1">{appliedVoucher.voucherCode}</p>
                                    </div>
                                    <button onClick={() => onVoucherChange(null)} className="text-purple-400 hover:text-purple-700 ml-2 text-lg leading-none">&times;</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={voucherCode}
                                        onChange={(e) => { setVoucherCode(e.target.value); setVoucherError(null); }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleVoucherValidate()}
                                        placeholder="Enter voucher code..."
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
                                    />
                                    <button
                                        onClick={handleVoucherValidate}
                                        disabled={voucherLoading || !voucherCode.trim()}
                                        className="px-3 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {voucherLoading ? '...' : 'Apply'}
                                    </button>
                                </div>
                                {voucherError && <p className="text-sm text-red-600">{voucherError}</p>}
                                <p className="text-xs text-gray-400">Find codes in Dashboard → Loyalty Rewards → My Vouchers.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'discounts' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Available Discounts</h3>

                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading discounts...</p>
                            </div>
                        ) : loyaltyData && loyaltyData.discounts && loyaltyData.discounts.length > 0 ? (
                            <>
                                <div className="space-y-3">
                                    {loyaltyData.discounts.map((discount, index) => (
                                        <div
                                            key={index}
                                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                                selectedDiscount && selectedDiscount.type === discount.type && selectedDiscount.rate === discount.rate
                                                    ? 'border-primary bg-primary bg-opacity-5'
                                                    : 'border-gray-200 hover:border-primary'
                                            }`}
                                            onClick={() => onDiscountChange(discount)}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-medium text-gray-900 capitalize">
                                                        {discount.type.replace('_', ' ')} Discount
                                                    </h4>
                                                    <p className="text-sm text-gray-600">
                                                        {(discount.rate * 100).toFixed(0)}% off
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    {selectedDiscount && selectedDiscount.type === discount.type && selectedDiscount.rate === discount.rate && (
                                                        <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {selectedDiscount && (
                                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <h4 className="font-medium text-green-800 mb-2">Selected Discount</h4>
                                        <p className="text-green-700">
                                            <span className="capitalize">{selectedDiscount.type.replace('_', ' ')}</span> - {(selectedDiscount.rate * 100).toFixed(0)}% off
                                        </p>
                                        <p className="text-sm text-green-600 mt-1">
                                            You save ${getDiscountAmount().toFixed(2)} on this order
                                        </p>
                                    </div>
                                )}

                                <button
                                    onClick={() => onDiscountChange(null)}
                                    className="w-full mt-4 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                                >
                                    Clear Selection
                                </button>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                                </svg>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Discounts</h3>
                                <p className="text-gray-600">Earn more points to unlock discounts!</p>
                                <p className="text-sm text-gray-500 mt-2">
                                    {notLoggedIn ? (
                                        <span className="text-sm text-gray-600">Login to view your points</span>
                                    ) : (
                                        <>Current tier: {loyaltyData?.userTier || 'None'} ({loyaltyData?.totalPoints || 0} points)</>
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};