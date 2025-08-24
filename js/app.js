// Main application entry point
import { WalkingController } from './controller.js';

let walkingController;

document.addEventListener('DOMContentLoaded', async () => {
    walkingController = new WalkingController();
    await walkingController.init();
});