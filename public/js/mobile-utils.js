// Mobile optimization utilities for SnapTray
window.MobileUtils = (function() {
    'use strict';

    // Check if device is mobile
    const isMobile = () => {
        return window.innerWidth < 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    // Check if device is in portrait mode
    const isPortrait = () => {
        return window.innerHeight > window.innerWidth;
    };

    // Prevent zoom on input focus (iOS)
    const preventZoomOnInputFocus = () => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="number"], textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                if (isMobile()) {
                    this.style.fontSize = '16px';
                }
            });
        });
    };

    // Add touch-friendly classes to elements
    const enhanceTouchTargets = () => {
        if (isMobile()) {
            const buttons = document.querySelectorAll('button, .btn, a[href]');
            buttons.forEach(button => {
                if (!button.classList.contains('touch-enhanced')) {
                    button.classList.add('touch-enhanced');
                    button.style.minHeight = '44px';
                    button.style.minWidth = '44px';
                }
            });
        }
    };

    // Handle orientation changes
    const handleOrientationChange = () => {
        window.addEventListener('orientationchange', function() {
            setTimeout(() => {
                // Force a resize calculation after orientation change
                window.dispatchEvent(new Event('resize'));
                
                // Scroll to top to prevent weird positioning
                if (window.scrollY > 100) {
                    window.scrollTo(0, 0);
                }
            }, 100);
        });
    };

    // Smooth scroll polyfill for older browsers
    const enableSmoothScroll = () => {
        if (!CSS.supports('scroll-behavior', 'smooth')) {
            const links = document.querySelectorAll('a[href^="#"]');
            links.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });
        }
    };

    // Optimize images for mobile
    const optimizeImages = () => {
        if (isMobile()) {
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                // Add loading="lazy" if not present
                if (!img.hasAttribute('loading')) {
                    img.setAttribute('loading', 'lazy');
                }
                
                // Add mobile-optimized classes
                if (!img.classList.contains('mobile-optimized')) {
                    img.classList.add('mobile-optimized');
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                }
            });
        }
    };

    // Add haptic feedback for supported devices
    const addHapticFeedback = (element, intensity = 'medium') => {
        if (navigator.vibrate && isMobile()) {
            element.addEventListener('click', function() {
                const patterns = {
                    light: [10],
                    medium: [20],
                    heavy: [30]
                };
                navigator.vibrate(patterns[intensity] || patterns.medium);
            });
        }
    };

    // Optimize modals for mobile
    const optimizeModalsForMobile = () => {
        const modals = document.querySelectorAll('.modal, [role="dialog"]');
        modals.forEach(modal => {
            if (isMobile()) {
                modal.style.margin = '0';
                modal.style.borderRadius = '16px 16px 0 0';
                modal.style.maxHeight = '90vh';
                modal.style.overflowY = 'auto';
            }
        });
    };

    // Add swipe gesture support
    const addSwipeGestureSupport = (element, callbacks = {}) => {
        let startX, startY, endX, endY;
        
        element.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        element.addEventListener('touchend', function(e) {
            endX = e.changedTouches[0].clientX;
            endY = e.changedTouches[0].clientY;
            
            const diffX = startX - endX;
            const diffY = startY - endY;
            
            // Minimum swipe distance
            const minSwipeDistance = 50;
            
            if (Math.abs(diffX) > Math.abs(diffY)) {
                // Horizontal swipe
                if (Math.abs(diffX) > minSwipeDistance) {
                    if (diffX > 0 && callbacks.onSwipeLeft) {
                        callbacks.onSwipeLeft();
                    } else if (diffX < 0 && callbacks.onSwipeRight) {
                        callbacks.onSwipeRight();
                    }
                }
            } else {
                // Vertical swipe
                if (Math.abs(diffY) > minSwipeDistance) {
                    if (diffY > 0 && callbacks.onSwipeUp) {
                        callbacks.onSwipeUp();
                    } else if (diffY < 0 && callbacks.onSwipeDown) {
                        callbacks.onSwipeDown();
                    }
                }
            }
        });
    };

    // Initialize all mobile optimizations
    const init = () => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        preventZoomOnInputFocus();
        enhanceTouchTargets();
        handleOrientationChange();
        enableSmoothScroll();
        optimizeImages();
        optimizeModalsForMobile();

        // Re-run optimizations when new content is added
        const observer = new MutationObserver(() => {
            enhanceTouchTargets();
            optimizeImages();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('Mobile optimizations initialized');
    };

    // Public API
    return {
        init,
        isMobile,
        isPortrait,
        addHapticFeedback,
        addSwipeGestureSupport,
        optimizeModalsForMobile
    };
})();

// Auto-initialize mobile utils
MobileUtils.init();