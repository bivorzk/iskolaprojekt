let paymentsClient;


 price =  '10.0';
currency = 'HUF';

// Initialize Google Pay after the library loads
function initializeGooglePay() {
    // Initialize PaymentsClient
    paymentsClient = new google.payments.api.PaymentsClient({
        environment: 'TEST', // Use 'PRODUCTION' only after approval
        merchantInfo: {
            merchantId: 'BCR2DN7T6HN4NPYC', // Your test Merchant ID
            merchantName: 'SnapTray'
        }
    });

    // Start the payment flow
    startPaymentFlow();
}

function startPaymentFlow() {
    // Define the payment request
    const isReadyToPayRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
            type: 'CARD',
            parameters: {
                allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                allowedCardNetworks: ['VISA', 'MASTERCARD']
            },
            tokenizationSpecification: {
                type: 'PAYMENT_GATEWAY',
                parameters: {
                    gateway: 'example', // Replace with your gateway, e.g., 'stripe'
                    gatewayMerchantId: 'exampleGatewayMerchantId' // Replace with your gateway's test ID
                }
            }
        }]
    };

    // Check if Google Pay is available
    paymentsClient.isReadyToPay(isReadyToPayRequest)
        .then(response => {
            if (response.result) {
                createGooglePayButton(isReadyToPayRequest);
            } else {
                console.log('Google Pay is not available for this user/device.');
            }
        })
        .catch(err => console.error('Error checking readiness:', err));
}

// Create and append Google Pay button
function createGooglePayButton(isReadyToPayRequest) {
    const button = paymentsClient.createButton({
        onClick: () => onGooglePayButtonClick(isReadyToPayRequest),
        buttonType: 'short', // Optional: 'long' or 'short'
        buttonColor: 'black' // Optional: 'black' or 'white'
    });
    document.getElementById('gpay-container').appendChild(button);
}

// Handle button click and payment flow
function onGooglePayButtonClick(isReadyToPayRequest) {
    const paymentDataRequest = {
        ...isReadyToPayRequest, // Reuse the base request
        transactionInfo: {
            totalPriceStatus: 'FINAL',
            totalPrice: price,
            currencyCode: 'HUF',
            countryCode: 'HU'
        },
        merchantInfo: {
            merchantId: 'BCR2DN7T6HN4NPYC',
            merchantName: 'SnapTray'
        }
    };

    paymentsClient.loadPaymentData(paymentDataRequest)
        .then(paymentData => {
            // Handle the payment data
            console.log('Full paymentData object:', JSON.stringify(paymentData, null, 2));

            // Send payment data to backend
                fetch('/api/payments/googlepay', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        paymentMethodData: paymentData.paymentMethodData,
                        amount: paymentDataRequest.transactionInfo.totalPrice,
                        currency: paymentDataRequest.transactionInfo.currencyCode,
                        merchantInfo: paymentDataRequest.merchantInfo
                    })
                })
            .then(response => response.json())
            .then(data => {
                console.log('Payment saved to database:', data);
            })
            .catch(err => {
                console.error('Error saving payment to database:', err);
            });
        })
        .catch(err => console.error('Payment error:', err));
}