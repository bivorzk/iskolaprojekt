function loadPayPalSDK(callback) {
    if (window.paypal) {
        callback();
        return;
    }
    const script = document.createElement('script');
    script.src = "https://www.paypal.com/sdk/js?client-id=AaKKbqc8uITr4-b5piK0r_vdUl2cWSfnJ2tZyq9YzrahVsXWUbZH1z7mGKJ9Yew7YcWSB7vWNhHfV6HC&buyer-country=US&currency=USD&components=buttons&enable-funding=venmo,paylater,card";
    script.onload = callback;
    script.onerror = function() {
        const container = document.getElementById('paypal-button-container');
        if (container) {
            container.innerHTML = '<p>PayPal is currently unavailable. Please try again later or use an alternative payment method.</p>';
        }
    };
    document.head.appendChild(script);
}

function renderPayPalButtons() {
    if (!window.paypal) return;
    
    // Store USD amount for use in both createOrder and onApprove
    let cachedUsdAmount = 0;
    
    const paypalButtons = window.paypal.Buttons({
        style: {
            shape: "rect",
            layout: "vertical",
            color: "gold",
            label: "paypal",
        },
        async createOrder() {
            try {
                // Get cart and currency from UI
                let cart = [];
                const cartList = document.getElementById('cart-list');
                if (cartList) {
                    cart = Array.from(cartList.children).map((li, index) => {
                        // Try to parse name and price if available, fallback to name only
                        const match = li.textContent.match(/^(.*) - HUF ([\d.]+)/);
                        if (match) {
                            return { 
                                name: match[1], 
                                price: parseFloat(match[2]), 
                                quantity: 1,
                                sku: `item${index + 1}`
                            };
                        } else {
                            return { 
                                name: li.textContent, 
                                price: 0, 
                                quantity: 1,
                                sku: `item${index + 1}`
                            };
                        }
                    });
                }
                const currency = document.getElementById('currency')?.value || 'HUF';
                // Convert HUF amount to USD for PayPal
                const hufAmount = parseFloat(document.getElementById('price')?.value || '0.00');
                let usdAmount = hufAmount;
                if (currency === 'HUF' && hufAmount > 0) {
                    try {
                        const conversionRes = await fetch(`https://api.frankfurter.app/latest?amount=${hufAmount}&from=HUF&to=USD`);
                        const conversionData = await conversionRes.json();
                        usdAmount = conversionData.rates.USD;
                    } catch (err) {
                        console.warn('Currency conversion failed, using 1 HUF = 0.003 USD');
                        usdAmount = hufAmount * 0.003; // Fallback conversion rate
                    }
                }
                // Store USD amount for (onApprove use)
                cachedUsdAmount = usdAmount;
                
                // Convert cart prices to USD
                cart = cart.map(item => ({
                    ...item,
                    price: currency === 'HUF' ? item.price * (usdAmount / hufAmount) : item.price
                }));

                // Create PayPal order (always use USD for PayPal)
                const response = await fetch('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cart, currency: 'USD', amount: usdAmount.toFixed(2) })
                });
                const orderData = await response.json();
                
                if (orderData.id) {
                    return orderData.id;
                }
                
                // Handle different types of errors with appropriate user messages
                let userMessage = 'Unknown error occurred';
                let technicalMessage = 'No additional details';
                
                if (response.status === 503) {
                    userMessage = orderData.message || 'PayPal service is temporarily unavailable. Please try again in a few minutes.';
                    technicalMessage = `Service unavailable (Status: ${response.status})`;
                } else if (response.status === 502) {
                    userMessage = orderData.message || 'There was an issue communicating with PayPal. Please try again.';
                    technicalMessage = `Gateway error (Status: ${response.status})`;
                } else if (orderData.error || orderData.message) {
                    userMessage = orderData.message || orderData.error;
                    technicalMessage = `${orderData.error || ''} (${orderData.details || ''})`;
                } else if (orderData?.details?.[0]) {
                    const errorDetail = orderData.details[0];
                    userMessage = errorDetail.description || errorDetail.issue;
                    technicalMessage = `${errorDetail.issue} (${orderData.debug_id})`;
                } else {
                    userMessage = 'Payment system error occurred';
                    technicalMessage = JSON.stringify(orderData);
                }
                
                console.error('PayPal createOrder backend error:', { userMessage, technicalMessage, status: response.status });
                resultMessage(`Could not initiate PayPal Checkout...<br><br><strong>${userMessage}</strong><br><small>Technical details: ${technicalMessage}</small>`);
                throw new Error(userMessage);
            } catch (error) {
                console.error('PayPal createOrder error:', error);
                resultMessage(`Could not initiate PayPal Checkout...<br><br>${error}`);
                throw error; // Re-throw to prevent PayPal from continuing
            }
        },
        async onApprove(data, actions) {
            try {
                // Capture order on backend
                const captureRes = await fetch(`/api/orders/${data.orderID}/capture`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const captureData = await captureRes.json();
                
                if (!captureData.id) {
                    let errorMessage = 'Order capture failed';
                    if (captureRes.status === 503) {
                        errorMessage = captureData.message || 'PayPal service is temporarily unavailable. Please try again in a few minutes.';
                    } else if (captureRes.status === 502) {
                        errorMessage = captureData.message || 'There was an issue communicating with PayPal. Please try again.';
                    } else if (captureData.message) {
                        errorMessage = captureData.message;
                    }
                    throw new Error(errorMessage);
                }

                // Save payment in DB
                const originalAmount = document.getElementById('price')?.value || '0.00';
                const originalCurrency = document.getElementById('currency')?.value || 'HUF';
                const saveRes = await fetch('/api/payments/paypal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderID: data.orderID,
                        payerID: data.payerID,
                        amount: originalAmount,
                        currency: originalCurrency,
                        paypalAmountUSD: cachedUsdAmount.toFixed(2)
                    })
                });
                const result = await saveRes.json();
                if (result.success) {
                    resultMessage(`Payment successful! Payment ID: ${result.payment._id}`);
                    console.log('Payment saved:', result.payment);
                } else {
                    throw new Error(result.error || 'Payment failed to save.');
                }
            } catch (error) {
                console.error(error);
                resultMessage(
                    `Sorry, your transaction could not be processed...<br><br>${error}`
                );
            }
        },
        onError(err) {
            console.error('PayPal Checkout onError', err);
            resultMessage(`An error occurred during the transaction. Please try again.`);
        },
        onCancel(data) {
            console.log('PayPal Checkout onCancel', data);
            resultMessage('Transaction cancelled by the user.');
        }
    });
    paypalButtons.render("#paypal-button-container");
}

// Ensure result message container exists
if (!document.getElementById('result-message')) {
    const msgDiv = document.createElement('div');
    msgDiv.id = 'result-message';
    document.body.appendChild(msgDiv);
}

// Load PayPal SDK and render buttons
loadPayPalSDK(renderPayPalButtons);


// Example function to show a result to the user. Your site's UI library can be used instead.
function resultMessage(message) {
    let container = document.getElementById("result-message");
    if (!container) {
        container = document.createElement('div');
        container.id = 'result-message';
        document.body.appendChild(container);
    }
    container.innerHTML = message;
}