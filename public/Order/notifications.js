// SnapTray Notification System
const showSnapTrayNotification = (type, title, message, duration = 5000) => {
    // Create notification container if it doesn't exist
    let notificationContainer = document.getElementById('snaptray-notifications');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'snaptray-notifications';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        document.body.appendChild(notificationContainer);
    }
    
    const notification = document.createElement('div');
    const notificationId = 'notification-' + Date.now();
    notification.id = notificationId;
    
    const typeColors = {
        success: {
            bg: 'linear-gradient(135deg, #FF6B35, #FFC857)',
            border: '#FF6B35',
            icon: '✅'
        },
        error: {
            bg: 'linear-gradient(135deg, #FF4757, #FF6B35)',
            border: '#FF4757',
            icon: '❌'
        },
        info: {
            bg: 'linear-gradient(135deg, #5352ED, #6C5CE7)',
            border: '#5352ED',
            icon: 'ℹ️'
        }
    };
    
    const colors = typeColors[type] || typeColors.info;
    
    notification.innerHTML = `
        <div style="
            background: ${colors.bg};
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(255, 107, 53, 0.3);
            margin-bottom: 12px;
            min-width: 320px;
            max-width: 400px;
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            border-left: 4px solid ${colors.border};
            position: relative;
            overflow: hidden;
        ">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="font-size: 20px; flex-shrink: 0; margin-top: 2px;">
                    ${colors.icon}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">
                        ${title}
                    </div>
                    <div style="font-size: 14px; opacity: 0.95; line-height: 1.4;">
                        ${message}
                    </div>
                </div>
                <button onclick="dismissNotification('${notificationId}')" style="
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: bold;
                    flex-shrink: 0;
                ">×</button>
            </div>
            <div style="
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(255, 255, 255, 0.3);
                width: 100%;
                animation: notificationProgress ${duration}ms linear forwards;
            "></div>
        </div>
    `;
    
    // Add animation keyframes if not already added
    if (!document.getElementById('snaptray-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'snaptray-notification-styles';
        style.textContent = `
            @keyframes notificationProgress {
                from { transform: scaleX(1); }
                to { transform: scaleX(0); }
            }
        `;
        document.head.appendChild(style);
    }
    
    notificationContainer.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.querySelector('div').style.transform = 'translateX(0)';
    }, 100);
    
    // Auto dismiss
    setTimeout(() => {
        dismissNotification(notificationId);
    }, duration);
};

const dismissNotification = (notificationId) => {
    const notification = document.getElementById(notificationId);
    if (notification) {
        const content = notification.querySelector('div');
        content.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
};

// Make it globally available
window.showSnapTrayNotification = showSnapTrayNotification;
window.dismissNotification = dismissNotification;