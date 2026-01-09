const { useState, useEffect } = React;

        const OrderPage = () => {
            const [menuItems, setMenuItems] = useState([]);
            const [cart, setCart] = useState([]);
            const [currency, setCurrency] = useState('HUF');
            const [loading, setLoading] = useState(true);
            const [searchTerm, setSearchTerm] = useState('');
            const [selectedCategory, setSelectedCategory] = useState('all');

            useEffect(() => {
                loadMenuItems();
                loadCartFromStorage();
                loadGooglePayScript();
                loadPayPalScript();
            }, []);

            const loadMenuItems = async () => {
                try {
                    const response = await fetch('/api/menu-items');
                    const data = await response.json();
                    setMenuItems(data.filter(item => item.available));
                } catch (error) {
                    console.error('Error loading menu items:', error);
                } finally {
                    setLoading(false);
                }
            };

            const loadCartFromStorage = () => {
                const savedCart = localStorage.getItem('cart');
                if (savedCart) {
                    try {
                        setCart(JSON.parse(savedCart));
                    } catch (error) {
                        console.error('Error loading cart from storage:', error);
                    }
                }
            };

            const loadGooglePayScript = () => {
                // Load Google Pay SDK first
                const googlePayScript = document.createElement('script');
                googlePayScript.src = 'https://pay.google.com/gp/p/js/pay.js';
                googlePayScript.onload = () => {
                    // Then load the local googlepay.js file
                    const localGooglePayScript = document.createElement('script');
                    localGooglePayScript.src = '/googlepay.js';
                    localGooglePayScript.onload = () => {
                        console.log('Google Pay scripts loaded');
                    };
                    localGooglePayScript.onerror = () => {
                        console.error('Failed to load local Google Pay script');
                    };
                    document.head.appendChild(localGooglePayScript);
                };
                googlePayScript.onerror = () => {
                    console.error('Failed to load Google Pay SDK');
                };
                document.head.appendChild(googlePayScript);
            };

            const loadPayPalScript = () => {
                // Check if PayPal script is already loaded
                if (window.paypal) {
                    console.log('PayPal SDK already loaded');
                    return;
                }

                // Load PayPal SDK
                const paypalScript = document.createElement('script');
                paypalScript.src = 'https://www.paypal.com/sdk/js?client-id=AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqX3PiV8e1GWU6liB2CUXlkA59kJXE7M6R&components=buttons&currency=USD';
                paypalScript.onload = () => {
                    console.log('PayPal script loaded successfully');
                    if (window.paypal) {
                        console.log('PayPal SDK is available');
                    } else {
                        console.error('PayPal SDK not available after script load');
                    }
                };
                paypalScript.onerror = () => {
                    console.error('Failed to load PayPal script');
                };
                document.head.appendChild(paypalScript);
            };

            const saveCartToStorage = (newCart) => {
                localStorage.setItem('cart', JSON.stringify(newCart));
            };

            const addToCart = (item) => {
                const existingItem = cart.find(cartItem => cartItem._id === item._id);
                if (existingItem) {
                    const newCart = cart.map(cartItem =>
                        cartItem._id === item._id
                            ? { ...cartItem, quantity: cartItem.quantity + 1 }
                            : cartItem
                    );
                    setCart(newCart);
                    saveCartToStorage(newCart);
                } else {
                    const newCart = [...cart, { ...item, quantity: 1 }];
                    setCart(newCart);
                    saveCartToStorage(newCart);
                }
            };

            const removeFromCart = (itemId) => {
                const newCart = cart.filter(item => item._id !== itemId);
                setCart(newCart);
                saveCartToStorage(newCart);
            };

            const updateQuantity = (itemId, newQuantity) => {
                if (newQuantity <= 0) {
                    removeFromCart(itemId);
                    return;
                }
                const newCart = cart.map(item =>
                    item._id === itemId ? { ...item, quantity: newQuantity } : item
                );
                setCart(newCart);
                saveCartToStorage(newCart);
            };

            const getCartTotal = () => {
                return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
            };

            const getConvertedAmount = async (amount, targetCurrency) => {
                // This would integrate with a currency conversion API
                // For now, return the same amount
                return amount;
            };

            const handleGooglePayPayment = async () => {
                try {
                    const amount = getCartTotal();
                    if (!amount || amount <= 0) {
                        alert('Your cart is empty');
                        return;
                    }

                    if (window.google && window.google.payments) {
                        const paymentsClient = new google.payments.api.PaymentsClient({
                            environment: 'TEST'
                        });

                        const allowedPaymentMethods = [{
                            type: 'CARD',
                            parameters: {
                                allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                                allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA']
                            },
                            tokenizationSpecification: {
                                type: 'PAYMENT_GATEWAY',
                                parameters: {
                                    gateway: 'example',
                                    gatewayMerchantId: 'exampleGatewayMerchantId'
                                }
                            }
                        }];

                        // Convert to USD for Google Pay (required)
                        const convertedAmount = currency === 'USD' ? amount : (amount * 0.0027);

                        const paymentDataRequest = {
                            apiVersion: 2,
                            apiVersionMinor: 0,
                            allowedPaymentMethods: allowedPaymentMethods,
                            transactionInfo: {
                                totalPriceStatus: 'FINAL',
                                totalPrice: convertedAmount.toFixed(2),
                                currencyCode: 'USD'
                            },
                            merchantInfo: {
                                merchantName: 'SnapTray Order'
                            }
                        };

                        console.log('Starting Google Pay for order:', paymentDataRequest);

                        try {
                            const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
                            console.log('Google Pay payment successful:', paymentData);

                            // Save order to database
                            try {
                                const saveResponse = await fetch('/api/save-order', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        items: cart,
                                        total: amount,
                                        currency: currency,
                                        paymentMethod: 'GooglePay',
                                        transactionId: paymentData.paymentMethodData?.tokenizationData?.token || 'gpay_' + Date.now()
                                    })
                                });

                                console.log('Save response status:', saveResponse.status);

                                if (saveResponse.ok) {
                                    const saveResult = await saveResponse.json();
                                    console.log('Order saved successfully:', saveResult);

                                    // Clear cart
                                    setCart([]);
                                    saveCartToStorage([]);

                                    alert(`Order placed successfully! Order ID: ${saveResult.orderId || 'N/A'}`);
                                } else {
                                    const errorData = await saveResponse.json().catch(() => ({ error: 'Unknown error' }));
                                    console.error('Failed to save order:', errorData);
                                    alert(`Payment successful but failed to place order: ${errorData.error}. Please contact support.`);
                                }
                            } catch (saveError) {
                                console.error('Error saving order:', saveError);
                                alert('Payment successful but failed to place order. Please contact support.');
                            }
                        } catch (paymentError) {
                            console.error('Google Pay payment error:', paymentError);
                            if (paymentError.statusCode === 'CANCELED') {
                                console.log('Payment was canceled by user');
                            } else {
                                alert('Payment failed. Please try again.');
                            }
                        }
                    } else {
                        alert('Google Pay is not available. Please try again or use PayPal.');
                    }
                } catch (error) {
                    console.error('Google Pay initialization error:', error);
                    alert('Google Pay failed to initialize. Please try again.');
                }
            };

            const handlePayPalPayment = async () => {
                console.log('PayPal button clicked');
                try {
                    const amount = getCartTotal();
                    console.log('Cart total:', amount);
                    if (!amount || amount <= 0) {
                        alert('Your cart is empty');
                        return;
                    }

                    // Store order data for use in PayPal callback
                    window.orderData = {
                        items: cart,
                        total: amount,
                        currency: currency
                    };
                    console.log('Order data stored:', window.orderData);

                    // Check if PayPal SDK is loaded
                    if (!window.paypal) {
                        console.error('PayPal SDK not loaded');
                        alert('PayPal is not ready. Please refresh the page and try again.');
                        return;
                    }
                    console.log('PayPal SDK is available');

                    // Initialize PayPal for order
                    const paypalContainer = document.getElementById('paypal-button-container');
                    if (!paypalContainer) {
                        console.error('PayPal container not found');
                        alert('PayPal container not found. Please refresh the page.');
                        return;
                    }
                    console.log('PayPal container found');

                    paypalContainer.innerHTML = '';

                    // Create wrapper with proper DOM structure
                    const wrapper = document.createElement('div');
                    wrapper.style.padding = '20px';
                    wrapper.style.maxWidth = '400px';

                    const title = document.createElement('h3');
                    title.textContent = 'PayPal Payment';
                    title.style.margin = '0 0 15px 0';
                    title.style.color = '#333';

                    const description = document.createElement('p');
                    description.textContent = `Paying ${amount.toFixed(2)} ${currency} for order`;
                    description.style.margin = '0 0 15px 0';
                    description.style.color = '#666';

                    const buttonsWrapper = document.createElement('div');
                    buttonsWrapper.id = 'paypal-buttons-wrapper';

                    wrapper.appendChild(title);
                    wrapper.appendChild(description);
                    wrapper.appendChild(buttonsWrapper);
                    paypalContainer.appendChild(wrapper);

                    // Show the PayPal container
                    paypalContainer.style.display = 'block';
                    paypalContainer.style.position = 'fixed';
                    paypalContainer.style.top = '50%';
                    paypalContainer.style.left = '50%';
                    paypalContainer.style.transform = 'translate(-50%, -50%)';
                    paypalContainer.style.zIndex = '9999';
                    paypalContainer.style.backgroundColor = 'white';
                    paypalContainer.style.padding = '20px';
                    paypalContainer.style.border = '2px solid #ccc';
                    paypalContainer.style.borderRadius = '8px';
                    paypalContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';

                    // Add close button
                    const closeBtn = document.createElement('button');
                    closeBtn.innerHTML = '×';
                    closeBtn.style.position = 'absolute';
                    closeBtn.style.top = '10px';
                    closeBtn.style.right = '15px';
                    closeBtn.style.background = 'none';
                    closeBtn.style.border = 'none';
                    closeBtn.style.fontSize = '24px';
                    closeBtn.style.cursor = 'pointer';
                    closeBtn.onclick = () => {
                        paypalContainer.style.display = 'none';
                    };
                    paypalContainer.appendChild(closeBtn);

                    console.log('Creating PayPal buttons...');

                    // Custom PayPal configuration for order
                    const paypalButtons = paypal.Buttons({
                        style: {
                            shape: "rect",
                            layout: "vertical",
                            color: "gold",
                            label: "paypal",
                        },
                        createOrder: function(data, actions) {
                            console.log('PayPal createOrder called');
                            const orderData = window.orderData;
                            const convertedAmount = orderData.currency === 'USD' ? orderData.total : (orderData.total * 0.003);
                            console.log('Creating PayPal order with amount:', convertedAmount);

                            return actions.order.create({
                                purchase_units: [{
                                    amount: {
                                        value: convertedAmount.toFixed(2),
                                        currency_code: 'USD'
                                    },
                                    description: `Order Payment - ${orderData.total} ${orderData.currency}`
                                }]
                            });
                        },
                                onApprove: async function(data, actions) {
                                    try {
                                        const details = await actions.order.capture();
                                        console.log('PayPal payment successful:', details);

                                        const orderData = window.orderData;
                                        console.log('Saving PayPal order:', {
                                            items: orderData.items,
                                            total: orderData.total,
                                            currency: orderData.currency,
                                            paymentMethod: 'PayPal',
                                            transactionId: details.id
                                        });

                                        // Save order to database
                                        const saveResponse = await fetch('/api/save-order', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({
                                                items: orderData.items,
                                                total: orderData.total,
                                                currency: orderData.currency,
                                                paymentMethod: 'PayPal',
                                                transactionId: details.id
                                            })
                                        });

                                        console.log('PayPal save response status:', saveResponse.status);

                                        if (saveResponse.ok) {
                                            const saveResult = await saveResponse.json();
                                            console.log('PayPal order saved successfully:', saveResult);

                                            // Clear cart
                                            setCart([]);
                                            saveCartToStorage([]);

                                            alert(`Order placed successfully! Order ID: ${saveResult.orderId || 'N/A'}`);

                                            // Close PayPal modal
                                            paypalContainer.style.display = 'none';
                                        } else {
                                            const errorData = await saveResponse.json().catch(() => ({ error: 'Unknown error' }));
                                            console.error('PayPal save failed:', errorData);
                                            alert(`Payment successful but failed to place order: ${errorData.error}. Please contact support.`);
                                        }
                                    } catch (error) {
                                        console.error('Error processing PayPal payment:', error);
                                        alert('Payment completed but failed to place order. Please contact support.');
                                    }
                                },
                                onError: function(err) {
                                    console.error('PayPal error:', err);
                                    alert('Payment failed. Please try again.');
                                },
                                onCancel: function(data) {
                                    console.log('PayPal payment cancelled');
                                    paypalContainer.style.display = 'none';
                                }
                            });

                            // Render the buttons
                            console.log('Rendering PayPal buttons...');
                            paypalButtons.render('#paypal-buttons-wrapper').then(() => {
                                console.log('PayPal buttons rendered successfully');
                            }).catch(function(err) {
                                console.error('PayPal render error:', err);
                                alert('Failed to load PayPal buttons. Please try again.');
                                paypalContainer.style.display = 'none';
                            });

                } catch (error) {
                    console.error('PayPal initialization error:', error);
                    alert('PayPal failed to initialize. Please try again.');
                }
            };

            const handleBalancePayment = async () => {
                fetch('/api/pay-with-balance', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        items: cart,
                        total: getCartTotal(),
                        currency: currencyz
                    })
                }).then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Payment successful! Your order has been placed.');
                        setCart([]);
                        saveCartToStorage([]);
                    } else {
                        alert('Payment failed: ' + data.message);
                    }
                }).catch(error => {
                    console.error('Error processing balance payment:', error);
                    alert('Payment failed due to a network error. Please try again.');
                });
            };


            const filteredMenuItems = menuItems.filter(item => {
                const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    item.description.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesCategory = selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase();
                return matchesSearch && matchesCategory;
            });

            const categories = ['all', ...new Set(menuItems.map(item => item.category))];

            if (loading) {
                return (
                    <div className="min-h-screen bg-gradient-to-br from-accent to-white flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading menu...</p>
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
                                    <a href="/dashboard/student/" className="text-primary hover:text-secondary font-medium">Dashboard</a>
                                    <a href="/logout" className="text-gray-700 hover:text-primary font-medium">Logout</a>
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Menu Section */}
                            <div className="flex-1">
                                <div className="mb-6">
                                    <h1 className="text-3xl font-bold text-primary mb-4">Cafeteria Menu</h1>

                                    {/* Search and Filter */}
                                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder="Search menu items..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <select
                                                value={selectedCategory}
                                                onChange={(e) => setSelectedCategory(e.target.value)}
                                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                            >
                                                {categories.map(category => (
                                                    <option key={category} value={category}>
                                                        {category === 'all' ? 'All Categories' : category}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Menu Items Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {filteredMenuItems.map((item) => (
                                        <div key={item._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
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

                                                <button
                                                    onClick={() => addToCart(item)}
                                                    className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                                                >
                                                    Add to Cart
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {filteredMenuItems.length === 0 && (
                                    <div className="text-center py-12">
                                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                        </svg>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                                        <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
                                    </div>
                                )}
                            </div>

                            {/* Cart Section */}
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
                                                                onClick={() => updateQuantity(item._id, item.quantity - 1)}
                                                                className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                                                            >
                                                                -
                                                            </button>
                                                            <span className="w-8 text-center">{item.quantity}</span>
                                                            <button
                                                                onClick={() => updateQuantity(item._id, item.quantity + 1)}
                                                                className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                                                            >
                                                                +
                                                            </button>
                                                            <button
                                                                onClick={() => removeFromCart(item._id)}
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
                                                        onChange={(e) => setCurrency(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                                                    >
                                                        <option value="HUF">HUF</option>
                                                        <option value="EUR">EUR</option>
                                                        <option value="USD">USD</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-3">
                                                    <button
                                                        onClick={handleGooglePayPayment}
                                                        className="w-full bg-primary text-white py-3 px-4 rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors font-medium"
                                                    >
                                                        Pay with Google Pay
                                                    </button>
                                                    <button
                                                        onClick={handlePayPalPayment}
                                                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-colors font-medium"
                                                    >
                                                        Pay with PayPal
                                                    </button>

                                                    <button
                                                        onClick={handleBalancePayment}
                                                        className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 transition-colors font-medium">
                                                    
                                                        Pay with Account Balance
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PayPal Button Container - Hidden by default */}
                    <div id="paypal-button-container" style={{ display: 'none' }}></div>
                </div>
            );
        };

        ReactDOM.render(<OrderPage />, document.getElementById('root'));