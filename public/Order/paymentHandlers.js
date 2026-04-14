function getCsrfToken() {
    const c = document.cookie.split('; ').find(r => r.startsWith('XSRF-TOKEN='));
    return c ? decodeURIComponent(c.split('=')[1]) : '';
}

const showLoyaltyPointsAnimation = (pointsAwarded) => {
    if (!pointsAwarded || pointsAwarded <= 0) return;
    
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
            ">Keep ordering with SnapTray!</div>
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
    for (let i = 0; i < 20; i++) {
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

const fulfillVoucher = (voucherCode) => {
    fetch('/dashboard/student/loyalty/voucher/fulfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-xsrf-token': getCsrfToken() },
        body: JSON.stringify({ voucherCode })
    }).catch(err => console.error('Voucher fulfillment failed:', err));
};

const handleGooglePayPayment = async (cart, currency, clearCart, selectedDiscount, appliedVoucher, selectedChildId, isParent) => {
    if (isParent && !selectedChildId) {
        alert('Please select a child before placing the order.');
        return;
    }
    try {
        const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        const discountAmount = selectedDiscount ? subtotal * selectedDiscount.rate : 0;
        const voucherDeduction = appliedVoucher ? appliedVoucher.marketValue : 0;
        const amount = Math.max(0, subtotal - discountAmount - voucherDeduction);

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
                            'Content-Type': 'application/json',
                            'x-xsrf-token': getCsrfToken()
                        },
                        body: JSON.stringify({
                            items: cart,
                            subtotal: subtotal,
                            discount: selectedDiscount ? {
                                type: selectedDiscount.type,
                                rate: selectedDiscount.rate,
                                amount: discountAmount
                            } : null,
                            voucherCode: appliedVoucher ? appliedVoucher.voucherCode : null,
                            total: amount,
                            currency: currency,
                            paymentMethod: 'GooglePay',
                            transactionId: paymentData.paymentMethodData?.tokenizationData?.token || 'gpay_' + Date.now(),
                            selectedStudentId: selectedChildId
                        })
                    });

                    console.log('Save response status:', saveResponse.status);

                    if (saveResponse.ok) {
                        const saveResult = await saveResponse.json();
                        console.log('Order saved successfully:', saveResult);

                        // Fulfill voucher if one was applied
                        if (appliedVoucher) fulfillVoucher(appliedVoucher.voucherCode);

                        // Clear cart
                        clearCart();

                        // Show loyalty points animation if points were awarded
                        if (saveResult.loyaltyPointsAwarded && saveResult.loyaltyPointsAwarded > 0) {
                            setTimeout(() => {
                                showLoyaltyPointsAnimation(saveResult.loyaltyPointsAwarded);
                            }, 500);
                        }

                        // Show SnapTray themed success message
                        setTimeout(() => {
                            alert(`✅ Order placed successfully with SnapTray!\n\n📦 Order ID: ${saveResult.orderId || 'N/A'}\n⚡ Loyalty Points Earned: +${saveResult.loyaltyPointsAwarded || 0}`);
                        }, saveResult.loyaltyPointsAwarded > 0 ? 4000 : 1000);

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

const handlePayPalPayment = async (cart, currency, clearCart, selectedDiscount, appliedVoucher, selectedChildId, isParent) => {
    if (isParent && !selectedChildId) {
        alert('Please select a child before placing the order.');
        return;
    }

    console.log('PayPal button clicked');
    try {
        const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        const discountAmount = selectedDiscount ? subtotal * selectedDiscount.rate : 0;
        const voucherDeduction = appliedVoucher ? appliedVoucher.marketValue : 0;
        const amount = Math.max(0, subtotal - discountAmount - voucherDeduction);
        console.log('Cart total:', amount);
        if (!amount || amount <= 0) {
            alert('Your cart is empty');
            return;
        }

        // Store order data for use in PayPal callback
        window.orderData = {
            items: cart,
            subtotal: subtotal,
            discount: selectedDiscount ? {
                type: selectedDiscount.type,
                rate: selectedDiscount.rate,
                amount: discountAmount
            } : null,
            voucherCode: appliedVoucher ? appliedVoucher.voucherCode : null,
            total: amount,
            currency: currency,
            selectedStudentId: selectedChildId
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
                            'Content-Type': 'application/json',
                            'x-xsrf-token': getCsrfToken()
                        },
                        body: JSON.stringify({
                            items: orderData.items,
                            subtotal: orderData.subtotal,
                            discount: orderData.discount,
                            voucherCode: orderData.voucherCode || null,
                            total: orderData.total,
                            currency: orderData.currency,
                            paymentMethod: 'PayPal',
                            transactionId: details.id,
                            selectedStudentId: orderData.selectedStudentId
                        })
                    });

                    console.log('PayPal save response status:', saveResponse.status);

                    if (saveResponse.ok) {
                        const saveResult = await saveResponse.json();
                        console.log('PayPal order saved successfully:', saveResult);

                        // Fulfill voucher if one was applied
                        if (orderData.voucherCode) fulfillVoucher(orderData.voucherCode);

                        // Clear cart
                        clearCart();

                        // Emit order completion event for loyalty refresh
                        window.dispatchEvent(new CustomEvent('orderComplete', { detail: { orderId: saveResult.orderId, points: saveResult.loyaltyPointsAwarded } }));

                        // Show loyalty points animation if points were awarded
                        if (saveResult.loyaltyPointsAwarded && saveResult.loyaltyPointsAwarded > 0) {
                            setTimeout(() => {
                                showLoyaltyPointsAnimation(saveResult.loyaltyPointsAwarded);
                            }, 500);
                        }

                        // Show SnapTray themed success message
                        setTimeout(() => {
                            alert(`Order placed successfully with SnapTray!\n\n Order ID: ${saveResult.orderId || 'N/A'}\nLoyalty Points Earned: +${saveResult.loyaltyPointsAwarded || 0}`);
                        }, saveResult.loyaltyPointsAwarded > 0 ? 4000 : 1000);

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

const handleBalancePayment = async (cart, currency, clearCart, selectedDiscount, appliedVoucher, selectedChildId, isParent) => {
    if (isParent && !selectedChildId) {
        alert('Please select a child before placing the order.');
        return;
    }
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountAmount = selectedDiscount ? subtotal * selectedDiscount.rate : 0;
    const voucherDeduction = appliedVoucher ? appliedVoucher.marketValue : 0;
    const total = Math.max(0, subtotal - discountAmount - voucherDeduction);
    fetch('/api/pay-with-balance', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-xsrf-token': getCsrfToken()
        },
        body: JSON.stringify({
            items: cart,
            subtotal: subtotal,
            discount: selectedDiscount ? {
                type: selectedDiscount.type,
                rate: selectedDiscount.rate,
                amount: discountAmount
            } : null,
            voucherCode: appliedVoucher ? appliedVoucher.voucherCode : null,
            total: total,
            currency: currency,
            selectedStudentId: selectedChildId
        })
    }).then(response => response.json())
    .then(data => {
        if (data.success) {
            // Fulfill voucher if one was applied
            if (appliedVoucher) fulfillVoucher(appliedVoucher.voucherCode);

            // Emit order completion event for loyalty refresh
            window.dispatchEvent(new CustomEvent('orderComplete', { detail: { orderId: data.orderId, points: data.loyaltyPointsAwarded } }));
            
            // Show loyalty points animation if points were awarded
            if (data.loyaltyPointsAwarded && data.loyaltyPointsAwarded > 0) {
                setTimeout(() => {
                    showLoyaltyPointsAnimation(data.loyaltyPointsAwarded);
                }, 500);
            }
            
            // Show SnapTray themed success message
            setTimeout(() => {
                showSnapTrayNotification(
                    'success',
                    'Order Successfully Placed!',
                    `Paid from account balance${data.loyaltyPointsAwarded > 0 ? `\n Earned ${data.loyaltyPointsAwarded} loyalty points!` : ''}`
                );
            }, data.loyaltyPointsAwarded > 0 ? 4000 : 1000);
            
            clearCart();
        } else {
            alert('Payment failed: ' + data.message);
        }
    }).catch(error => {
        console.error('Error processing balance payment:', error);
        alert('Payment failed due to a network error. Please try again.');
    });
};