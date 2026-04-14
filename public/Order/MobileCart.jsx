const MobileCart = ({ cart, onUpdateQuantity, onRemoveFromCart, currency, onCurrencyChange, onGooglePay, onPayPal, onBalance, isVisible, onToggle, selectedDiscount, onDiscountChange, appliedVoucher, onVoucherChange, isLoggedIn, isEditor, isParent, selectedChildId }) => {
    const [activeTab, setActiveTab] = React.useState('cart');
    const [loyaltyData, setLoyaltyData] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [notLoggedIn, setNotLoggedIn] = React.useState(false);
    const [voucherCode, setVoucherCode] = React.useState('');
    const [voucherLoading, setVoucherLoading] = React.useState(false);
    const [voucherError, setVoucherError] = React.useState(null);
    const [showPaymentOptions, setShowPaymentOptions] = React.useState(false);

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

    const getCartItemsCount = () => {
        return cart.reduce((total, item) => total + item.quantity, 0);
    };

    const isCartTab = activeTab === 'cart';

    React.useEffect(() => {
        if (!isVisible || !isCartTab) {
            setShowPaymentOptions(false);
        }
    }, [isVisible, isCartTab]);

    React.useEffect(() => {
        const previousOverflow = document.body.style.overflow;

        if (isVisible) {
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isVisible]);

    if (!isVisible) {
        return (
            // Floating Cart Button for Mobile
            <div className="lg:hidden fixed right-4 sm:right-6 z-50" style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
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
        <div>
            {/* Mobile Cart Modal Overlay */}
            <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 backdrop-blur-[1px] z-40" onClick={onToggle}></div>
            
            {/* Mobile Cart Modal */}
            <div
                className="lg:hidden mobile-sheet fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-xl z-50 transform transition-transform duration-300 ease-out flex flex-col min-h-0 overflow-hidden"
                style={{ maxHeight: 'calc(100dvh - 12px)' }}
                role="dialog"
                aria-modal="true"
                aria-label="Shopping cart"
            >
                {/* Handle Bar */}
                <div className="shrink-0 flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                </div>

                {/* Header */}
                <div className="shrink-0 flex items-center justify-between p-4 border-b border-gray-200">
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

                {/* Tab Navigation */}
                <div className="shrink-0 flex border-b border-gray-200">
                    {[['cart', 'Cart'], ['discounts', 'Discounts'], ['vouchers', '🎫 Vouchers']].map(([tab, label]) => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                if (tab !== 'cart') {
                                    setShowPaymentOptions(false);
                                }
                            }}
                            className={`flex-1 py-3 px-2 text-center font-medium text-sm ${
                                activeTab === tab
                                    ? 'text-primary border-b-2 border-primary'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8">
                        <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M7 13l-1.1 5M7 13h10m0 0v8a2 2 0 01-2 2H9a2 2 0 01-2-2v-3.03" />
                        </svg>
                        <p className="text-gray-600 text-lg mb-2">Your cart is empty</p>
                        <p className="text-gray-500 text-sm">Add some delicious items to get started!</p>
                    </div>
                ) : activeTab === 'cart' ? (
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-6 space-y-4">
                        {cart.map((item) => (
                            <div key={item._id} className="bg-gray-50 rounded-xl p-4">
                                <div className="flex items-start justify-between mb-3 gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 text-lg leading-tight">{item.name}</h4>
                                        <p className="text-primary font-semibold">${item.price.toFixed(2)} each</p>
                                    </div>
                                    <button
                                        onClick={() => onRemoveFromCart(item._id)}
                                        className="shrink-0 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                                
                                <div className="flex items-center justify-between gap-3">
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
                                    <div className="text-right shrink-0">
                                        <p className="text-lg font-bold text-gray-900">
                                            ${(item.price * item.quantity).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activeTab === 'discounts' ? (
                    /* Discounts Tab */
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Discounts</h3>

                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading discounts...</p>
                            </div>
                        ) : loyaltyData && loyaltyData.discounts && loyaltyData.discounts.length > 0 ? (
                            <div>
                                <div className="space-y-3 mb-4">
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
                                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
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
                                    className="w-full px-4 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                                >
                                    Clear Selection
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                                </svg>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Discounts</h3>
                                <p className="text-gray-600">Earn more points to unlock discounts!</p>
                                <p className="text-sm text-gray-500 mt-2">
                                    Current tier: {loyaltyData?.userTier || 'None'} ({loyaltyData?.totalPoints || 0} points)
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Vouchers Tab */
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-6 space-y-4">
                        <p className="text-sm text-gray-600">Apply a voucher to deduct a reward's value from your order total.</p>

                        {appliedVoucher ? (
                            <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-semibold text-purple-900">🎫 {appliedVoucher.rewardName}</p>
                                        <p className="text-sm text-purple-700 mt-1">-${appliedVoucher.marketValue.toFixed(2)} off your order</p>
                                        <p className="text-xs text-purple-400 font-mono mt-1">{appliedVoucher.voucherCode}</p>
                                    </div>
                                    <button onClick={() => onVoucherChange(null)} className="text-purple-400 hover:text-purple-700 ml-2 text-xl leading-none">&times;</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={voucherCode}
                                        onChange={(e) => { setVoucherCode(e.target.value); setVoucherError(null); }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleVoucherValidate()}
                                        placeholder="Enter voucher code..."
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                                    />
                                    <button
                                        onClick={handleVoucherValidate}
                                        disabled={voucherLoading || !voucherCode.trim()}
                                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
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

                {/* Footer with Total and Payment Buttons - Only show when cart has items */}
                {cart.length > 0 && isCartTab && (
                    <div className="shrink-0 border-t border-gray-200 p-4 space-y-4 bg-white" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                        {/* Total */}
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-medium text-gray-700">Subtotal:</span>
                                <span className="text-lg font-medium text-gray-900">
                                    ${cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}
                                </span>
                            </div>

                            {selectedDiscount && (
                                <div className="flex justify-between items-center text-green-600">
                                    <span className="text-sm font-medium">
                                        Discount ({selectedDiscount.type.replace('_', ' ')} - {(selectedDiscount.rate * 100).toFixed(0)}%):
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

                            <div className="border-t border-gray-300 pt-2 flex justify-between items-center">
                                <span className="text-xl font-semibold text-gray-700">Total:</span>
                                <span className="text-2xl font-bold text-primary">${getCartTotal().toFixed(2)}</span>
                            </div>
                        </div>

                        {isLoggedIn ? (
                            <div className="space-y-3">
                                <button
                                    onClick={() => setShowPaymentOptions((current) => !current)}
                                    className="w-full bg-primary text-white py-3.5 px-4 rounded-xl hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors font-semibold text-base active:bg-orange-700"
                                >
                                    {showPaymentOptions ? 'Hide Payment Options' : 'Choose Payment Method'}
                                </button>

                                {showPaymentOptions && (
                                    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-3">
                                        <div>
                                            <select
                                                value={currency}
                                                onChange={(e) => onCurrencyChange(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
                                            >
                                                <option value="HUF">Hungarian Forint (HUF)</option>
                                                <option value="EUR">Euro (EUR)</option>
                                                <option value="USD">US Dollar (USD)</option>
                                            </select>
                                        </div>

                                        <button
                                            onClick={() => handlePaymentClick(onGooglePay)}
                                            disabled={isEditor || (isParent && !selectedChildId)}
                                            className={`w-full py-4 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2 transition-colors font-semibold text-lg ${isEditor || (isParent && !selectedChildId) ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700'}`}
                                        >
                                            {isEditor ? 'Ordering disabled' : isParent && !selectedChildId ? 'Select a child first' : 'Pay with Google Pay'}
                                        </button>
                                        <button
                                            onClick={() => handlePaymentClick(onPayPal)}
                                            disabled={isEditor || (isParent && !selectedChildId)}
                                            className={`w-full py-4 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 transition-colors font-semibold text-lg ${isEditor || (isParent && !selectedChildId) ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'}`}
                                        >
                                            {isEditor ? 'Ordering disabled' : isParent && !selectedChildId ? 'Select a child first' : 'Pay with PayPal'}
                                        </button>
                                        <button
                                            onClick={() => handlePaymentClick(onBalance)}
                                            disabled={isEditor || (isParent && !selectedChildId)}
                                            className={`w-full py-4 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-offset-2 transition-colors font-semibold text-lg ${isEditor || (isParent && !selectedChildId) ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'}`}
                                        >
                                            {isEditor ? 'Ordering disabled' : isParent && !selectedChildId ? 'Select a child first' : 'Pay with Account Balance'}
                                        </button>
                                        {isEditor && (
                                            <p className="text-sm text-orange-700">Editor accounts may browse the menu but cannot complete purchases.</p>
                                        )}
                                        {isParent && !selectedChildId && (
                                            <p className="text-sm text-orange-700">Select a linked child before completing the order.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <button
                                    onClick={() => window.location.href = '/login'}
                                    className="w-full bg-primary text-white py-4 px-4 rounded-xl hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors font-semibold text-lg active:bg-orange-700"
                                >
                                    Login to Continue
                                </button>
                                <p className="text-sm text-gray-600">Login once to unlock Google Pay, PayPal, account balance payments, discounts, and vouchers.</p>
                            </div>
                        )}
                    </div>
                )}

                {cart.length > 0 && !isCartTab && (
                    <div className="shrink-0 border-t border-gray-200 bg-white p-4 space-y-3" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Ready to pay</p>
                                <p className="mt-1 text-xl font-bold text-primary">${getCartTotal().toFixed(2)}</p>
                                {(selectedDiscount || appliedVoucher) && (
                                    <div className="mt-1 space-y-1 text-xs">
                                        {selectedDiscount && (
                                            <p className="text-green-600">
                                                Discount applied: -${getDiscountAmount().toFixed(2)}
                                            </p>
                                        )}
                                        {appliedVoucher && (
                                            <p className="text-purple-600">
                                                Voucher applied: -${appliedVoucher.marketValue.toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setActiveTab('cart')}
                                className="shrink-0 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-secondary"
                            >
                                Go to Cart
                            </button>
                        </div>
                        {!selectedDiscount && !appliedVoucher && (
                            <p className="text-xs text-gray-500">
                                Discounts and vouchers stay visible here. Open Cart when you want to check out.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};