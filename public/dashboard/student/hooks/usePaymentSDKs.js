const { useState, useEffect, useCallback } = React;

const usePaymentSDKs = () => {
    const [googlePayReady, setGooglePayReady] = useState(false);
    const [paypalReady, setPaypalReady] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadGooglePaySDK = useCallback(() => {
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
            setLoading(false);
        };
        document.head.appendChild(script);
    }, []);

    const checkGooglePayReadiness = async () => {
        if (!window.google || !window.google.payments) {
            setGooglePayReady(false);
            setLoading(false);
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
        } finally {
            setLoading(false);
        }
    };

    const loadPayPalSDK = useCallback(() => {
        // Check if PayPal is already loaded
        if (window.paypal) {
            setPaypalReady(true);
            setLoading(false);
            return;
        }

        // Load PayPal SDK
        const script = document.createElement('script');
        script.src = 'https://www.paypal.com/sdk/js?client-id=AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqX3PiV8e1GWU6liB2CUXlkA59kJXE7M6R&components=buttons&currency=USD';
        script.async = true;
        script.onload = () => {
            console.log('PayPal SDK loaded successfully');
            setPaypalReady(true);
            setLoading(false);
        };
        script.onerror = () => {
            console.warn('Failed to load PayPal SDK');
            setPaypalReady(false);
            setLoading(false);
        };
        document.head.appendChild(script);
    }, []);

    const initializeSDKs = useCallback(() => {
        setLoading(true);
        loadGooglePaySDK();
        loadPayPalSDK();
    }, [loadGooglePaySDK, loadPayPalSDK]);

    useEffect(() => {
        initializeSDKs();
    }, [initializeSDKs]);

    return {
        googlePayReady,
        paypalReady,
        loading,
        initializeSDKs
    };
};

window.usePaymentSDKs = usePaymentSDKs;