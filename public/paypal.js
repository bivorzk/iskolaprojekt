const paypalButtons = window.paypal.Buttons({
   style: {
        shape: "rect",
        layout: "vertical",
        color: "gold",
        label: "paypal",
    },
   message: {
        amount: 100,
    },
   async createOrder() {
        try {
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                // use the "body" param to optionally pass additional order information
                // like product ids and quantities
                body: JSON.stringify({
                    cart: [
                        {
                            id: "YOUR_PRODUCT_ID",
                            quantity: "YOUR_PRODUCT_QUANTITY",
                        },
                    ],
                }),
            });

            const orderData = await response.json();

            if (orderData.id) {
                return orderData.id;
            }
            const errorDetail = orderData?.details?.[0];
            const errorMessage = errorDetail
                ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
                : JSON.stringify(orderData);

            throw new Error(errorMessage);
        } catch (error) {
            console.error(error);
            // resultMessage(`Could not initiate PayPal Checkout...<br><br>${error}`);
        }
    },
   async onApprove(data, actions) {
        try {
            // Send payment details to backend after approval
            // You may want to get amount/currency from your cart or UI
            const amount = 100; // Replace with dynamic value if needed
            const currency = "USD"; // Replace with dynamic value if needed

            const response = await fetch('/api/payments/paypal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderID: data.orderID,
                    payerID: data.payerID,
                    amount,
                    currency
                })
            });
            const result = await response.json();
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


// Example function to show a result to the user. Your site's UI library can be used instead.
function resultMessage(message) {
    const container = document.querySelector("#result-message");
    container.innerHTML = message;
}