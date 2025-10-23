let paymentsClient;

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
            totalPrice: '10.00',
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
            // Handle the payment data (send to your backend)
            console.log('Payment data:', paymentData);
            // Example: Send paymentData.paymentMethodData.tokenizationData to your backend
        })
        .catch(err => console.error('Payment error:', err));
}