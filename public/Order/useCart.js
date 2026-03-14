const useCart = () => {
    const [cart, setCart] = React.useState([]);

    React.useEffect(() => {
        loadCartFromStorage();
    }, []);

    const loadCartFromStorage = () => {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (error) {
                console.error('Error loading cart from storage:', error);
            }
        }
    };

    const saveCartToStorage = (newCart) => {
        localStorage.setItem('cart', JSON.stringify(newCart));
    };

    const addToCart = (item) => {
        const existingItem = cart.find(cartItem => cartItem._id === item._id);
        if (existingItem) {
            if (existingItem.quantity + 1 > existingItem.stock) {
                return; // Prevent adding more than available stock
            }
            const newCart = cart.map(cartItem =>
                cartItem._id === item._id
                    ? { ...cartItem, quantity: cartItem.quantity + 1 }
                    : cartItem
            );
            setCart(newCart);
            saveCartToStorage(newCart);
        } else {
            const newCart = [...cart, { ...item, quantity: 1 }];
            setCart(newCart);
            saveCartToStorage(newCart);
        }
    };

    const removeFromCart = (itemId) => {
        const newCart = cart.filter(item => item._id !== itemId);
        setCart(newCart);
        saveCartToStorage(newCart);
    };

    const updateQuantity = (itemId, newQuantity) => {
        if (newQuantity <= 0) {
            removeFromCart(itemId);
            return;
        }
        const item = cart.find(item => item._id === itemId);
        if (item && newQuantity > item.stock) {
            // Prevent ordering more than available stock
            return;
        }
        const newCart = cart.map(item =>
            item._id === itemId ? { ...item, quantity: newQuantity } : item
        );
        setCart(newCart);
        saveCartToStorage(newCart);
    };

    const clearCart = () => {
        setCart([]);
        saveCartToStorage([]);
    };

    return {
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart
    };
};