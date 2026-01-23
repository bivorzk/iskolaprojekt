const { useState, useEffect } = React;

        // Import components
        const Header = require('./Header.jsx').default || require('./Header.jsx');
        const MenuItem = require('./MenuItem.jsx').default || require('./MenuItem.jsx');
        const Cart = require('./Cart.jsx').default || require('./Cart.jsx');
        const useCart = require('./useCart.js').default || require('./useCart.js');
        const { loadGooglePayScript, loadPayPalScript, handleGooglePayPayment, handlePayPalPayment, handleBalancePayment } = require('./paymentHandlers.js');

        const OrderPage = () => {
            const [menuItems, setMenuItems] = useState([]);
            const [currency, setCurrency] = useState('HUF');
            const [loading, setLoading] = useState(true);
            const [searchTerm, setSearchTerm] = useState('');
            const [selectedCategory, setSelectedCategory] = useState('all');

            const { cart, addToCart, removeFromCart, updateQuantity, clearCart } = useCart();

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
                window.location.href = `/Order/item_information/${encodeURIComponent(itemName)}`;
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
                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Menu Section */}
                            <div className="flex-1">
                                <div className="mb-6">
                                    <h1 className="text-3xl font-bold text-primary mb-4">Cafeteria Menu</h1>

                                    {/* Search and Filter */}
                                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder="Search menu items..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <select
                                                value={selectedCategory}
                                                onChange={(e) => setSelectedCategory(e.target.value)}
                                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {filteredMenuItems.map((item) => (
                                        <MenuItem
                                            key={item._id}
                                            item={item}
                                            onAddToCart={addToCart}
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

                            <Cart
                                cart={cart}
                                onUpdateQuantity={updateQuantity}
                                onRemoveFromCart={removeFromCart}
                                currency={currency}
                                onCurrencyChange={setCurrency}
                                onGooglePay={() => handleGooglePayPayment(cart, currency, clearCart)}
                                onPayPal={() => handlePayPalPayment(cart, currency, clearCart)}
                                onBalance={() => handleBalancePayment(cart, currency, clearCart)}
                            />
                        </div>
                    </div>

                    {/* PayPal Button Container - Hidden by default */}
                    <div id="paypal-button-container" style={{ display: 'none' }}></div>
                </div>
            );
        };

        ReactDOM.render(<OrderPage />, document.getElementById('root'));