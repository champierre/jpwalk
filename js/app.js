// Main application entry point
import { WalkingController } from './controller.js';

window.walkingController = null;

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('✅ Service Worker registered successfully:', registration.scope);
            })
            .catch((error) => {
                console.log('❌ Service Worker registration failed:', error);
            });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🔧 WalkingControllerを初期化中...');
        window.walkingController = new WalkingController();
        await window.walkingController.init();
        console.log('✅ WalkingController初期化完了');
    } catch (error) {
        console.error('❌ WalkingController初期化エラー:', error);
    }
});