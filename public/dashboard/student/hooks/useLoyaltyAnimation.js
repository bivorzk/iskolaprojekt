const { useCallback } = React;

const useLoyaltyAnimation = () => {
    const showLoyaltyPointsAnimation = useCallback((pointsAwarded) => {
        console.log('showLoyaltyPointsAnimation called with points:', pointsAwarded);
        
        if (!pointsAwarded || pointsAwarded <= 0) {
            console.log('Animation skipped - invalid points:', pointsAwarded);
            return;
        }
        
        // Create the animation container
        const animationContainer = document.createElement('div');
        animationContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        
        // Create the points display with site theme
        const pointsDisplay = document.createElement('div');
        pointsDisplay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #FF6B35, #FFC857);
                color: white;
                padding: 24px 32px;
                border-radius: 16px;
                box-shadow: 0 20px 40px rgba(255, 107, 53, 0.3), 0 8px 16px rgba(255, 107, 53, 0.2);
                text-align: center;
                transform: scale(0);
                animation: snapTrayBounceIn 0.7s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
                border: 2px solid rgba(255, 229, 220, 0.3);
                backdrop-filter: blur(10px);
            ">
                <div style="
                    font-size: 18px; 
                    font-weight: 600; 
                    margin-bottom: 12px;
                    color: #FFE5DC;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                ">⚡ Loyalty Points Earned!</div>
                <div style="
                    font-size: 42px; 
                    font-weight: bold; 
                    color: white;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    margin: 8px 0;
                ">+${pointsAwarded}</div>
                <div style="
                    font-size: 14px; 
                    margin-top: 12px; 
                    opacity: 0.9;
                    color: #FFE5DC;
                    font-weight: 500;
                ">Wallet deposit bonus!</div>
            </div>
        `;
        
        // Add SnapTray themed keyframes
        if (!document.getElementById('snapTrayLoyaltyStyles')) {
            const style = document.createElement('style');
            style.id = 'snapTrayLoyaltyStyles';
            style.textContent = `
                @keyframes snapTrayBounceIn {
                    0% {
                        transform: scale(0) rotate(-180deg);
                        opacity: 0;
                    }
                    50% {
                        transform: scale(1.15) rotate(-10deg);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(1) rotate(0deg);
                        opacity: 1;
                    }
                }
                
                @keyframes snapTrayFadeOut {
                    0% {
                        transform: scale(1) translate(-50%, -50%);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(0.9) translate(-50%, -60%);
                        opacity: 0;
                    }
                }
                
                @keyframes snapTraySparkle {
                    0% {
                        transform: translateY(0) scale(0) rotate(0deg);
                        opacity: 1;
                    }
                    25% {
                        transform: translateY(-20px) scale(1) rotate(90deg);
                        opacity: 1;
                    }
                    50% {
                        transform: translateY(-60px) scale(1.2) rotate(180deg);
                        opacity: 0.8;
                    }
                    100% {
                        transform: translateY(-120px) scale(0) rotate(360deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        animationContainer.appendChild(pointsDisplay);
        document.body.appendChild(animationContainer);
        
        // Add SnapTray themed sparkle effects
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                const sparkleTypes = ['⚡', '✨', '💎', '🔥'];
                sparkle.innerHTML = sparkleTypes[Math.floor(Math.random() * sparkleTypes.length)];
                sparkle.style.cssText = `
                    position: absolute;
                    font-size: ${Math.random() * 16 + 20}px;
                    left: ${Math.random() * 400 - 200}px;
                    top: ${Math.random() * 200 - 100}px;
                    pointer-events: none;
                    animation: snapTraySparkle ${Math.random() * 1.5 + 1.2}s ease-out forwards;
                    z-index: 10001;
                    filter: drop-shadow(0 0 4px rgba(255, 107, 53, 0.6));
                `;
                
                animationContainer.appendChild(sparkle);
                
                setTimeout(() => {
                    if (sparkle.parentNode) {
                        sparkle.parentNode.removeChild(sparkle);
                    }
                }, 2500);
            }, i * 80);
        }
        
        // Remove animation after delay with SnapTray style fadeout
        setTimeout(() => {
            animationContainer.style.animation = 'snapTrayFadeOut 0.6s ease-in forwards';
            setTimeout(() => {
                if (animationContainer.parentNode) {
                    animationContainer.parentNode.removeChild(animationContainer);
                }
            }, 600);
        }, 3500);
    }, []);

    return {
        showLoyaltyPointsAnimation
    };
};

window.useLoyaltyAnimation = useLoyaltyAnimation;