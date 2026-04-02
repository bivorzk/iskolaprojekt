const { useState, useEffect } = React;

        const OrderPage = () => {
            const [menuItems, setMenuItems] = useState([]);
            const [dailyMenu, setDailyMenu] = useState([]);
            const [dailyMenuTitle, setDailyMenuTitle] = useState('Daily Menu');
            const [currency, setCurrency] = useState('HUF');
            const [loading, setLoading] = useState(true);
            const [searchTerm, setSearchTerm] = useState('');
            const [selectedCategory, setSelectedCategory] = useState('all');

            const { cart, addToCart, removeFromCart, updateQuantity, clearCart } = useCart();
            const { isMobileCartVisible, toggleMobileCart, hideMobileCart } = useMobileCart();

            const [selectedDiscount, setSelectedDiscount] = React.useState(null);
            const [appliedVoucher, setAppliedVoucher] = React.useState(null);

            // Clear applied voucher after order completes
            React.useEffect(() => {
                const handler = () => setAppliedVoucher(null);
                window.addEventListener('orderComplete', handler);
                return () => window.removeEventListener('orderComplete', handler);
            }, []);

            useEffect(() => {
                loadMenuItems();
                loadGooglePayScript();
                loadPayPalScript();
            }, []);

            const loadMenuItems = async () => {
                try {
                    const response = await fetch('/api/menu-items');
                    const data = await response.json();
                    setMenuItems(data.filter(item => item.available));

                    const dailyResp = await fetch('/api/daily-menu');
                    if (dailyResp.ok) {
                        const dailyData = await dailyResp.json();
                        setDailyMenuTitle(dailyData.label || 'Daily Menu');
                        setDailyMenu(Array.isArray(dailyData.items) ? dailyData.items : []);
                    }
                } catch (error) {
                    console.error('Error loading menu items:', error);
                } finally {
                    setLoading(false);
                }
            };

            const filteredMenuItems = menuItems.filter(item => {
                const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    item.description.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesCategory = selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase();
                return matchesSearch && matchesCategory;
            });

            const categories = ['all', ...new Set(menuItems.map(item => item.category))];

            const handleViewInfo = (itemName) => {
                window.location.href = `/order/item_information/${encodeURIComponent(itemName)}`;
            };

            const handleAddToCart = (item) => {
                addToCart(item);
                // Show toast notification on mobile
                if (window.showMobileToast) {
                    window.showMobileToast(`${item.name} added to cart!`);
                }
            };

            if (loading) {
                return (
                    <div className="min-h-screen bg-gradient-to-br from-accent to-white flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading menu...</p>
                        </div>
                    </div>
                );
            }

            return (
                <div className="min-h-screen bg-gradient-to-br from-accent to-white">
                    <Header />

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {/* Loyalty Status Banner */}
                        <LoyaltyStatus />

                        {/* Daily Menu Highlight */}
                        {dailyMenu.length > 0 && (
                            <div className="bg-white border-2 border-primary shadow-sm rounded-xl p-5 mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-xl font-bold text-primary">{dailyMenuTitle}</h2>
                                    <span className="text-sm font-medium text-secondary uppercase">Recommended</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {dailyMenu.map((item) => (
                                        <div key={item._id} className="border border-gray-200 rounded-lg p-3 bg-gradient-to-br from-[#f8fafc] to-white">
                                            <h3 className="text-base font-semibold text-gray-800 mb-1">{item.name}</h3>
                                            <p className="text-xs text-gray-500 h-10 overflow-hidden">{item.description || 'Delicious choice!'}</p>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-sm font-bold text-primary">{(Number(item.price) || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
                                                <button onClick={() => handleAddToCart(item)} className="text-xs px-2 py-1 rounded-md bg-primary text-white hover:bg-secondary transition-colors">
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Menu Section */}
                            <div className="flex-1">
                                <div className="mb-6">
                                    <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-4">Cafeteria Menu</h1>

                                    {/* Search and Filter */}
                                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder="Search menu items..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                        <div className="sm:w-auto">
                                            <select
                                                value={selectedCategory}
                                                onChange={(e) => setSelectedCategory(e.target.value)}
                                                className="w-full sm:w-auto px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                            >
                                                {categories.map(category => (
                                                    <option key={category} value={category}>
                                                        {category === 'all' ? 'All Categories' : category}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Menu Items Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 pb-24 lg:pb-8">
                                    {filteredMenuItems.map((item) => (
                                        <MenuItem
                                            key={item._id}
                                            item={item}
                                            onAddToCart={handleAddToCart}
                                            onViewInfo={handleViewInfo}
                                        />
                                    ))}
                                </div>

                                {filteredMenuItems.length === 0 && (
                                    <div className="text-center py-12">
                                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                        </svg>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                                        <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
                                    </div>
                                )}
                            </div>

                            {/* Desktop Cart - Hidden on Mobile */}
                            <div className="hidden lg:block">
                                <Cart
                                    cart={cart}
                                    onUpdateQuantity={updateQuantity}
                                    onRemoveFromCart={removeFromCart}
                                    currency={currency}
                                    onCurrencyChange={setCurrency}
                                    onGooglePay={() => handleGooglePayPayment(cart, currency, clearCart, selectedDiscount, appliedVoucher)}
                                    onPayPal={() => handlePayPalPayment(cart, currency, clearCart, selectedDiscount, appliedVoucher)}
                                    onBalance={() => handleBalancePayment(cart, currency, clearCart, selectedDiscount, appliedVoucher)}
                                    selectedDiscount={selectedDiscount}
                                    onDiscountChange={setSelectedDiscount}
                                    appliedVoucher={appliedVoucher}
                                    onVoucherChange={setAppliedVoucher}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Mobile Cart */}
                    <MobileCart
                        cart={cart}
                        onUpdateQuantity={updateQuantity}
                        onRemoveFromCart={removeFromCart}
                        currency={currency}
                        onCurrencyChange={setCurrency}
                        onGooglePay={() => {
                            hideMobileCart();
                            handleGooglePayPayment(cart, currency, clearCart, selectedDiscount, appliedVoucher);
                        }}
                        onPayPal={() => {
                            hideMobileCart();
                            handlePayPalPayment(cart, currency, clearCart, selectedDiscount, appliedVoucher);
                        }}
                        onBalance={() => {
                            hideMobileCart();
                            handleBalancePayment(cart, currency, clearCart, selectedDiscount, appliedVoucher);
                        }}
                        isVisible={isMobileCartVisible}
                        onToggle={toggleMobileCart}
                        selectedDiscount={selectedDiscount}
                        onDiscountChange={setSelectedDiscount}
                        appliedVoucher={appliedVoucher}
                        onVoucherChange={setAppliedVoucher}
                    />

                    {/* Mobile Toast Notifications */}
                    <MobileToast />

                    {/* PayPal Button Container - Hidden by default */}
                    <div id="paypal-button-container" style={{ display: 'none' }}></div>
                </div>
            );
        };

        ReactDOM.createRoot(document.getElementById('root')).render(<OrderPage />);