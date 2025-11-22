
let paymentsClient;

// Base configuration for Google Pay
const baseRequest = {
    apiVersion: 2,
    apiVersionMinor: 0
};

// Supported payment methods
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

function getGooglePayAmountAndCurrency() {
    // Try to get the converted amount and selected currency from the UI
    let price = '10.00'; // Default test amount
    let currency = 'USD'; // Default to USD for testing
    
    const convertedAmountElem = document.getElementById('convertedAmount');
    const currencyElem = document.getElementById('currency');
    
    if (convertedAmountElem && convertedAmountElem.value && parseFloat(convertedAmountElem.value) > 0) {
        price = parseFloat(convertedAmountElem.value).toFixed(2);
    }
    
    if (currencyElem && currencyElem.value === 'USD') {
        currency = currencyElem.value;
    } else {
        // Convert to USD for Google Pay compatibility
        currency = 'USD';
        // For testing, use a simple conversion rate
        if (convertedAmountElem && convertedAmountElem.value) {
            price = (parseFloat(convertedAmountElem.value) * 0.0027).toFixed(2); // Rough HUF to USD
        }
    }
    
    console.log('Google Pay amount:', price, currency);
    return { price, currency };
}

// Initialize Google Pay after the library loads
function initializeGooglePay() {
    try {
        // Initialize PaymentsClient
        paymentsClient = new google.payments.api.PaymentsClient({
            environment: 'TEST'
        });

        // Start the payment flow
        startPaymentFlow();
    } catch (err) {
        console.error('Failed to initialize Google Pay:', err);
        alert('Google Pay is not available. Please try a different payment method.');
    }
}

function getGoogleIsReadyToPayRequest() {
    return Object.assign(
        {},
        baseRequest,
        {
            allowedPaymentMethods: allowedPaymentMethods
        }
    );
}

function startPaymentFlow() {
    const isReadyToPayRequest = getGoogleIsReadyToPayRequest();
    
    // Check if Google Pay is available
    paymentsClient.isReadyToPay(isReadyToPayRequest)
        .then(response => {
            if (response.result) {
                console.log('Google Pay is ready');
                createGooglePayButton();
            } else {
                console.log('Google Pay is not available for this user/device.');
                document.getElementById('gpay-container').innerHTML = 
                    '<p>Google Pay is not available on this device/browser</p>';
            }
        })
        .catch(err => {
            console.error('Error checking Google Pay readiness:', err);
            document.getElementById('gpay-container').innerHTML = 
                '<p>Error initializing Google Pay</p>';
        });
}

// Create and append Google Pay button
function createGooglePayButton() {
    const gpayContainer = document.getElementById('gpay-container');
    gpayContainer.innerHTML = '';
    
    const button = paymentsClient.createButton({
        onClick: onGooglePayButtonClicked,
        allowedPaymentMethods: allowedPaymentMethods
    });
    
    gpayContainer.appendChild(button);
}

function getGooglePaymentDataRequest() {
    const { price, currency } = getGooglePayAmountAndCurrency();
    
    const paymentDataRequest = Object.assign({}, baseRequest);
    paymentDataRequest.allowedPaymentMethods = allowedPaymentMethods;
    paymentDataRequest.transactionInfo = {
        totalPriceStatus: 'FINAL',
        totalPrice: price,
        currencyCode: currency
    };
    paymentDataRequest.merchantInfo = {
        merchantName: 'SnapTray Demo'
    };
    
    return paymentDataRequest;
}

// Handle button click and payment flow
function onGooglePayButtonClicked() {
    const { price, currency } = getGooglePayAmountAndCurrency();
    
    if (parseFloat(price) <= 0) {
        alert('Please add items to your cart before paying.');
        return;
    }
    
    const paymentDataRequest = getGooglePaymentDataRequest();

    paymentsClient.loadPaymentData(paymentDataRequest)
        .then(paymentData => {
            // Handle the payment data
            console.log('Payment successful!', paymentData);
            
            // Show success message to user
            alert('Payment completed successfully! This is a test transaction.');

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
                    merchantInfo: paymentDataRequest.merchantInfo,
                    timestamp: new Date().toISOString()
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Payment saved to database:', data);
            })
            .catch(err => {
                console.error('Error saving payment to database:', err);
                alert('Payment completed but there was an error saving to database.');
            });
        })
        .catch(err => {
            console.error('Payment error:', err);
            
            // Handle specific Google Pay errors
            if (err.statusCode) {
                switch (err.statusCode) {
                    case 'CANCELED':
                        console.log('Payment was canceled by user');
                        break;
                    case 'DEVELOPER_ERROR':
                        alert('There is an issue with the payment configuration. Please contact support.');
                        break;
                    default:
                        alert(`Payment failed: ${err.statusMessage || 'Unknown error'}. Please try again.`);
                }
            } else {
                alert('Payment failed. Please try again or use a different payment method.');
            }
        });
}