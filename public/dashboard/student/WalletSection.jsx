const { useState, useEffect } = React;

const WalletSection = ({ walletAmount, refreshWalletBalance, setWalletAmount }) => {
    const [uploadForm, setUploadForm] = useState({
        amount: '',
        currency: 'HUF'
    });
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    useEffect(() => {
        // Periodic wallet balance refresh
        const interval = setInterval(() => {
            refreshWalletBalance();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

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
                                    // Note: transactions state is managed in parent, so we don't update it here
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

                                        if (saveResponse.ok) {
                                            const saveResult = await saveResponse.json();
                                            console.log('PayPal transaction saved successfully:', saveResult);

                                            // Update wallet balance
                                            setWalletAmount(saveResult.newBalance || walletAmount);
                                            setUploadForm({ amount: '', currency: 'HUF' });

                                            alert(`Successfully added ${depositData.amount} ${depositData.currency} to your wallet!`);

                                            // Close PayPal modal
                                            const paypalContainer = document.getElementById('paypal-button-container');
                                            if (paypalContainer) {
                                                paypalContainer.style.display = 'none';
                                            }
                                        } else {
                                            const errorData = await saveResponse.json().catch(() => ({ error: 'Unknown error' }));
                                            console.error('Failed to save PayPal transaction:', errorData);
                                            alert(`Payment successful but failed to update wallet: ${errorData.error}. Please contact support.`);
                                        }
                                    } catch (error) {
                                        console.error('PayPal save error:', error);
                                        alert('Payment successful but failed to update wallet. Please contact support.');
                                    }
                                },
                                onError: function(err) {
                                    console.error('PayPal error:', err);
                                    alert('Payment failed. Please try again.');
                                },
                                onCancel: function(data) {
                                    console.log('PayPal payment cancelled');
                                    const paypalContainer = document.getElementById('paypal-button-container');
                                    if (paypalContainer) {
                                        paypalContainer.style.display = 'none';
                                    }
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