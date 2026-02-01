const useMobileCart = () => {
    const [isMobileCartVisible, setIsMobileCartVisible] = React.useState(false);

    const toggleMobileCart = () => {
        setIsMobileCartVisible(!isMobileCartVisible);
    };

    const showMobileCart = () => {
        setIsMobileCartVisible(true);
    };

    const hideMobileCart = () => {
        setIsMobileCartVisible(false);
    };

    // Close cart when clicking outside or pressing escape
    React.useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && isMobileCartVisible) {
                hideMobileCart();
            }
        };

        if (isMobileCartVisible) {
            document.addEventListener('keydown', handleKeyDown);
            // Prevent body scroll when cart is open
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isMobileCartVisible]);

    return {
        isMobileCartVisible,
        toggleMobileCart,
        showMobileCart,
        hideMobileCart
    };
};