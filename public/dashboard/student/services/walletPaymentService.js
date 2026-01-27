const WalletPaymentService = {
    // Calculate loyalty points for wallet deposits
    calculateLoyaltyPoints(amount, currency) {
        const usdAmount = currency === 'USD' ? amount : amount * 0.0027;
        // Backend uses 4-9 random points per dollar, we'll estimate average of 6.5
        let pointsEarned = Math.floor(usdAmount * 6.5);
        // Minimum 3 points for any deposit to show animation
        if (amount >= 100 && pointsEarned === 0) pointsEarned = 3;
        return pointsEarned;
    },

    // Process Google Pay wallet deposit
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
            const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
            console.log('Google Pay payment successful:', paymentData);

            // Save transaction to database
            const saveResponse = await fetch('/dashboard/student/wallet/add', {
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
            console.log('Transaction saved successfully:', saveResult);

            if (saveResult.success || saveResult.newBalance !== undefined) {
                // Update wallet balance
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
            console.error('Google Pay payment error:', error);
            if (error.statusCode === 'CANCELED') {
                return { cancelled: true };
            }
            throw error;
        }
    },

    // Process PayPal wallet deposit
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

    // Session check helper
    async checkSession() {
        try {
            const sessionCheck = await fetch('/dashboard/student/wallet/balance');
            if (!sessionCheck.ok) {
                console.error('Session check failed:', sessionCheck.status);
                if (sessionCheck.status === 401) {
                    alert('Your session has expired. Please login again.');
                    window.location.href = '/';
                    return false;
                }
            }
            return true;
        } catch (error) {
            console.error('Session check error:', error);
            return true; // Continue anyway
        }
    }
};

window.WalletPaymentService = WalletPaymentService;