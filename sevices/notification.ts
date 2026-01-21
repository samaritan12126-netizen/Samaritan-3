
import { audio } from './audio';

export const notificationService = {
    
    // Request Permission for Browser Notifications
    async requestPermission() {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') return true;
        const result = await Notification.requestPermission();
        return result === 'granted';
    },

    // Send Broadcast
    async send(title: string, message: string, type: 'INFO' | 'SUCCESS' | 'ALERT' = 'INFO') {
        
        // 1. PLAY AUDIO
        if (type === 'ALERT' || type === 'SUCCESS') audio.play(type === 'ALERT' ? 'SCAN' : 'SUCCESS');

        // 2. BROWSER NOTIFICATION
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
            new Notification(`THE SAMARITAN: ${title}`, {
                body: message,
                icon: 'https://cdn-icons-png.flaticon.com/512/2643/2643642.png', // Fallback icon
                tag: 'samaritan-alert'
            });
        }

        // 3. TELEGRAM UPLINK
        const botToken = localStorage.getItem('telegram_bot_token');
        const chatId = localStorage.getItem('telegram_chat_id');

        if (botToken && chatId) {
            try {
                // Format message for Telegram
                const tgMessage = `<b>[${type}] ${title}</b>\n${message}`;
                
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: tgMessage,
                        parse_mode: 'HTML'
                    })
                });
            } catch (e) {
                console.error("Telegram Uplink Failed:", e);
            }
        }
    }
};
