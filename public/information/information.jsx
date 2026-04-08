const { useState, useEffect } = React;

const MobileBrandLockup = () => (
    <div className="flex items-center gap-3">
        <svg viewBox="0 0 140 140" className="h-12 w-12 shrink-0" aria-hidden="true">
            <rect x="25" y="55" width="90" height="50" rx="6" fill="#FF6B35"/>
            <rect x="30" y="60" width="35" height="40" rx="3" fill="#FFE5DC"/>
            <rect x="70" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
            <rect x="95" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
            <rect x="70" y="82" width="45" height="18" rx="3" fill="#FFE5DC"/>
            <path d="M80 25 L65 52 L75 52 L60 80 L85 50 L75 50 L90 25 Z" fill="#FFC857" stroke="#FF6B35" strokeWidth="2" strokeLinejoin="round"/>
        </svg>
        <div className="min-w-0">
            <div className="text-2xl font-bold leading-none text-primary">SnapTray</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-gray-500">Cafeteria Ordering</div>
        </div>
    </div>
);

const ItemInformation = () => {
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [reportMessage, setReportMessage] = useState('');
    const [cartMessage, setCartMessage] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [isHeaderHidden, setIsHeaderHidden] = useState(false);

    const { addToCart } = useCart();

    useEffect(() => {
        loadItemInformation();
        loadAuthStatus();
    }, []);

    useEffect(() => {
        let lastScrollY = window.scrollY;
        let ticking = false;

        const updateHeaderVisibility = () => {
            const currentScrollY = window.scrollY;
            const isCompactViewport = window.innerWidth < 640;

            if (!isCompactViewport || currentScrollY <= 24) {
                setIsHeaderHidden(false);
            } else if (currentScrollY > lastScrollY + 8) {
                setIsHeaderHidden(true);
            } else if (currentScrollY < lastScrollY - 8) {
                setIsHeaderHidden(false);
            }

            lastScrollY = currentScrollY;
            ticking = false;
        };

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(updateHeaderVisibility);
                ticking = true;
            }
        };

        const handleResize = () => {
            if (window.innerWidth >= 640) {
                setIsHeaderHidden(false);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const getDashboardRoute = (usertype) => {
        switch (usertype) {
            case 'admin': return '/dashboard/admin';
            case 'editor': return '/dashboard/editor';
            case 'parent': return '/dashboard/parent';
            case 'teacher': return '/dashboard/teacher';
            default: return '/dashboard/student';
        }
    };

    const getMenuRoute = (usertype) => {
        return usertype === 'student' ? '/Order/' : getDashboardRoute(usertype);
    };

    const loadAuthStatus = async () => {
        try {
            const response = await fetch('/api/current_user');
            if (response.ok) {
                const data = await response.json();
                setIsLoggedIn(data.loggedIn === true);
                setCurrentUser(data.user || null);
            } else {
                setIsLoggedIn(false);
                setCurrentUser(null);
            }
        } catch (err) {
            console.error('Auth status check failed:', err);
            setIsLoggedIn(false);
            setCurrentUser(null);
        }
    };

    const loadItemInformation = async () => {
        try {
            // Get item name from URL
            const pathParts = window.location.pathname.split('/');
            const itemName = decodeURIComponent(pathParts[pathParts.length - 1]);

            console.log('Loading item information for:', itemName);
            
            // Use the order endpoint to get menu items with reviews
            const response = await fetch('/order/menu_items');
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Received menu items:', data.length, 'items');
            
            const foundItem = data.find(menuItem => menuItem.name === itemName && menuItem.available);
            console.log('Found item:', foundItem?.name, 'with reviews:', foundItem?.reviews?.length || 0);

            if (foundItem) {
                setItem(foundItem);
                setReviews(foundItem.reviews || []);
            } else {
                setError('Item not found');
            }
        } catch (err) {
            console.error('Error loading item information:', err);
            setError('Failed to load item information: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        
        if (!isLoggedIn) {
            alert('You must be logged in to submit a review.');
            return;
        }

        if (!newReview.comment.trim()) {
            alert('Please enter a comment for your review');
            return;
        }

        setSubmitLoading(true);
        
        try {
            const pathParts = window.location.pathname.split('/');
            const itemName = decodeURIComponent(pathParts[pathParts.length - 1]);
            
            console.log('Submitting review for:', itemName, 'Rating:', newReview.rating, 'Comment:', newReview.comment);
            
            const response = await fetch(`/order/item_information/${encodeURIComponent(itemName)}/Review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rating: newReview.rating,
                    comment: newReview.comment.trim()
                })
            });

            console.log('Review submission response status:', response.status);
            const data = await response.json();
            console.log('Review submission response data:', data);
            
            if (response.ok) {
                setSuccessMessage('Review submitted successfully!');
                setNewReview({ rating: 5, comment: '' });
                setShowReviewForm(false);
                
                console.log('Reloading item information after review submission...');
                // Reload item data to get updated reviews from database
                await loadItemInformation();
                
                setTimeout(() => setSuccessMessage(''), 5000);
            } else {
                alert(data.error || 'Failed to submit review');
            }
        } catch (err) {
            console.error('Error submitting review:', err);
            alert('Failed to submit review. Please try again.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleReportReview = async (reviewId) => {
        if (!isLoggedIn) {
            alert('You must be logged in to report reviews.');
            return;
        }

        try {
            const pathParts = window.location.pathname.split('/');
            const itemName = decodeURIComponent(pathParts[pathParts.length - 1]);

            const response = await fetch(`/order/item_information/${encodeURIComponent(itemName)}/Review/${reviewId}/Report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (response.ok) {
                setReportMessage('Review reported. Thank you for helping us keep the community safe.');
                setReviews(prev => prev.map(review => review._id === reviewId ? {
                    ...review,
                    reported: true,
                    reportCount: (review.reportCount || 0) + 1
                } : review));
                setTimeout(() => setReportMessage(''), 5000);
            } else {
                setReportMessage(data.error || 'Failed to report review.');
                setTimeout(() => setReportMessage(''), 5000);
            }
        } catch (err) {
            console.error('Error reporting review:', err);
            setReportMessage('Failed to report review. Please try again later.');
            setTimeout(() => setReportMessage(''), 5000);
        }
    };

    const renderStars = (rating, size = 'w-5 h-5') => {
        return [...Array(5)].map((_, index) => (
            <svg
                key={index}
                className={`${size} ${index < rating ? 'text-secondary' : 'text-gray-300'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
            >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        ));
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const averageRating = reviews.length > 0 
        ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
        : item?.averageRating || 0;
    const dashboardRoute = currentUser ? getDashboardRoute(currentUser.usertype) : '/dashboard/student';
    const menuRoute = currentUser ? getMenuRoute(currentUser.usertype) : '/Order/';

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-accent to-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading item information...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-accent to-white flex items-center justify-center">
                <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
                    <p className="text-gray-600">{error}</p>
                    <button
                        onClick={() => window.location.href = menuRoute}
                        className="mt-4 bg-primary text-white px-4 py-2 rounded-md hover:bg-secondary"
                    >
                        Back to Menu
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-accent to-white">
            {/* Header */}
            <header className={`fixed inset-x-0 top-0 z-30 bg-white/95 shadow-sm border-b border-gray-200 backdrop-blur transition-transform duration-300 ${isHeaderHidden ? '-translate-y-full' : 'translate-y-0'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex justify-center sm:justify-start">
                            <a href="/" className="block sm:hidden">
                                <MobileBrandLockup />
                            </a>
                            <a href="/" className="hidden sm:block shrink-0">
                                <svg viewBox="0 0 500 140" className="h-16 sm:h-20 w-auto shrink-0">
                                    <rect x="25" y="55" width="90" height="50" rx="6" fill="#FF6B35"/>
                                    <rect x="30" y="60" width="35" height="40" rx="3" fill="#FFE5DC"/>
                                    <rect x="70" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                                    <rect x="95" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                                    <rect x="70" y="82" width="45" height="18" rx="3" fill="#FFE5DC"/>
                                    <path d="M80 25 L65 52 L75 52 L60 80 L85 50 L75 50 L90 25 Z" fill="#FFC857" stroke="#FF6B35" strokeWidth="2" strokeLinejoin="round"/>
                                    <text x="150" y="85" fontFamily="system-ui, -apple-system, sans-serif" fontSize="32" fontWeight="bold" fill="#FF6B35" letterSpacing="-1">SnapTray</text>
                                    <text x="150" y="105" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fill="#6C757D" letterSpacing="2">CAFETERIA ORDERING</text>
                                </svg>
                            </a>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
                            <button
                                onClick={() => window.location.href = dashboardRoute}
                                className="rounded-xl border border-primary/20 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-accent"
                            >
                                Dashboard
                            </button>
                            <button
                                onClick={() => window.location.href = menuRoute}
                                className="rounded-xl border border-primary/20 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-accent"
                            >
                                Back to Menu
                            </button>
                            {isLoggedIn ? (
                                <a href="/logout" className="col-span-2 sm:col-span-1 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-secondary">
                                    Logout
                                </a>
                            ) : (
                                <a href="/login" className="col-span-2 sm:col-span-1 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-secondary">
                                    Login
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-44 pb-5 sm:pt-32 sm:pb-8">
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-white/70">
                    <div className="grid lg:grid-cols-2">
                        {/* Image Section */}
                        <div>
                            <img
                                src={item.image || 'https://loremflickr.com/400/300/food'}
                                alt={item.name}
                                className="w-full h-64 sm:h-80 lg:h-full object-cover"
                            />
                        </div>

                        {/* Information Section */}
                        <div className="p-5 sm:p-8">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-400">Menu Item</p>
                                    <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-primary leading-tight">{item.name}</h1>
                                </div>
                                <span className="text-2xl sm:text-3xl font-bold text-primary shrink-0">${item.price.toFixed(2)}</span>
                            </div>

                            {/* Rating Display */}
                            {(averageRating > 0 || reviews.length > 0) && (
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center mb-4">
                                    <div className="flex items-center">
                                        {renderStars(Math.round(averageRating))}
                                    </div>
                                    <span className="text-base sm:text-lg font-medium text-gray-700">
                                        {averageRating} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                                    </span>
                                </div>
                            )}

                            <p className="text-gray-700 text-base sm:text-lg mb-6 leading-relaxed">{item.description}</p>

                            <div className="grid gap-3 sm:grid-cols-2 mb-8">
                                <div className="rounded-2xl bg-[#fffaf7] p-4 shadow-sm">
                                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Category</div>
                                    <span className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent text-primary">
                                        {item.category}
                                    </span>
                                </div>

                                {item.calories && (
                                    <div className="rounded-2xl bg-gray-50 p-4 shadow-sm">
                                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Nutrition Snapshot</div>
                                        <div className="mt-2 text-gray-800 font-semibold">{item.calories} kcal</div>
                                        {item.protein && <div className="mt-1 text-sm text-gray-600">Protein: {item.protein}g</div>}
                                    </div>
                                )}

                                {item.allergens && item.allergens.length > 0 && (
                                    <div className="sm:col-span-2 rounded-2xl bg-yellow-50 p-4 shadow-sm">
                                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-yellow-700/70">Allergens</div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {item.allergens.map((allergen) => (
                                                <span key={allergen} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                                    {allergen}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {item.healthScore && (
                                    <div className="sm:col-span-2 rounded-2xl bg-gray-50 p-4 shadow-sm">
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                            <span className="text-sm font-semibold text-gray-800">Health Score</span>
                                            <span className="text-sm font-semibold text-primary">{item.healthScore}/100</span>
                                        </div>
                                        <div className="bg-gray-200 rounded-full h-3">
                                            <div
                                                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                                                style={{ width: `${item.healthScore}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => window.location.href = menuRoute}
                                    className="w-full bg-primary text-white py-3 px-6 rounded-xl hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors font-medium text-base sm:text-lg"
                                >
                                    Back to Menu
                                </button>
                                <button
                                    onClick={() => {
                                        addToCart(item);
                                        setCartMessage('Added to cart!');
                                        setTimeout(() => setCartMessage(''), 3000);
                                    }}
                                    className="w-full bg-secondary text-white py-3 px-6 rounded-xl hover:bg-primary focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 transition-colors font-medium text-base sm:text-lg"
                                >
                                    Add to Cart
                                </button>
                            </div>
                            {cartMessage && (
                                <div className="mt-3 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-lg text-center font-medium">
                                    {cartMessage}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Reviews Section */}
                <div className="mt-8 bg-white rounded-3xl shadow-lg p-5 sm:p-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
                        <h2 className="text-2xl font-bold text-primary">Customer Reviews</h2>
                        <button
                            onClick={() => {
                                if (!isLoggedIn) {
                                    alert('Please log in to submit a review.');
                                    window.location.href = '/login';
                                    return;
                                }
                                setShowReviewForm(!showReviewForm);
                            }}
                            className="w-full sm:w-auto bg-primary text-white px-4 py-3 rounded-xl hover:bg-secondary transition-colors font-medium"
                        >
                            {isLoggedIn ? 'Write a Review' : 'Login to Review'}
                        </button>
                    </div>

                    {/* Success Message */}
                    {successMessage && (
                        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
                            <p className="font-medium">{successMessage}</p>
                        </div>
                    )}
                    {reportMessage && (
                        <div className="mb-6 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg">
                            <p className="font-medium">{reportMessage}</p>
                        </div>
                    )}

                    {/* Review Form */}
                    {showReviewForm && (
                        <div className="mb-8 p-5 sm:p-6 bg-accent rounded-2xl">
                            <h3 className="text-xl font-semibold text-primary mb-4">Write Your Review</h3>
                            <form onSubmit={handleReviewSubmit}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Rating
                                    </label>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {[1, 2, 3, 4, 5].map((rating) => (
                                            <button
                                                key={rating}
                                                type="button"
                                                onClick={() => setNewReview(prev => ({ ...prev, rating }))}
                                                className="focus:outline-none"
                                            >
                                                <svg
                                                    className={`w-8 h-8 ${rating <= newReview.rating ? 'text-secondary' : 'text-gray-300'} hover:text-secondary transition-colors`}
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            </button>
                                        ))}
                                        <span className="ml-2 text-gray-700 font-medium">
                                            {newReview.rating} star{newReview.rating !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="mb-4">
                                    <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                                        Comment
                                    </label>
                                    <textarea
                                        id="comment"
                                        rows="4"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Share your thoughts about this item..."
                                        value={newReview.comment}
                                        onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                                        maxLength="500"
                                        required
                                    />
                                    <div className="mt-1 text-right text-sm text-gray-500">
                                        {newReview.comment.length}/500 characters
                                    </div>
                                </div>
                                
                                <div className="flex space-x-3">
                                    <button
                                        type="submit"
                                        disabled={submitLoading}
                                        className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors font-medium disabled:opacity-50"
                                    >
                                        {submitLoading ? 'Submitting...' : 'Submit Review'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowReviewForm(false);
                                            setNewReview({ rating: 5, comment: '' });
                                        }}
                                        className="bg-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Reviews List */}
                    {reviews.length > 0 ? (
                        <div className="space-y-6">
                            {reviews.map((review, index) => (
                                <div key={index} className="rounded-2xl border border-gray-200 p-4 sm:p-5 bg-gray-50">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-2">
                                        <div className="flex items-center">
                                            {renderStars(review.rating, 'w-4 h-4')}
                                            <span className="ml-2 font-medium text-gray-900">
                                                {review.rating} star{review.rating !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <span className="text-sm text-gray-500 shrink-0">
                                            {formatDate(review.date)}
                                        </span>
                                    </div>
                                    <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                        {review.userId && review.userId.username && (
                                            <div className="text-sm text-gray-500">By: {review.userId.username}</div>
                                        )}
                                        <div className="flex items-center gap-3">
                                            {review.reported && (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                                    Reported
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleReportReview(review._id)}
                                                disabled={!isLoggedIn || review.reported}
                                                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${review.reported ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : isLoggedIn ? 'bg-primary text-white hover:bg-secondary' : 'bg-primary/30 text-white cursor-not-allowed'}`}
                                            >
                                                {review.reported ? 'Reported' : 'Report Review'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews Yet</h3>
                            <p className="text-gray-600 mb-4">Be the first to share your thoughts about this item!</p>
                            <button
                                onClick={() => {
                                    if (!isLoggedIn) {
                                        alert('Please log in to submit a review.');
                                        window.location.href = '/login';
                                        return;
                                    }
                                    setShowReviewForm(true);
                                }}
                                className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-secondary transition-colors font-medium"
                            >
                                {isLoggedIn ? 'Write the First Review' : 'Login to Review'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Additional Information Sections */}
                <div className="mt-8 bg-white rounded-3xl shadow-lg p-5 sm:p-8">
                    <div className="border-t border-gray-200 pt-4 mt-6">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">Additional Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <span className="font-medium text-gray-700">Ingredients:</span>
                                <p className="text-gray-600 mt-1">{item.ingredients || 'Fresh ingredients including vegetables, proteins, and seasonings'}</p>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Preparation Time:</span>
                                <p className="text-gray-600 mt-1">{item.prepTime || 'Approximately 15-20 minutes'}</p>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Serving Size:</span>
                                <p className="text-gray-600 mt-1">{item.servingSize || 'One serving'}</p>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Dietary Info:</span>
                                <p className="text-gray-600 mt-1">{item.dietaryInfo || 'Please check allergens above'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Nutritional Facts Table */}
                    {item.nutrition && (
                        <div className="border-t border-gray-200 pt-4 mt-6">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Nutritional Facts</h3>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <div><span className="font-medium">Fat:</span> {item.nutrition.fat || 'N/A'}g</div>
                                    <div><span className="font-medium">Carbs:</span> {item.nutrition.carbs || 'N/A'}g</div>
                                    <div><span className="font-medium">Fiber:</span> {item.nutrition.fiber || 'N/A'}g</div>
                                    <div><span className="font-medium">Sugar:</span> {item.nutrition.sugar || 'N/A'}g</div>
                                    <div><span className="font-medium">Sodium:</span> {item.nutrition.sodium || 'N/A'}mg</div>
                                    <div><span className="font-medium">Cholesterol:</span> {item.nutrition.cholesterol || 'N/A'}mg</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

ReactDOM.render(<ItemInformation />, document.getElementById('root'));
