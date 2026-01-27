const { useState, useEffect } = React;

const WalletSection = ({ walletAmount, refreshWalletBalance, setWalletAmount }) => {
    const [uploadForm, setUploadForm] = useState({
        amount: '',
        currency: 'HUF'
    });
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [googlePayReady, setGooglePayReady] = useState(false);
    const [paypalReady, setPaypalReady] = useState(false);

    useEffect(() => {
        // Periodic wallet balance refresh
        const interval = setInterval(() => {
            refreshWalletBalance();
        }, 30000);

        // Load payment SDKs with proper initialization
        initializePaymentSystems();

        return () => clearInterval(interval);
    }, []);

    const initializePaymentSystems = () => {
        // Initialize both Google Pay and PayPal
        loadGooglePaySDK();
        loadPayPalSDK();
    };

    const loadGooglePaySDK = () => {
        // Check if Google Pay is already loaded
        if (window.google && window.google.payments) {
            checkGooglePayReadiness();
            return;
        }

        // Load Google Pay SDK
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
        };
        document.head.appendChild(script);
    };

    const checkGooglePayReadiness = async () => {
        if (!window.google || !window.google.payments) {
            setGooglePayReady(false);
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
        }
    };

    const loadPayPalSDK = () => {
        // Check if PayPal is already loaded
        if (window.paypal) {
            setPaypalReady(true);
            return;
        }

        // Load PayPal SDK
        const script = document.createElement('script');
        script.src = 'https://www.paypal.com/sdk/js?client-id=AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqX3PiV8e1GWU6liB2CUXlkA59kJXE7M6R&components=buttons&currency=USD';
        script.async = true;
        script.onload = () => {
            console.log('PayPal SDK loaded successfully');
            setPaypalReady(true);
        };
        script.onerror = () => {
            console.warn('Failed to load PayPal SDK');
            setPaypalReady(false);
        };
        document.head.appendChild(script);
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

    const handleWalletUpload = async () => {
        if (!uploadForm.amount || uploadForm.amount <= 0 || (uploadForm.currency === 'HUF' && uploadForm.amount < 300)) {
            alert('Please enter a valid amount');
            return;
        }

        // Quick session check before proceeding
        try {
            const sessionCheck = await fetch('/dashboard/student/wallet/balance');
            if (!sessionCheck.ok) {
                console.error('Session check failed:', sessionCheck.status);
                if (sessionCheck.status === 401) {
                    alert('Your session has expired. Please login again.');
                    window.location.href = '/';
                    return;
                }
            }
        } catch (error) {
            console.error('Session check error:', error);
        }

        // Show payment method selection modal
        setShowPaymentModal(true);
    };

    const handlePaymentMethodSelect = (method) => {
        console.log('Payment method selected:', method);
        console.log('Current form data:', uploadForm);
        setShowPaymentModal(false);

        // Update hidden fields for payment scripts
        syncPaymentFields(uploadForm.amount, uploadForm.currency);

        if (method === 'googlepay') {
            handleGooglePayPayment();
        } else if (method === 'paypal') {
            handlePayPalPayment();
        }
    };

    const showLoyaltyPointsAnimation = (pointsAwarded) => {
        console.log('showLoyaltyPointsAnimation called with points:', pointsAwarded);
        
        if (!pointsAwarded || pointsAwarded <= 0) {
            console.log('Animation skipped - invalid points:', pointsAwarded);
            return;
        }
        
        // Create the animation container
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
        
        // Create the points display with site theme
        const pointsDisplay = document.createElement('div');
        pointsDisplay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #FF6B35, #FFC857);
                color: white;
                padding: 24px 32px;
                border-radius: 16px;
                box-shadow: 0 20px 40px rgba(255, 107, 53, 0.3), 0 8px 16px rgba(255, 107, 53, 0.2);
                text-align: center;
                transform: scale(0);
                animation: snapTrayBounceIn 0.7s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
                border: 2px solid rgba(255, 229, 220, 0.3);
                backdrop-filter: blur(10px);
            ">
                <div style="
                    font-size: 18px; 
                    font-weight: 600; 
                    margin-bottom: 12px;
                    color: #FFE5DC;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                ">⚡ Loyalty Points Earned!</div>
                <div style="
                    font-size: 42px; 
                    font-weight: bold; 
                    color: white;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    margin: 8px 0;
                ">+${pointsAwarded}</div>
                <div style="
                    font-size: 14px; 
                    margin-top: 12px; 
                    opacity: 0.9;
                    color: #FFE5DC;
                    font-weight: 500;
                ">Wallet deposit bonus!</div>
            </div>
        `;
        
        // Add SnapTray themed keyframes
        if (!document.getElementById('snapTrayLoyaltyStyles')) {
            const style = document.createElement('style');
            style.id = 'snapTrayLoyaltyStyles';
            style.textContent = `
                @keyframes snapTrayBounceIn {
                    0% {
                        transform: scale(0) rotate(-180deg);
                        opacity: 0;
                    }
                    50% {
                        transform: scale(1.15) rotate(-10deg);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(1) rotate(0deg);
                        opacity: 1;
                    }
                }
                
                @keyframes snapTrayFadeOut {
                    0% {
                        transform: scale(1) translate(-50%, -50%);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(0.9) translate(-50%, -60%);
                        opacity: 0;
                    }
                }
                
                @keyframes snapTraySparkle {
                    0% {
                        transform: translateY(0) scale(0) rotate(0deg);
                        opacity: 1;
                    }
                    25% {
                        transform: translateY(-20px) scale(1) rotate(90deg);
                        opacity: 1;
                    }
                    50% {
                        transform: translateY(-60px) scale(1.2) rotate(180deg);
                        opacity: 0.8;
                    }
                    100% {
                        transform: translateY(-120px) scale(0) rotate(360deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        animationContainer.appendChild(pointsDisplay);
        document.body.appendChild(animationContainer);
        
        // Add SnapTray themed sparkle effects
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                const sparkleTypes = ['⚡', '✨', '💎', '🔥'];
                sparkle.innerHTML = sparkleTypes[Math.floor(Math.random() * sparkleTypes.length)];
                sparkle.style.cssText = `
                    position: absolute;
                    font-size: ${Math.random() * 16 + 20}px;
                    left: ${Math.random() * 400 - 200}px;
                    top: ${Math.random() * 200 - 100}px;
                    pointer-events: none;
                    animation: snapTraySparkle ${Math.random() * 1.5 + 1.2}s ease-out forwards;
                    z-index: 10001;
                    filter: drop-shadow(0 0 4px rgba(255, 107, 53, 0.6));
                `;
                
                animationContainer.appendChild(sparkle);
                
                setTimeout(() => {
                    if (sparkle.parentNode) {
                        sparkle.parentNode.removeChild(sparkle);
                    }
                }, 2500);
            }, i * 80);
        }
        
        // Remove animation after delay with SnapTray style fadeout
        setTimeout(() => {
            animationContainer.style.animation = 'snapTrayFadeOut 0.6s ease-in forwards';
            setTimeout(() => {
                if (animationContainer.parentNode) {
                    animationContainer.parentNode.removeChild(animationContainer);
                }
            }, 600);
        }, 3500);
    };

    const handleGooglePayPayment = async () => {
        try {
            const amount = parseFloat(uploadForm.amount);
            const currency = uploadForm.currency;

            if (!amount || amount <= 0) {
                alert('Please enter a valid amount');
                return;
            }

            // Check if Google Pay is ready
            if (!googlePayReady || !window.google || !window.google.payments) {
                alert('Google Pay is not available on this device/browser. Please use PayPal instead.');
                return;
            }

            // For wallet deposits, we'll create a simpler Google Pay integration
            // that doesn't rely on the complex order system
            try {
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
                        // Check if we need to use the order endpoint for wallet transactions
                        const isWalletEndpointAvailable = true; // We'll keep using wallet endpoint
                        const endpoint = '/dashboard/student/wallet/add';
                        
                        console.log('Attempting to save Google Pay transaction to backend...');
                        const saveResponse = await fetch(endpoint, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                amount: amount,
                                currency: currency,
                                paymentMethod: 'GooglePay',
                                transactionId: paymentData.paymentMethodData?.tokenizationData?.token || 'gpay_' + Date.now(),
                                timestamp: new Date().toISOString()
                            })
                        });

                        console.log('Save response status:', saveResponse.status);
                        
                        if (!saveResponse.ok) {
                            let errorText;
                            try {
                                const errorData = await saveResponse.json();
                                errorText = errorData.error || errorData.message || 'Unknown error';
                            } catch {
                                errorText = await saveResponse.text();
                            }
                            console.error('Backend error response:', {
                                status: saveResponse.status,
                                statusText: saveResponse.statusText,
                                error: errorText
                            });
                            throw new Error(`Server responded with ${saveResponse.status}: ${errorText}`);
                        }

                        const saveResult = await saveResponse.json();
                        console.log('Transaction saved successfully:', saveResult);

                        // Check if the response indicates success even with warnings
                        if (saveResult.success || saveResult.newBalance !== undefined) {
                            // Update wallet balance
                            if (typeof setWalletAmount === 'function') {
                                setWalletAmount(saveResult.newBalance || walletAmount);
                            } else {
                                console.error('setWalletAmount is not a function:', typeof setWalletAmount);
                            }
                            setUploadForm({ amount: '', currency: 'HUF' });

                            alert(`Successfully added ${amount} ${currency} to your wallet!`);
                            
                            // Calculate and show loyalty points animation (4-9 random points per USD, like orders)
                            const usdAmount = currency === 'USD' ? amount : amount * 0.0027;
                            // Estimate points (backend uses 4-9 random per dollar, we'll estimate average of 6.5)
                            let pointsEarned = Math.floor(usdAmount * 6.5);
                            // Minimum 3 points for any deposit to show animation
                            if (amount >= 100 && pointsEarned === 0) pointsEarned = 3;
                            
                            console.log('Google Pay - Currency:', currency, 'Amount:', amount, 'USD Amount:', usdAmount, 'Points:', pointsEarned);
                            
                            if (pointsEarned > 0) {
                                console.log('Triggering loyalty animation with points:', pointsEarned);
                                setTimeout(() => {
                                    showLoyaltyPointsAnimation(pointsEarned);
                                }, 1000);
                            } else {
                                console.log('No points earned - animation skipped');
                            }
                            
                            // Close modal
                            setShowPaymentModal(false);
                        } else {
                            throw new Error(saveResult.error || saveResult.message || 'Unknown error');
                        }
                    } catch (saveError) {
                        console.error('Error saving transaction:', saveError);
                        alert('Payment successful but failed to update wallet. Please contact support.');
                    }

                    // Close modal regardless of save success
                    setShowPaymentModal(false);
                } catch (paymentError) {
                    console.error('Google Pay payment error:', paymentError);
                    if (paymentError.statusCode === 'CANCELED') {
                        console.log('Payment was canceled by user');
                    } else {
                        alert('Payment failed. Please try again.');
                    }
                }
            } catch (initError) {
                console.error('Google Pay initialization error:', initError);
                alert('Google Pay failed to initialize. Please try PayPal instead.');
            }
        } catch (error) {
            console.error('Google Pay error:', error);
            alert('Google Pay failed. Please try PayPal instead.');
        }
    };

    const handlePayPalPayment = async () => {
        try {
            // Check if PayPal is ready
            if (!paypalReady || !window.paypal) {
                alert('PayPal is not ready yet. Please wait a moment and try again, or refresh the page.');
                return;
            }

            // Store amount and currency for use in PayPal callback
            window.walletDepositData = {
                amount: parseFloat(uploadForm.amount),
                currency: uploadForm.currency
            };

            // Create PayPal container if it doesn't exist
            let paypalContainer = document.getElementById('paypal-button-container');
            if (!paypalContainer) {
                paypalContainer = document.createElement('div');
                paypalContainer.id = 'paypal-button-container';
                paypalContainer.style.display = 'none';
                document.body.appendChild(paypalContainer);
            }

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

            // Render PayPal buttons
            try {
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
                            console.log('Attempting to save PayPal transaction to backend...');
                            const endpoint = '/dashboard/student/wallet/add';
                            const saveResponse = await fetch(endpoint, {
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

                            console.log('Save response status:', saveResponse.status);

                            if (!saveResponse.ok) {
                                let errorText;
                                try {
                                    const errorData = await saveResponse.json();
                                    errorText = errorData.error || errorData.message || 'Unknown error';
                                } catch {
                                    errorText = await saveResponse.text();
                                }
                                console.error('PayPal backend error response:', {
                                    status: saveResponse.status,
                                    statusText: saveResponse.statusText,
                                    error: errorText
                                });
                                throw new Error(`Server responded with ${saveResponse.status}: ${errorText}`);
                            }

                            const saveResult = await saveResponse.json();
                            console.log('PayPal transaction saved successfully:', saveResult);

                            // Check if the response indicates success even with warnings
                            if (saveResult.success || saveResult.newBalance !== undefined) {
                                // Update wallet balance
                                if (typeof setWalletAmount === 'function') {
                                    setWalletAmount(saveResult.newBalance || walletAmount);
                                } else {
                                    console.error('setWalletAmount is not a function:', typeof setWalletAmount);
                                }
                                setUploadForm({ amount: '', currency: 'HUF' });
                                alert(`Successfully added ${depositData.amount} ${depositData.currency} to your wallet!`);
                                
                                // Calculate and show loyalty points animation (4-9 random points per USD, like orders)
                                const usdAmount = depositData.currency === 'USD' ? depositData.amount : depositData.amount * 0.0027;
                                // Estimate points (backend uses 4-9 random per dollar, we'll estimate average of 6.5)
                                let pointsEarned = Math.floor(usdAmount * 6.5);
                                // Minimum 3 points for any deposit to show animation
                                if (depositData.amount >= 100 && pointsEarned === 0) pointsEarned = 3;
                                
                                console.log('PayPal - Currency:', depositData.currency, 'Amount:', depositData.amount, 'USD Amount:', usdAmount, 'Points:', pointsEarned);
                                
                                if (pointsEarned > 0) {
                                    console.log('Triggering loyalty animation with points:', pointsEarned);
                                    setTimeout(() => {
                                        showLoyaltyPointsAnimation(pointsEarned);
                                    }, 1000);
                                } else {
                                    console.log('No points earned - animation skipped');
                                }

                                // Close PayPal modal
                                paypalContainer.style.display = 'none';
                            } else {
                                throw new Error(saveResult.error || saveResult.message || 'Unknown error');
                            }
                        } catch (error) {
                            console.error('PayPal save error:', error);
                            alert(`Payment successful but failed to update wallet: ${error.message}. Please contact support.`);
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

                await paypalButtons.render('#paypal-buttons-wrapper');
            } catch (renderError) {
                console.error('PayPal render error:', renderError);
                alert('Failed to initialize PayPal. Please try again.');
            }
        } catch (error) {
            console.error('PayPal initialization error:', error);
            alert('PayPal failed to initialize. Please refresh the page and try again.');
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
                                onClick={() => handlePaymentMethodSelect('paypal')}
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
                                onClick={() => setShowPaymentModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 focus:outline-none"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* PayPal button container (hidden by default) */}
            <div id="paypal-button-container" style={{display: 'none'}}></div>
        </div>
    );
};

// Export for Babel transpilation
window.WalletSection = WalletSection;