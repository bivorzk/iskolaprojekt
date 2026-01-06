const { useState, useEffect } = React;

const StudentDashboard = () => {
    const [activeSection, setActiveSection] = useState('orders');
    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState({
        totalUsers: '--',
        activeSessions: '--',
        ordersMade: '--',
        totalMenuItems: '--',
        paymentStats: '--'
    });
    const [walletAmount, setWalletAmount] = useState(0);
    const [uploadForm, setUploadForm] = useState({
        amount: '',
        currency: 'HUF'
    });
    const [loading, setLoading] = useState(true);
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [parentLinkStatus, setParentLinkStatus] = useState({ linked: false, parentEmail: '' });
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    useEffect(() => {
        loadDashboardData();
        // Load Google Pay script
        loadGooglePayScript();
    }, []);
    
    // Periodic wallet balance refresh
    useEffect(() => {
        // Refresh balance every 30 seconds when the wallet section is active
        const interval = setInterval(() => {
            if (activeSection === 'wallet') {
                refreshWalletBalance();
            }
        }, 30000);
        
        return () => clearInterval(interval);
    }, [activeSection]);

    const loadGooglePayScript = () => {
        // Load Google Pay SDK first
        const googlePayScript = document.createElement('script');
        googlePayScript.src = 'https://pay.google.com/gp/p/js/pay.js';
        googlePayScript.onload = () => {
            // Then load the local googlepay.js file
            const localGooglePayScript = document.createElement('script');
            localGooglePayScript.src = '/googlepay.js';
            localGooglePayScript.onload = () => {
                // Wait for the DOM element to be available before initializing
                const checkForContainer = () => {
                    const container = document.getElementById('gpay-container');
                    if (container && window.initializeGooglePay) {
                        console.log('Initializing Google Pay...');
                        window.initializeGooglePay();
                    } else if (container) {
                        // Container exists but initializeGooglePay is not available
                        console.error('Google Pay initialization function not found');
                        container.innerHTML = '<p class="text-red-600">Google Pay initialization failed</p>';
                    } else {
                        // Container doesn't exist yet, try again in 100ms
                        setTimeout(checkForContainer, 100);
                    }
                };
                
                // Start checking for container
                checkForContainer();
            };
            document.head.appendChild(localGooglePayScript);
        };
        googlePayScript.onerror = () => {
            console.error('Failed to load Google Pay script');
            // Use a timeout to ensure the container exists before setting error message
            setTimeout(() => {
                const container = document.getElementById('gpay-container');
                if (container) {
                    container.innerHTML = '<p class="text-red-600">Failed to load Google Pay</p>';
                }
            }, 1000);
        };
        document.head.appendChild(googlePayScript);
        
        // Also load PayPal script
        loadPayPalScript();
    };
    
    const loadPayPalScript = () => {
        const paypalScript = document.createElement('script');
        paypalScript.src = '/paypal.js';
        paypalScript.onload = () => {
            console.log('PayPal script loaded');
        };
        paypalScript.onerror = () => {
            console.error('Failed to load PayPal script');
        };
        document.head.appendChild(paypalScript);
    };

    const loadDashboardData = async () => {
        try {
            // Helper function to safely fetch and parse JSON
            const safeFetch = async (url, fallbackData = null) => {
                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        console.warn(`API endpoint ${url} returned ${response.status}`);
                        return fallbackData;
                    }
                    const data = await response.json();
                    return data;
                } catch (error) {
                    console.warn(`Failed to fetch ${url}:`, error.message);
                    return fallbackData;
                }
            };

            // Fetch data with fallbacks
            const ordersData = await safeFetch('/dashboard/student/order_history', { orderData: [] });
            const menuData = await safeFetch('/api/menu-items', []);
            const welcomeData = await safeFetch('/dashboard/student/welcome-message', { message: 'Welcome, Student' });
            const transactionsData = await safeFetch('/dashboard/student/transactions', { transactions: [] });
            const parentData = await safeFetch('/dashboard/student/parent', { linked: false, parentEmail: '' });
            
            // Get wallet balance using the dedicated function
            const currentBalance = await refreshWalletBalance();
            if (currentBalance === null) {
                // Fallback to direct API call if refreshWalletBalance fails
                const walletData = await safeFetch('/dashboard/student/wallet/balance', { balance: 0 });
                setWalletAmount(walletData.balance || 0);
            }

            setOrders(ordersData.orderData || []);
            setWelcomeMessage(welcomeData.message || 'Welcome, Student');
            setTransactions(transactionsData.transactions || []);
            setParentLinkStatus(parentData);
            setStats({
                totalUsers: '--',
                activeSessions: '--',
                ordersMade: ordersData.orderData?.length || 0,
                totalMenuItems: menuData.length || 0,
                paymentStats: '--'
            });
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Set fallback data
            setOrders([]);
            setWelcomeMessage('Welcome, Student');
            setTransactions([]);
            setParentLinkStatus({ linked: false, parentEmail: '' });
            setStats({
                totalUsers: '--',
                activeSessions: '--',
                ordersMade: 0,
                totalMenuItems: 0,
                paymentStats: '--'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUploadFormChange = (e) => {
        const { name, value } = e.target;
        setUploadForm({
            ...uploadForm,
            [name]: value
        });
        // Sync with hidden fields that googlepay.js expects
        syncPaymentFields(name === 'amount' ? value : uploadForm.amount, name === 'currency' ? value : uploadForm.currency);
    };

    const validateNumber = (value, min = 0, max = 100000) => {
        const num = Number(value);
        if (isNaN(num)) return false;
        if (!isFinite(num)) return false;
        if (num < min) return false;
        if (num > max) return false;
        return true;
    };

    const inputValidation = (elements) => {
        let valid = true;
        
        elements.forEach(el => {
            const value = el.value ? el.value.trim() : '';
            const type = el.getAttribute('data-type');
            let errorCode = null;

            // Required field check
            if (el.hasAttribute('data-required') && !value) {
                valid = false;
                errorCode = 'REQUIRED';
            }
            // Type-specific validation
            else if (type === 'text') {
                const regex = /^[a-zA-Z0-9\s.,'-]*$/;
                if (!regex.test(value)) {
                    valid = false;
                    errorCode = 'INVALID_TEXT';
                }
            } 
            else if (type === 'number') {
                const min = parseFloat(el.getAttribute('data-min')) || 0;
                const max = parseFloat(el.getAttribute('data-max')) || 100000;
                if (!validateNumber(value, min, max)) {
                    valid = false;
                    errorCode = 'INVALID_NUMBER';
                }
            }

            // Dangerous string check
            if (
                value.includes("<") || value.includes(">") ||
                value.includes("'") || value.includes('"') ||
                value.includes(";") || value.includes("--") ||
                value.includes('<script>') || value.includes('</script>') ||
                value.includes('$ne') || value.includes('$gt') ||
                value.includes('$lt')
            ) {
                valid = false;
                errorCode = 'INVALID_CHAR';
            }

            // Apply error class and store custom code
            if (errorCode) {
                el.classList.add('input-error');
                el.setAttribute('data-error', errorCode);
            } else {
                el.classList.remove('input-error');
                el.removeAttribute('data-error');
            }
        });

        return valid;
    };

    const syncPaymentFields = (amount, currency) => {
        // Update hidden fields that googlepay.js expects
        const priceField = document.getElementById('price');
        const convertedAmountField = document.getElementById('convertedAmount');
        const currencyField = document.getElementById('currency');
        
        if (priceField) priceField.value = amount || '0';
        if (convertedAmountField) convertedAmountField.value = amount || '0';
        if (currencyField) currencyField.value = currency || 'HUF';
        
        console.log('Synced payment fields:', { amount, currency });
    };
    
    const refreshWalletBalance = async () => {
        try {
            const balanceResponse = await fetch('/dashboard/student/wallet/balance');
            if (balanceResponse.ok) {
                const balanceData = await balanceResponse.json();
                setWalletAmount(balanceData.balance || 0);
                console.log('Wallet balance refreshed:', balanceData.balance);
                return balanceData.balance;
            } else {
                console.warn('Failed to refresh wallet balance');
                return null;
            }
        } catch (error) {
            console.error('Error refreshing wallet balance:', error);
            return null;
        }
    };

    const handleWalletUpload = async () => {
        if (!uploadForm.amount || uploadForm.amount <= 0 || (uploadForm.currency === 'HUF' && uploadForm.amount < 300)) {
            alert('Please enter a valid amount');
            return;
        }
        
        // Show payment method selection modal
        setShowPaymentModal(true);
    };
    
    const handlePaymentMethodSelect = (method) => {
        setShowPaymentModal(false);
        
        // Update hidden fields for payment scripts
        syncPaymentFields(uploadForm.amount, uploadForm.currency);
        
        if (method === 'googlepay') {
            handleGooglePayPayment();
        } else if (method === 'paypal') {
            handlePayPalPayment();
        }
    };
    
    const handleGooglePayPayment = async () => {
        try {
            const amount = parseFloat(uploadForm.amount);
            const currency = uploadForm.currency;
            
            if (!amount || amount <= 0) {
                alert('Please enter a valid amount');
                return;
            }
            
            // For wallet deposits, we'll create a simpler Google Pay integration
            // that doesn't rely on the complex order system
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
                        merchantName: 'SnapTray Wallet'
                    }
                };
                
                console.log('Starting Google Pay for wallet deposit:', paymentDataRequest);
                
                try {
                    const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
                    console.log('Google Pay payment successful:', paymentData);
                    
                    // Save transaction to database
                    try {
                        const saveResponse = await fetch('/dashboard/student/wallet/add', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                amount: amount,
                                currency: currency,
                                paymentMethod: 'GooglePay',
                                transactionId: paymentData.paymentMethodData?.tokenizationData?.token || 'gpay_' + Date.now()
                            })
                        });
                        
                        console.log('Save response status:', saveResponse.status);
                        
                        if (saveResponse.ok) {
                            const saveResult = await saveResponse.json();
                            console.log('Transaction saved successfully:', saveResult);
                            
                            // Fetch fresh balance from backend
                            try {
                                const balanceResponse = await fetch('/dashboard/student/wallet/balance');
                                if (balanceResponse.ok) {
                                    const balanceData = await balanceResponse.json();
                                    setWalletAmount(balanceData.balance || 0);
                                } else {
                                    console.warn('Failed to fetch updated balance');
                                    // Fallback to server response if balance fetch fails
                                    setWalletAmount(saveResult.newBalance || walletAmount);
                                }
                            } catch (balanceError) {
                                console.warn('Error fetching balance:', balanceError);
                                // Fallback to server response if balance fetch fails
                                setWalletAmount(saveResult.newBalance || walletAmount);
                            }
                            
                            setUploadForm({ amount: '', currency: 'HUF' });
                            
                            alert(`Successfully added ${amount} ${currency} to your wallet!`);
                            
                            // Refresh transactions list
                            try {
                                const transactionsData = await fetch('/dashboard/student/transactions');
                                if (transactionsData.ok) {
                                    const txData = await transactionsData.json();
                                    setTransactions(txData.transactions || []);
                                }
                            } catch (txError) {
                                console.warn('Failed to refresh transactions:', txError);
                            }
                        } else {
                            const errorData = await saveResponse.json().catch(() => ({ error: 'Unknown error' }));
                            console.error('Failed to save transaction:', errorData);
                            alert(`Payment successful but failed to update wallet: ${errorData.error}. Please contact support.`);
                        }
                    } catch (saveError) {
                        console.error('Error saving transaction:', saveError);
                        alert('Payment successful but failed to update wallet. Please contact support.');
                    }
                    
                    // Close modal
                    setShowPaymentModal(false);
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
        try {
            // Store amount and currency for use in PayPal callback
            window.walletDepositData = {
                amount: parseFloat(uploadForm.amount),
                currency: uploadForm.currency
            };
            
            // Initialize PayPal for wallet if not already done
            if (window.loadPayPalSDK && window.renderPayPalButtons) {
                const paypalContainer = document.getElementById('paypal-button-container');
                if (paypalContainer) {
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
                    description.textContent = `Adding ${uploadForm.amount} ${uploadForm.currency} to wallet`;
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
                    
                    // Now load PayPal SDK and render buttons
                    window.loadPayPalSDK(() => {
                        // Wait a moment for DOM to be ready
                        setTimeout(() => {
                            // Verify element exists before rendering
                            const targetElement = document.getElementById('paypal-buttons-wrapper');
                            if (!targetElement) {
                                console.error('PayPal wrapper element not found');
                                alert('PayPal initialization failed. Please try again.');
                                return;
                            }
                            
                            // Custom PayPal configuration for wallet deposit
                            const paypalButtons = paypal.Buttons({
                                style: {
                                    shape: "rect",
                                    layout: "vertical",
                                    color: "gold",
                                    label: "paypal",
                                },
                                createOrder: function(data, actions) {
                                    const depositData = window.walletDepositData;
                                    const convertedAmount = depositData.currency === 'USD' ? depositData.amount : (depositData.amount * 0.003);
                                    
                                    return actions.order.create({
                                        purchase_units: [{
                                            amount: {
                                                value: convertedAmount.toFixed(2),
                                                currency_code: 'USD'
                                            },
                                            description: `Wallet Deposit - ${depositData.amount} ${depositData.currency}`
                                        }]
                                    });
                                },
                                onApprove: async function(data, actions) {
                                    try {
                                        const details = await actions.order.capture();
                                        console.log('PayPal payment successful:', details);
                                        
                                        const depositData = window.walletDepositData;
                                        console.log('Saving PayPal transaction:', {
                                            amount: depositData.amount,
                                            currency: depositData.currency,
                                            paymentMethod: 'PayPal',
                                            transactionId: details.id
                                        });
                                        
                                        // Save transaction to database
                                        const saveResponse = await fetch('/dashboard/student/wallet/add', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({
                                                amount: depositData.amount,
                                                currency: depositData.currency,
                                                paymentMethod: 'PayPal',
                                                transactionId: details.id
                                            })
                                        });
                                        
                                        console.log('PayPal save response status:', saveResponse.status);
                                        
                                        if (saveResponse.ok) {
                                            const saveResult = await saveResponse.json();
                                            console.log('PayPal transaction saved successfully:', saveResult);
                                            
                                            // Fetch fresh balance from backend
                                            try {
                                                const balanceResponse = await fetch('/dashboard/student/wallet/balance');
                                                if (balanceResponse.ok) {
                                                    const balanceData = await balanceResponse.json();
                                                    setWalletAmount(balanceData.balance || 0);
                                                } else {
                                                    console.warn('Failed to fetch updated balance');
                                                    // Fallback to server response if balance fetch fails
                                                    setWalletAmount(saveResult.newBalance || walletAmount);
                                                }
                                            } catch (balanceError) {
                                                console.warn('Error fetching balance:', balanceError);
                                                // Fallback to server response if balance fetch fails
                                                setWalletAmount(saveResult.newBalance || walletAmount);
                                            }
                                            
                                            setUploadForm({ amount: '', currency: 'HUF' });
                                            
                                            alert(`Successfully added ${depositData.amount} ${depositData.currency} to your wallet!`);
                                            
                                            // Refresh transactions list
                                            try {
                                                const transactionsData = await fetch('/dashboard/student/transactions');
                                                if (transactionsData.ok) {
                                                    const txData = await transactionsData.json();
                                                    setTransactions(txData.transactions || []);
                                                }
                                            } catch (txError) {
                                                console.warn('Failed to refresh transactions:', txError);
                                            }
                                            
                                            // Close PayPal modal
                                            paypalContainer.style.display = 'none';
                                        } else {
                                            const errorData = await saveResponse.json().catch(() => ({ error: 'Unknown error' }));
                                            console.error('PayPal save failed:', errorData);
                                            alert(`Payment successful but failed to update wallet: ${errorData.error}. Please contact support.`);
                                        }
                                    } catch (error) {
                                        console.error('Error processing PayPal payment:', error);
                                        alert('Payment completed but failed to update wallet. Please contact support.');
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
                            paypalButtons.render('#paypal-buttons-wrapper').catch(function(err) {
                                console.error('PayPal render error:', err);
                                alert('Failed to load PayPal. Please try again.');
                            });
                        }, 100);
                    });
                }
            } else {
                alert('PayPal is not ready. Please try again.');
            }
        } catch (error) {
            console.error('PayPal error:', error);
            alert('PayPal failed. Please try again.');
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'delivered':
                return 'bg-green-100 text-green-800';
            case 'pending':
            case 'processing':
                return 'bg-yellow-100 text-yellow-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-accent to-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-accent to-white">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="flex justify-between items-center py-4 w-full">
                    <div className="flex items-center space-x-4 px-4 sm:px-6 lg:px-8">
                        <svg viewBox="0 0 500 140" className="h-20 w-auto">
                            <rect x="25" y="55" width="90" height="50" rx="6" fill="#FF6B35"/>
                            <rect x="30" y="60" width="35" height="40" rx="3" fill="#FFE5DC"/>
                            <rect x="70" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                            <rect x="95" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                            <rect x="70" y="82" width="45" height="18" rx="3" fill="#FFE5DC"/>
                            <path d="M80 25 L65 52 L75 52 L60 80 L85 50 L75 50 L90 25 Z" fill="#FFC857" stroke="#FF6B35" strokeWidth="2" strokeLinejoin="round"/>
                            <text x="150" y="85" fontFamily="system-ui, -apple-system, sans-serif" fontSize="32" fontWeight="bold" fill="#FF6B35" letterSpacing="-1">SnapTray</text>
                            <text x="150" y="105" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fill="#6C757D" letterSpacing="2">STUDENT PANEL</text>
                        </svg>
                    </div>
                    <div className="flex items-center space-x-4 pr-4 sm:pr-6 lg:pr-8">
                        <div className="text-right">
                            <div className="text-sm text-gray-600">Wallet Balance</div>
                            <div className="text-lg font-semibold text-primary">${walletAmount.toFixed(2)}</div>
                        </div>
                        <span className="text-gray-700">{welcomeMessage || 'Welcome, Student'}</span>
                        <a href="/logout" className="text-primary hover:text-secondary font-medium">Logout</a>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside className="w-64 bg-white shadow-lg min-h-screen">
                    <nav className="mt-8">
                        <div className="px-4 space-y-2">
                            <button
                                onClick={() => setActiveSection('orders')}
                                className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                                    activeSection === 'orders'
                                        ? 'bg-primary text-white'
                                        : 'text-gray-700 hover:bg-accent hover:text-primary'
                                }`}
                            >
                                My Orders
                            </button>
                            <button
                                onClick={() => setActiveSection('wallet')}
                                className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                                    activeSection === 'wallet'
                                        ? 'bg-primary text-white'
                                        : 'text-gray-700 hover:bg-accent hover:text-primary'
                                }`}
                            >
                                Wallet
                            </button>
                            <button
                                onClick={() => setActiveSection('transactions')}
                                className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                                    activeSection === 'transactions'
                                        ? 'bg-primary text-white'
                                        : 'text-gray-700 hover:bg-accent hover:text-primary'
                                }`}
                            >
                                Transactions
                            </button>
                            <button
                                onClick={() => setActiveSection('stats')}
                                className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                                    activeSection === 'stats'
                                        ? 'bg-primary text-white'
                                        : 'text-gray-700 hover:bg-accent hover:text-primary'
                                }`}
                            >
                                Statistics
                            </button>
                            <button
                                onClick={() => setActiveSection('settings')}
                                className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                                    activeSection === 'settings'
                                        ? 'bg-primary text-white'
                                        : 'text-gray-700 hover:bg-accent hover:text-primary'
                                }`}
                            >
                                Settings
                            </button>
                        </div>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8">
                    {activeSection === 'orders' && (
                        <div>
                            <h2 className="text-2xl font-bold text-primary mb-6">My Orders</h2>
                            {orders.length === 0 ? (
                                <div className="bg-white p-8 rounded-lg shadow text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                                    </svg>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                                    <p className="text-gray-600 mb-4">Start ordering from the cafeteria to see your order history here.</p>
                                    <a
                                        href="/Order/"
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                                    >
                                        Start Ordering
                                    </a>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {orders.map((order, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        #{order.orderId}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                        {new Date(order.orderDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                        ${order.totalAmount?.toFixed(2) || '0.00'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                                            {order.status || 'Pending'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeSection === 'wallet' && (
                        <div>
                            <h2 className="text-2xl font-bold text-primary mb-6">Wallet Management</h2>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Current Balance */}
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Balance</h3>
                                    <div className="text-3xl font-bold text-primary mb-2">${walletAmount.toFixed(2)}</div>
                                    <p className="text-gray-600">Available for cafeteria purchases</p>
                                </div>

                                {/* Add Money */}
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Money to Wallet</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                            <input
                                                type="number"
                                                name="amount"
                                                value={uploadForm.amount}
                                                onChange={handleUploadFormChange}
                                                onBlur={(e) => {
                                                    const elements = [e.target];
                                                    inputValidation(elements);
                                                }}
                                                min="0"
                                                step="0.01"
                                                placeholder="Enter amount"
                                                data-required="true"
                                                data-type="number"
                                                data-min="0"
                                                data-max="100000"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                            <select
                                                name="currency"
                                                value={uploadForm.currency}
                                                onChange={handleUploadFormChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                                            >
                                                <option value="HUF">HUF</option>
                                                <option value="EUR">EUR</option>
                                                <option value="USD">USD</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={handleWalletUpload}
                                            className="w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                                        >
                                            Choose Payment Method
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'transactions' && (
                        <div>
                            <h2 className="text-2xl font-bold text-primary mb-6">Transaction History</h2>
                            {transactions.length === 0 ? (
                                <div className="bg-white p-8 rounded-lg shadow text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                                    </svg>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                                    <p className="text-gray-600">Your payment transactions will appear here.</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {transactions.map((tx, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {tx._id}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                        {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).getHours()}:{new Date(tx.date).getMinutes().toString().padStart(2, '0')}:{new Date(tx.date).getSeconds().toString().padStart(2, '0')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                        ${tx.amount?.toFixed(2) || '0.00'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                        {tx.paymentMethod || 'N/A'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeSection === 'stats' && (
                        <div>
                            <h2 className="text-2xl font-bold text-primary mb-6">Statistics</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="text-2xl font-bold text-primary">{stats.ordersMade}</div>
                                    <div className="text-gray-600">Your Orders</div>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="text-2xl font-bold text-primary">{stats.totalMenuItems}</div>
                                    <div className="text-gray-600">Menu Items Available</div>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="text-2xl font-bold text-primary">${walletAmount.toFixed(2)}</div>
                                    <div className="text-gray-600">Wallet Balance</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'settings' && (
                        <div>
                            <h2 className="text-2xl font-bold text-primary mb-6">Settings</h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">Account Settings</h3>
                                            <a
                                                href="/password_reset.html"
                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                                            >
                                                Change Password
                                            </a>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Parent Account Link</h3>
                                    <div className="text-sm text-gray-600">
                                        {parentLinkStatus.linked ? (
                                            <p className="text-green-600">
                                                <span className="font-medium">Linked to parent account:</span><br/>
                                                {parentLinkStatus.parentEmail}
                                            </p>
                                        ) : (
                                            <p className="text-gray-500">No parent account linked.</p>
                                        )}
                                    </div>
                                    <div className="mt-4">
                                        <p className="text-xs text-gray-500">Contact administration to manage parent account linking.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}                </main>
            </div>
            
            {/* Payment Method Selection Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Payment Method</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Add {uploadForm.amount} {uploadForm.currency} to your wallet using:
                        </p>
                        
                        <div className="space-y-3">
                            <button
                                onClick={() => handlePaymentMethodSelect('googlepay')}
                                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                            >
                                <div className="flex items-center">
                                    <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded mr-3 flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">G</span>
                                    </div>
                                    <span className="font-medium">Google Pay</span>
                                </div>
                            </button>
                            
                            <button
                                onClick={() => handlePaymentMethodSelect('paypal')}
                                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                            >
                                <div className="flex items-center">
                                    <div className="w-8 h-8 bg-blue-600 rounded mr-3 flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">PP</span>
                                    </div>
                                    <span className="font-medium">PayPal</span>
                                </div>
                            </button>
                        </div>
                        
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 focus:outline-none"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')).render(<StudentDashboard />);