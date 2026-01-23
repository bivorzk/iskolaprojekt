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

const handleGooglePayPayment = async (cart, currency, clearCart) => {
    try {
        const amount = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
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
                        clearCart();

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

const handlePayPalPayment = async (cart, currency, clearCart) => {
    console.log('PayPal button clicked');
    try {
        const amount = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
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
                        clearCart();

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

const handleBalancePayment = async (cart, currency, clearCart) => {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    fetch('/api/pay-with-balance', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            items: cart,
            total: total,
            currency: currency
        })
    }).then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Payment successful! Your order has been placed.');
            clearCart();
        } else {
            alert('Payment failed: ' + data.message);
        }
    }).catch(error => {
        console.error('Error processing balance payment:', error);
        alert('Payment failed due to a network error. Please try again.');
    });
};