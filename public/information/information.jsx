const { useState, useEffect } = React;

const ItemInformation = () => {
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [cartMessage, setCartMessage] = useState('');

    const { addToCart } = useCart();

    useEffect(() => {
        loadItemInformation();
    }, []);

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
                        onClick={() => window.location.href = '/Order/'}
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
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-4">
                            <a href="/">
                            <svg viewBox="0 0 500 140" className="h-20 w-auto">
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
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => window.location.href = '/Order/'}
                                className="text-primary hover:text-secondary font-medium"
                            >
                                Back to Menu
                            </button>
                            <a href="/logout" className="text-gray-700 hover:text-primary font-medium">Logout</a>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="lg:flex">
                        {/* Image Section */}
                        <div className="lg:w-1/2">
                            <img
                                src={item.image || 'https://loremflickr.com/400/300/food'}
                                alt={item.name}
                                className="w-full h-80 lg:h-full object-cover"
                            />
                        </div>

                        {/* Information Section */}
                        <div className="lg:w-1/2 p-8">
                            <div className="flex justify-between items-start mb-4">
                                <h1 className="text-4xl font-bold text-primary">{item.name}</h1>
                                <span className="text-3xl font-bold text-primary">${item.price.toFixed(2)}</span>
                            </div>

                            {/* Rating Display */}
                            {(averageRating > 0 || reviews.length > 0) && (
                                <div className="flex items-center mb-4">
                                    <div className="flex items-center">
                                        {renderStars(Math.round(averageRating))}
                                    </div>
                                    <span className="ml-2 text-lg font-medium text-gray-700">
                                        {averageRating} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                                    </span>
                                </div>
                            )}

                            <p className="text-gray-700 text-xl mb-6 leading-relaxed">{item.description}</p>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center">
                                    <span className="font-semibold text-gray-800 w-32">Category:</span>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-base font-medium bg-accent text-primary">
                                        {item.category}
                                    </span>
                                </div>

                                {item.calories && (
                                    <div className="flex items-center">
                                        <span className="font-semibold text-gray-800 w-32">Calories:</span>
                                        <span className="text-gray-700 text-lg">{item.calories} kcal</span>
                                        {item.protein && <span className="ml-6 text-gray-700">Protein: {item.protein}g</span>}
                                    </div>
                                )}

                                {item.allergens && item.allergens.length > 0 && (
                                    <div className="flex items-start">
                                        <span className="font-semibold text-gray-800 w-32">Allergens:</span>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-base font-medium bg-yellow-100 text-yellow-800">
                                            {item.allergens.join(', ')}
                                        </span>
                                    </div>
                                )}

                                {item.healthScore && (
                                    <div>
                                        <div className="flex items-center mb-2">
                                            <span className="font-semibold text-gray-800 w-32">Health Score:</span>
                                            <span className="text-gray-700 text-lg">{item.healthScore}/100</span>
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

                            <div className="flex space-x-4">
                                <button
                                    onClick={() => window.location.href = '/Order/'}
                                    className="flex-1 bg-primary text-white py-3 px-6 rounded-lg hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors font-medium text-lg"
                                >
                                    Back to Menu
                                </button>
                                <button
                                    onClick={() => {
                                        addToCart(item);
                                        setCartMessage('Added to cart!');
                                        setTimeout(() => setCartMessage(''), 3000);
                                    }}
                                    className="flex-1 bg-secondary text-white py-3 px-6 rounded-lg hover:bg-primary focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 transition-colors font-medium text-lg"
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
                <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-primary">Customer Reviews</h2>
                        <button
                            onClick={() => setShowReviewForm(!showReviewForm)}
                            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition-colors font-medium"
                        >
                            Write a Review
                        </button>
                    </div>

                    {/* Success Message */}
                    {successMessage && (
                        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
                            <p className="font-medium">{successMessage}</p>
                        </div>
                    )}

                    {/* Review Form */}
                    {showReviewForm && (
                        <div className="mb-8 p-6 bg-accent rounded-lg">
                            <h3 className="text-xl font-semibold text-primary mb-4">Write Your Review</h3>
                            <form onSubmit={handleReviewSubmit}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Rating
                                    </label>
                                    <div className="flex space-x-1">
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
                                        className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors font-medium disabled:opacity-50"
                                    >
                                        {submitLoading ? 'Submitting...' : 'Submit Review'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowReviewForm(false);
                                            setNewReview({ rating: 5, comment: '' });
                                        }}
                                        className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors font-medium"
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
                                <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center">
                                            {renderStars(review.rating, 'w-4 h-4')}
                                            <span className="ml-2 font-medium text-gray-900">
                                                {review.rating} star{review.rating !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <span className="text-sm text-gray-500">
                                            {formatDate(review.date)}
                                        </span>
                                    </div>
                                    <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                                    {review.userId && review.userId.username && (
                                        <div className="mt-2 text-sm text-gray-500">
                                            By: {review.userId.username}
                                        </div>
                                    )}
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
                                onClick={() => setShowReviewForm(true)}
                                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-secondary transition-colors font-medium"
                            >
                                Write the First Review
                            </button>
                        </div>
                    )}
                </div>

                {/* Additional Information Sections */}
                <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
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
                                <div className="grid grid-cols-2 gap-4 text-sm">
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
