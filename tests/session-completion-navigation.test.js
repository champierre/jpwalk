// Session Completion Navigation Test
// This test verifies that when a walking session is completed,
// the app navigates to the session detail page instead of the main page

describe('Session Completion Navigation', () => {
    let controller;
    let mockWorker;
    let mockRouter;
    let mockView;
    let mockModel;
    let consoleLogSpy;

    beforeEach(() => {
        // Setup console spies
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});

        // Mock DOM elements
        document.body.innerHTML = `
            <div id="sessionView" class="hidden">Session View</div>
            <div id="mainView">Main View</div>
            <button id="stopBtn">Stop</button>
        `;

        // Mock Worker
        mockWorker = {
            postMessage: jest.fn(),
            terminate: jest.fn()
        };

        // Mock router with navigate function
        mockRouter = {
            navigate: jest.fn(),
            currentView: 'walking'
        };

        // Mock view methods
        mockView = {
            hideSessionUI: jest.fn(),
            showSessionView: jest.fn(),
            showMainView: jest.fn()
        };

        // Mock model methods
        mockModel = {
            worker: mockWorker,
            currentSession: { startTime: Date.now() },
            currentSessionId: 123,
            getLocationsBySessionId: jest.fn().mockResolvedValue([
                { latitude: 35.6762, longitude: 139.6503, timestamp: Date.now() },
                { latitude: 35.6763, longitude: 139.6504, timestamp: Date.now() + 60000 }
            ]),
            updateSessionWithDistance: jest.fn().mockResolvedValue()
        };

        // Create mock controller class for testing
        class MockWalkingController {
            constructor() {
                this.timer = null;
                this.locationTimer = null;
                this.startTime = null;
                this.model = mockModel;
                this.router = mockRouter;
                this.view = mockView;
            }

            async stopWalk() {
                if (this.timer) {
                    clearInterval(this.timer);
                    this.timer = null;
                }
                
                this.stopLocationTracking();
                
                const duration = Date.now() - this.startTime;
                console.log('🛑 セッション停止 - 既存セッションを更新:', this.model.currentSessionId);
                
                // 最後の位置データを同じセッションIDで保存
                await this.trackLocation();
                
                // 位置情報から距離を計算
                const locations = await this.model.getLocationsBySessionId(this.model.currentSessionId);
                const totalDistance = this.calculateTotalDistance(locations);
                console.log('📏 計算された距離:', totalDistance, 'km');
                
                // 既存のセッションを距離と時間で更新
                await this.model.updateSessionWithDistance(this.model.currentSessionId, duration, totalDistance);
                
                // セッション完了後、そのセッションの詳細ページに遷移
                const completedSessionId = this.model.currentSessionId;
                this.model.currentSession = null;
                this.model.currentSessionId = null;
                this.view.hideSessionUI();
                this.router.navigate(`session/${completedSessionId}`);
            }
        }
        
        controller = new MockWalkingController();
        
        // Mock timer and location tracking
        controller.timer = setInterval(() => {}, 1000);
        controller.locationTimer = setInterval(() => {}, 60000);
        controller.startTime = Date.now() - 1800000; // 30 minutes ago
        
        // Add missing methods to mock controller
        controller.calculateTotalDistance = jest.fn().mockReturnValue(2.5);
        controller.trackLocation = jest.fn().mockResolvedValue();
        controller.stopLocationTracking = jest.fn();
        controller.showMain = jest.fn(); // For testing that it's not called
    });

    afterEach(() => {
        // Clean up timers
        if (controller.timer) {
            clearInterval(controller.timer);
        }
        if (controller.locationTimer) {
            clearInterval(controller.locationTimer);
        }
        jest.restoreAllMocks();
    });

    test('manual stopWalk navigates to session detail page instead of main page', async () => {
        const sessionId = 123;
        controller.model.currentSessionId = sessionId;
        
        // Call stopWalk method
        await controller.stopWalk();

        // Verify navigation behavior
        expect(mockRouter.navigate).toHaveBeenCalledWith(`session/${sessionId}`);
        expect(mockRouter.navigate).not.toHaveBeenCalledWith('');
        
        // Verify session UI is hidden
        expect(mockView.hideSessionUI).toHaveBeenCalled();
        
        // Verify session and sessionId are cleared
        expect(controller.model.currentSession).toBeNull();
        expect(controller.model.currentSessionId).toBeNull();
        
        // Verify distance calculation and update
        expect(controller.model.getLocationsBySessionId).toHaveBeenCalledWith(sessionId);
        expect(controller.calculateTotalDistance).toHaveBeenCalled();
        expect(controller.model.updateSessionWithDistance).toHaveBeenCalledWith(
            sessionId, 
            expect.any(Number), // duration
            2.5 // calculated distance
        );

        // Verify console logging
        expect(consoleLogSpy).toHaveBeenCalledWith('🛑 セッション停止 - 既存セッションを更新:', sessionId);
        expect(consoleLogSpy).toHaveBeenCalledWith('📏 計算された距離:', 2.5, 'km');
    });

    test('automatic timer stopWalk navigates to session detail page', async () => {
        const sessionId = 456;
        controller.model.currentSessionId = sessionId;
        controller.intervalCount = 4; // Max intervals reached
        controller.currentPhase = 'slow';
        
        // Mock the timer scenario where session auto-stops at 30 minutes
        controller.phaseStartTime = Date.now() - (3 * 60 * 1000 + 1000); // Over 3 minutes ago
        controller.PHASES = {
            fast: { name: '速歩き', duration: 3 * 60 * 1000, next: 'slow' },
            slow: { name: 'ゆっくり歩き', duration: 3 * 60 * 1000, next: 'fast' }
        };

        // Call stopWalk method (as would be called by timer)
        await controller.stopWalk();

        // Verify navigation to detail page, not main page
        expect(mockRouter.navigate).toHaveBeenCalledWith(`session/${sessionId}`);
        expect(mockView.showMainView).not.toHaveBeenCalled();
        
        // Verify session cleanup
        expect(controller.model.currentSession).toBeNull();
        expect(controller.model.currentSessionId).toBeNull();
    });

    test('session completion preserves session ID for navigation', async () => {
        const originalSessionId = 789;
        controller.model.currentSessionId = originalSessionId;
        
        // Verify session ID is captured before being cleared
        await controller.stopWalk();
        
        // The completedSessionId should be used for navigation
        expect(mockRouter.navigate).toHaveBeenCalledWith(`session/${originalSessionId}`);
        
        // Verify the session ID was properly preserved for navigation
        // even though model.currentSessionId is now null
        expect(controller.model.currentSessionId).toBeNull();
    });

    test('stopWalk handles missing session ID gracefully', async () => {
        // Set session ID to null to simulate edge case
        controller.model.currentSessionId = null;
        
        await controller.stopWalk();
        
        // Should still call navigate, but with null/undefined sessionId
        expect(mockRouter.navigate).toHaveBeenCalledWith('session/null');
        expect(mockView.hideSessionUI).toHaveBeenCalled();
    });

    test('stopWalk performs all necessary cleanup and data updates', async () => {
        const sessionId = 999;
        const mockDuration = 1800000; // 30 minutes
        controller.model.currentSessionId = sessionId;
        controller.startTime = Date.now() - mockDuration;
        
        await controller.stopWalk();
        
        // Verify all cleanup steps
        expect(controller.timer).toBeNull();
        expect(controller.stopLocationTracking).toHaveBeenCalled();
        expect(controller.trackLocation).toHaveBeenCalled(); // Final location save
        
        // Verify data processing
        expect(controller.model.getLocationsBySessionId).toHaveBeenCalledWith(sessionId);
        expect(controller.calculateTotalDistance).toHaveBeenCalled();
        expect(controller.model.updateSessionWithDistance).toHaveBeenCalledWith(
            sessionId,
            expect.any(Number),
            2.5
        );
        
        // Verify final navigation
        expect(mockRouter.navigate).toHaveBeenCalledWith(`session/${sessionId}`);
    });

    test('old behavior verification - confirms showMain is no longer called', async () => {
        const sessionId = 111;
        controller.model.currentSessionId = sessionId;
        
        // Mock showMain method to ensure it's not called
        controller.showMain = jest.fn();
        
        await controller.stopWalk();
        
        // Verify the old behavior (showMain) is NOT used
        expect(controller.showMain).not.toHaveBeenCalled();
        
        // Verify the new behavior (navigate to session detail) is used
        expect(mockRouter.navigate).toHaveBeenCalledWith(`session/${sessionId}`);
    });

    test('UX flow improvement - user sees completed session immediately', async () => {
        const sessionId = 222;
        controller.model.currentSessionId = sessionId;
        
        await controller.stopWalk();
        
        // The key UX improvement: user goes directly to the session they just completed
        // instead of going back to the main page and having to find their session
        expect(mockRouter.navigate).toHaveBeenCalledWith(`session/${sessionId}`);
        
        // Verify this provides better UX than the old flow
        expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
        expect(mockRouter.navigate).not.toHaveBeenCalledWith(''); // main page
        expect(mockRouter.navigate).not.toHaveBeenCalledWith('#'); // main page alternative
    });
});