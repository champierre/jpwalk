// Main application entry point
import { WalkingController } from './controller.js';

window.walkingController = null;

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