const { useState, useEffect, useCallback } = React;

// Wallet Form Hook
const useWalletForm = () => {
    const [uploadForm, setUploadForm] = useState({
        amount: '',
        currency: 'HUF'
    });
    
    const [errors, setErrors] = useState({});

    const validateNumber = (value, min = 0, max = 100000) => {
        const num = Number(value);
        if (isNaN(num)) return false;
        if (!isFinite(num)) return false;
        if (num < min) return false;
        if (num > max) return false;
        return true;
    };

    const validateInput = useCallback((name, value) => {
        let error = null;
        
        if (!value || !value.toString().trim()) {
            error = 'This field is required';
        } else if (name === 'amount') {
            if (!validateNumber(value, 0, 100000)) {
                error = 'Please enter a valid amount between 0 and 100,000';
            } else if (uploadForm.currency === 'HUF' && value < 300) {
                error = 'Minimum amount is 300 HUF';
            }
        }
        
        if (value && typeof value === 'string') {
            const dangerousChars = ["<", ">", "'", '"', ";", "--", "<script>", "</script>", "$ne", "$gt", "$lt"];
            if (dangerousChars.some(char => value.includes(char))) {
                error = 'Invalid characters detected';
            }
        }

        setErrors(prev => ({
            ...prev,
            [name]: error
        }));
        
        return !error;
    }, [uploadForm.currency]);

    const updateForm = useCallback((name, value) => {
        setUploadForm(prev => ({
            ...prev,
            [name]: value
        }));
        validateInput(name, value);
    }, [validateInput]);

    const resetForm = useCallback(() => {
        setUploadForm({ amount: '', currency: 'HUF' });
        setErrors({});
    }, []);

    const isFormValid = useCallback(() => {
        const amountValid = validateInput('amount', uploadForm.amount);
        return amountValid && !Object.values(errors).some(error => error);
    }, [uploadForm.amount, errors, validateInput]);

    return {
        uploadForm,
        errors,
        updateForm,
        resetForm,
        isFormValid,
        validateInput
    };
};

// Payment SDKs Hook
const usePaymentSDKs = () => {
    const [googlePayReady, setGooglePayReady] = useState(false);
    const [paypalReady, setPaypalReady] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadGooglePaySDK = useCallback(() => {
        if (window.google && window.google.payments) {
            checkGooglePayReadiness();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://pay.google.com/gp/p/js/pay.js';
        script.async = true;
        script.onload = () => {
            console.log('Google Pay SDK loaded');
            checkGooglePayReadiness();
        };
        script.onerror = () => {
            console.warn('Failed to load Google Pay SDK');
            setGooglePayReady(false);
            setLoading(false);
        };
        document.head.appendChild(script);
    }, []);

    const checkGooglePayReadiness = async () => {
        if (!window.google || !window.google.payments) {
            setGooglePayReady(false);
            setLoading(false);
            return;
        }

        try {
            const paymentsClient = new google.payments.api.PaymentsClient({
                environment: 'TEST'
            });

            const isReadyToPayRequest = {
                apiVersion: 2,
                apiVersionMinor: 0,
                allowedPaymentMethods: [{
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
                }]
            };

            const response = await paymentsClient.isReadyToPay(isReadyToPayRequest);
            setGooglePayReady(response.result === true);
            console.log('Google Pay readiness:', response.result);
        } catch (error) {
            console.error('Error checking Google Pay readiness:', error);
            setGooglePayReady(false);
        } finally {
            setLoading(false);
        }
    };

    const loadPayPalSDK = useCallback(() => {
        if (window.paypal) {
            setPaypalReady(true);
            setLoading(false);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://www.paypal.com/sdk/js?client-id=AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqX3PiV8e1GWU6liB2CUXlkA59kJXE7M6R&components=buttons&currency=USD';
        script.async = true;
        script.onload = () => {
            console.log('PayPal SDK loaded successfully');
            setPaypalReady(true);
            setLoading(false);
        };
        script.onerror = () => {
            console.warn('Failed to load PayPal SDK');
            setPaypalReady(false);
            setLoading(false);
        };
        document.head.appendChild(script);
    }, []);

    useEffect(() => {
        setLoading(true);
        loadGooglePaySDK();
        loadPayPalSDK();
    }, [loadGooglePaySDK, loadPayPalSDK]);

    return {
        googlePayReady,
        paypalReady,
        loading
    };
};

// Loyalty Animation Hook
const useLoyaltyAnimation = () => {
    const showLoyaltyPointsAnimation = useCallback((pointsAwarded) => {
        console.log('showLoyaltyPointsAnimation called with points:', pointsAwarded);
        
        if (!pointsAwarded || pointsAwarded <= 0) {
            console.log('Animation skipped - invalid points:', pointsAwarded);
            return;
        }
        
        const animationContainer = document.createElement('div');
        animationContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        
        const pointsDisplay = document.createElement('div');
        pointsDisplay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #FF6B35, #FFC857);
                color: white;
                padding: 24px 32px;
                border-radius: 16px;
                box-shadow: 0 20px 40px rgba(255, 107, 53, 0.3);
                text-align: center;
                transform: scale(0);
                animation: snapTrayBounceIn 0.7s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
            ">
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">⚡ Loyalty Points Earned!</div>
                <div style="font-size: 42px; font-weight: bold; margin: 8px 0;">+${pointsAwarded}</div>
                <div style="font-size: 14px; margin-top: 12px; opacity: 0.9;">Wallet deposit bonus!</div>
            </div>
        `;
        
        if (!document.getElementById('snapTrayLoyaltyStyles')) {
            const style = document.createElement('style');
            style.id = 'snapTrayLoyaltyStyles';
            style.textContent = `
                @keyframes snapTrayBounceIn {
                    0% { transform: scale(0) rotate(-180deg); opacity: 0; }
                    50% { transform: scale(1.15) rotate(-10deg); opacity: 1; }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        animationContainer.appendChild(pointsDisplay);
        document.body.appendChild(animationContainer);
        
        setTimeout(() => {
            if (animationContainer.parentNode) {
                animationContainer.parentNode.removeChild(animationContainer);
            }
        }, 3500);
    }, []);

    return { showLoyaltyPointsAnimation };
};

// Wallet Payment Service
const WalletPaymentService = {
    calculateLoyaltyPoints(amount, currency) {
        const usdAmount = currency === 'USD' ? amount : amount * 0.0027;
        let pointsEarned = Math.floor(usdAmount * 6.5);
        if (amount >= 100 && pointsEarned === 0) pointsEarned = 3;
        return pointsEarned;
    },

    async processGooglePayDeposit(amount, currency, setWalletAmount, walletAmount) {
        try {
            if (!window.google || !window.google.payments) {
                throw new Error('Google Pay is not available on this device/browser');
            }

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

            const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
            
            const saveResponse = await fetch('/dashboard/student/wallet/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: amount,
                    currency: currency,
                    paymentMethod: 'GooglePay',
                    transactionId: paymentData.paymentMethodData?.tokenizationData?.token || 'gpay_' + Date.now(),
                    timestamp: new Date().toISOString()
                })
            });

            if (!saveResponse.ok) {
                let errorText;
                try {
                    const errorData = await saveResponse.json();
                    errorText = errorData.error || errorData.message || 'Unknown error';
                } catch {
                    errorText = await saveResponse.text();
                }
                throw new Error(`Server responded with ${saveResponse.status}: ${errorText}`);
            }

            const saveResult = await saveResponse.json();
            
            if (saveResult.success || saveResult.newBalance !== undefined) {
                if (typeof setWalletAmount === 'function') {
                    setWalletAmount(saveResult.newBalance || walletAmount);
                }
                return {
                    success: true,
                    newBalance: saveResult.newBalance || walletAmount,
                    pointsEarned: this.calculateLoyaltyPoints(amount, currency)
                };
            } else {
                throw new Error(saveResult.error || saveResult.message || 'Unknown error');
            }
        } catch (error) {
            if (error.statusCode === 'CANCELED') {
                return { cancelled: true };
            }
            throw error;
        }
    },

    async processPayPalDeposit(amount, currency, setWalletAmount, walletAmount) {
        return new Promise((resolve, reject) => {
            try {
                if (!window.paypal) {
                    reject(new Error('PayPal is not ready yet. Please wait a moment and try again.'));
                    return;
                }

                // Store deposit data
                window.walletDepositData = { amount, currency };

                // Create PayPal container
                let paypalContainer = document.getElementById('paypal-button-container-wallet');
                if (!paypalContainer) {
                    paypalContainer = document.createElement('div');
                    paypalContainer.id = 'paypal-button-container-wallet';
                    document.body.appendChild(paypalContainer);
                }

                paypalContainer.innerHTML = '';
                paypalContainer.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 9999;
                    background: white;
                    padding: 20px;
                    border: 2px solid #ccc;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    max-width: 400px;
                    display: block;
                `;

                const wrapper = document.createElement('div');
                const title = document.createElement('h3');
                title.textContent = 'PayPal Payment';
                title.style.cssText = 'margin: 0 0 15px 0; color: #333;';

                const description = document.createElement('p');
                description.textContent = `Adding ${amount} ${currency} to wallet`;
                description.style.cssText = 'margin: 0 0 15px 0; color: #666;';

                const buttonsWrapper = document.createElement('div');
                buttonsWrapper.id = 'paypal-buttons-wrapper-wallet';

                // Close button
                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '×';
                closeBtn.style.cssText = `
                    position: absolute;
                    top: 10px;
                    right: 15px;
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                `;
                closeBtn.onclick = () => {
                    paypalContainer.style.display = 'none';
                    reject(new Error('Payment cancelled'));
                };

                wrapper.appendChild(title);
                wrapper.appendChild(description);
                wrapper.appendChild(buttonsWrapper);
                paypalContainer.appendChild(wrapper);
                paypalContainer.appendChild(closeBtn);

                // Render PayPal buttons
                const paypalButtons = window.paypal.Buttons({
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
                                    transactionId: details.id,
                                    timestamp: new Date().toISOString()
                                })
                            });

                            if (!saveResponse.ok) {
                                let errorText;
                                try {
                                    const errorData = await saveResponse.json();
                                    errorText = errorData.error || errorData.message || 'Unknown error';
                                } catch {
                                    errorText = await saveResponse.text();
                                }
                                throw new Error(`Server responded with ${saveResponse.status}: ${errorText}`);
                            }

                            const saveResult = await saveResponse.json();

                            if (saveResult.success || saveResult.newBalance !== undefined) {
                                // Update wallet balance
                                if (typeof setWalletAmount === 'function') {
                                    setWalletAmount(saveResult.newBalance || walletAmount);
                                }
                                
                                paypalContainer.style.display = 'none';
                                resolve({
                                    success: true,
                                    newBalance: saveResult.newBalance || walletAmount,
                                    pointsEarned: WalletPaymentService.calculateLoyaltyPoints(depositData.amount, depositData.currency)
                                });
                            } else {
                                throw new Error(saveResult.error || saveResult.message || 'Unknown error');
                            }
                        } catch (error) {
                            console.error('PayPal save error:', error);
                            paypalContainer.style.display = 'none';
                            reject(error);
                        }
                    },
                    onError: function(err) {
                        console.error('PayPal error:', err);
                        paypalContainer.style.display = 'none';
                        reject(new Error('Payment failed'));
                    },
                    onCancel: function(data) {
                        console.log('PayPal payment cancelled');
                        paypalContainer.style.display = 'none';
                        reject(new Error('Payment cancelled'));
                    }
                });

                paypalButtons.render('#paypal-buttons-wrapper-wallet');
            } catch (error) {
                console.error('PayPal initialization error:', error);
                reject(error);
            }
        });
    },

    async checkSession() {
        try {
            const sessionCheck = await fetch('/dashboard/student/wallet/balance');
            if (!sessionCheck.ok && sessionCheck.status === 401) {
                alert('Your session has expired. Please login again.');
                window.location.href = '/';
                return false;
            }
            return true;
        } catch (error) {
            console.error('Session check error:', error);
            return true;
        }
    }
};

const WalletSection = ({ walletAmount, refreshWalletBalance, setWalletAmount }) => {
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [processing, setProcessing] = useState(false);
    
    // Use custom hooks
    const { uploadForm, errors, updateForm, resetForm, isFormValid } = useWalletForm();
    const { googlePayReady, paypalReady, loading } = usePaymentSDKs();
    const { showLoyaltyPointsAnimation } = useLoyaltyAnimation();

    // Periodic wallet balance refresh
    useEffect(() => {
        const interval = setInterval(() => {
            refreshWalletBalance();
        }, 30000);
        return () => clearInterval(interval);
    }, [refreshWalletBalance]);

    const handleWalletUpload = async () => {
        if (!isFormValid()) {
            alert('Please enter a valid amount');
            return;
        }

        const sessionValid = await WalletPaymentService.checkSession();
        if (!sessionValid) return;

        setShowPaymentModal(true);
    };

    const handlePaymentMethodSelect = async (method) => {
        setShowPaymentModal(false);
        setProcessing(true);

        try {
            const amount = parseFloat(uploadForm.amount);
            const currency = uploadForm.currency;
            let result;

            if (method === 'googlepay') {
                result = await WalletPaymentService.processGooglePayDeposit(
                    amount, currency, setWalletAmount, walletAmount
                );
            } else if (method === 'paypal') {
                result = await WalletPaymentService.processPayPalDeposit(
                    amount, currency, setWalletAmount, walletAmount
                );
            }

            if (result && result.success) {
                resetForm();
                alert(`Successfully added ${amount} ${currency} to your wallet!`);
                
                if (result.pointsEarned > 0) {
                    setTimeout(() => {
                        showLoyaltyPointsAnimation(result.pointsEarned);
                    }, 1000);
                }
            } else if (result && result.cancelled) {
                console.log('Payment was cancelled by user');
            }
        } catch (error) {
            console.error('Payment error:', error);
            if (!error.message.includes('cancelled')) {
                alert(`Payment failed: ${error.message}. Please try again.`);
            }
        } finally {
            setProcessing(false);
        }
    };

    return (
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
                                onChange={(e) => updateForm(e.target.name, e.target.value)}
                                min="0"
                                step="0.01"
                                placeholder="Enter amount"
                                disabled={processing || loading}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                            />
                            {errors.amount && (
                                <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                            <select
                                name="currency"
                                value={uploadForm.currency}
                                onChange={(e) => updateForm(e.target.name, e.target.value)}
                                disabled={processing || loading}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                            >
                                <option value="HUF">HUF</option>
                                <option value="EUR">EUR</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                        <button
                            onClick={handleWalletUpload}
                            disabled={processing || loading || !uploadForm.amount || parseFloat(uploadForm.amount) <= 0}
                            className={`w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors ${
                                processing || loading || !uploadForm.amount || parseFloat(uploadForm.amount) <= 0
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-primary text-white hover:bg-secondary'
                            }`}
                        >
                            {processing ? 'Processing...' : loading ? 'Loading...' : 'Choose Payment Method'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment Method Selection Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end justify-center px-3 pb-3 pt-6 sm:items-center sm:p-4" onClick={() => setShowPaymentModal(false)}>
                    <div className="bg-white p-5 sm:p-6 rounded-3xl sm:rounded-lg shadow-xl max-w-md w-full mx-0 sm:mx-4 overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 24px)', paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }} onClick={(event) => event.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Payment Method</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Add {uploadForm.amount} {uploadForm.currency} to your wallet using:
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => handlePaymentMethodSelect('googlepay')}
                                disabled={!googlePayReady}
                                className={`w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                                    googlePayReady ? 'hover:bg-gray-50 cursor-pointer' : 'bg-gray-100 cursor-not-allowed opacity-50'
                                }`}
                            >
                                <span>Google Pay {!googlePayReady && '(Not Available)'}</span>
                            </button>
                            <button
                                onClick={() => handlePaymentMethodSelect('paypal')}
                                disabled={!paypalReady}
                                className={`w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                                    paypalReady ? 'hover:bg-gray-50 cursor-pointer' : 'bg-gray-100 cursor-not-allowed opacity-50'
                                }`}
                            >
                                <span>PayPal {!paypalReady && '(Loading...)'}</span>
                            </button>
                        </div>
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="w-full sm:w-auto px-4 py-3 text-gray-600 border border-gray-200 rounded-xl hover:text-gray-800 hover:bg-gray-50 focus:outline-none"
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

// Export for Babel transpilation
window.WalletSection = WalletSection;