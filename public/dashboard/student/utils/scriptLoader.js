// Script loader utility for wallet components
const WalletScriptLoader = {
    loadedScripts: new Set(),

    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (this.loadedScripts.has(src)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => {
                this.loadedScripts.add(src);
                resolve();
            };
            script.onerror = () => {
                reject(new Error(`Failed to load script: ${src}`));
            };
            document.head.appendChild(script);
        });
    },

    async loadWalletDependencies() {
        const scriptsToLoad = [
            '/dashboard/student/hooks/useWalletForm.js',
            '/dashboard/student/hooks/usePaymentSDKs.js', 
            '/dashboard/student/hooks/useLoyaltyAnimation.js',
            '/dashboard/student/components/WalletBalance.jsx',
            '/dashboard/student/components/WalletDepositForm.jsx',
            '/dashboard/student/components/PaymentMethodModal.jsx',
            '/dashboard/student/services/walletPaymentService.js'
        ];

        try {
            await Promise.all(scriptsToLoad.map(src => this.loadScript(src)));
            console.log('All wallet dependencies loaded successfully');
        } catch (error) {
            console.error('Failed to load wallet dependencies:', error);
            throw error;
        }
    }
};

window.WalletScriptLoader = WalletScriptLoader;