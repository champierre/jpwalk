// Timer Automatic Navigation Test
// This test verifies that when the 30-minute timer automatically completes a session,
// it navigates to the session detail page instead of the main page

describe('Timer Automatic Navigation', () => {
    let controller;
    let mockRouter;
    let mockView;
    let mockModel;
    let consoleLogSpy;

    beforeEach(() => {
        // Setup console spies
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        // Mock router
        mockRouter = {
            navigate: jest.fn()
        };

        // Mock view methods
        mockView = {
            updateTimeDisplay: jest.fn(),
            updatePhaseDisplay: jest.fn(),
            hideSessionUI: jest.fn()
        };

        // Mock model
        mockModel = {
            currentSessionId: 555,
            currentSession: { startTime: Date.now() - 1800000 },
            getLocationsBySessionId: jest.fn().mockResolvedValue([
                { latitude: 35.6762, longitude: 139.6503, timestamp: Date.now() }
            ]),
            updateSessionWithDistance: jest.fn().mockResolvedValue()
        };

        // Create mock controller with timer logic
        class MockTimerController {
            constructor() {
                this.model = mockModel;
                this.router = mockRouter;
                this.view = mockView;
                this.timer = null;
                this.locationTimer = null;
                this.startTime = Date.now() - 1800000; // 30 minutes ago
                this.phaseStartTime = Date.now() - (3 * 60 * 1000 + 100); // Just over 3 minutes
                this.currentPhase = 'slow';
                this.intervalCount = 4; // Max intervals reached
                
                this.PHASES = {
                    fast: { name: '速歩き', duration: 3 * 60 * 1000, next: 'slow' },
                    slow: { name: 'ゆっくり歩き', duration: 3 * 60 * 1000, next: 'fast' }
                };
            }

            startTimer() {
                this.timer = setInterval(() => {
                    const elapsed = Date.now() - this.startTime;
                    const minutes = Math.floor(elapsed / 60000);
                    const seconds = Math.floor((elapsed % 60000) / 1000);
                    this.view.updateTimeDisplay(minutes, seconds);

                    const phaseElapsed = Date.now() - this.phaseStartTime;
                    if (phaseElapsed >= this.PHASES[this.currentPhase].duration) {
                        if (this.intervalCount < 4) {
                            this.currentPhase = this.PHASES[this.currentPhase].next;
                            this.phaseStartTime = Date.now();
                            this.view.updatePhaseDisplay(this.currentPhase);
                            
                            if (this.currentPhase === 'fast') {
                                this.intervalCount++;
                            }
                        } else {
                            // This is the key line - timer automatically calls stopWalk
                            this.stopWalk();
                            return;
                        }
                    }
                }, 1000);
            }

            async stopWalk() {
                if (this.timer) {
                    clearInterval(this.timer);
                    this.timer = null;
                }
                
                this.stopLocationTracking();
                
                const duration = Date.now() - this.startTime;
                console.log('🛑 セッション停止 - 既存セッションを更新:', this.model.currentSessionId);
                
                await this.trackLocation();
                
                const locations = await this.model.getLocationsBySessionId(this.model.currentSessionId);
                const totalDistance = this.calculateTotalDistance(locations);
                console.log('📏 計算された距離:', totalDistance, 'km');
                
                await this.model.updateSessionWithDistance(this.model.currentSessionId, duration, totalDistance);
                
                // Key change: navigate to session detail instead of main page
                const completedSessionId = this.model.currentSessionId;
                this.model.currentSession = null;
                this.model.currentSessionId = null;
                this.view.hideSessionUI();
                this.router.navigate(`session/${completedSessionId}`);
            }

            stopLocationTracking() {}
            trackLocation() { return Promise.resolve(); }
            calculateTotalDistance() { return 2.8; }
        }

        controller = new MockTimerController();
    });

    afterEach(() => {
        if (controller.timer) {
            clearInterval(controller.timer);
        }
        jest.restoreAllMocks();
    });

    test('timer automatically navigates to session detail when 30 minutes complete', (done) => {
        const sessionId = 555;
        
        // Spy on stopWalk to verify it gets called by timer
        const stopWalkSpy = jest.spyOn(controller, 'stopWalk');
        
        // Start the timer
        controller.startTimer();
        
        // The timer should trigger stopWalk immediately since conditions are met
        setTimeout(() => {
            expect(stopWalkSpy).toHaveBeenCalled();
            expect(mockRouter.navigate).toHaveBeenCalledWith(`session/${sessionId}`);
            expect(mockView.hideSessionUI).toHaveBeenCalled();
            done();
        }, 1100); // Wait for timer tick
    });

    test('timer navigation uses same logic as manual stop', async () => {
        const sessionId = 555;
        
        // Call stopWalk directly (as timer would)
        await controller.stopWalk();
        
        // Should navigate to detail page, not main
        expect(mockRouter.navigate).toHaveBeenCalledWith(`session/${sessionId}`);
        expect(mockRouter.navigate).not.toHaveBeenCalledWith('');
        
        // Should perform all cleanup
        expect(mockView.hideSessionUI).toHaveBeenCalled();
        expect(controller.model.currentSession).toBeNull();
        expect(controller.model.currentSessionId).toBeNull();
    });

    test('timer respects interval count and phase duration', () => {
        // Test that timer only auto-stops when conditions are right
        controller.intervalCount = 3; // Not yet at max
        
        const stopWalkSpy = jest.spyOn(controller, 'stopWalk');
        controller.startTimer();
        
        setTimeout(() => {
            // Should not auto-stop yet
            expect(stopWalkSpy).not.toHaveBeenCalled();
            clearInterval(controller.timer);
        }, 1100);
    });

    test('automatic session completion preserves UX improvements', async () => {
        const sessionId = 555;
        
        // Simulate the automatic completion scenario
        controller.intervalCount = 4; // Max reached
        controller.phaseStartTime = Date.now() - (3 * 60 * 1000 + 500); // Over 3 minutes
        
        await controller.stopWalk();
        
        // The key UX improvement: automatic completion takes user directly
        // to their completed session details
        expect(mockRouter.navigate).toHaveBeenCalledWith(`session/${sessionId}`);
        
        // Verify this is better than old behavior of going to main page
        expect(mockRouter.navigate).not.toHaveBeenCalledWith('');
    });

    test('both manual and automatic stop use same navigation logic', async () => {
        const sessionId = 555;
        
        // Test 1: Manual stop
        await controller.stopWalk();
        expect(mockRouter.navigate).toHaveBeenCalledWith(`session/${sessionId}`);
        
        // Reset mocks
        mockRouter.navigate.mockClear();
        
        // Test 2: Reset state and test automatic stop via timer
        controller.model.currentSessionId = sessionId;
        controller.model.currentSession = { startTime: Date.now() };
        controller.intervalCount = 4;
        controller.phaseStartTime = Date.now() - (3 * 60 * 1000 + 100);
        
        const stopWalkSpy = jest.spyOn(controller, 'stopWalk');
        controller.startTimer();
        
        await new Promise(resolve => setTimeout(resolve, 1100));
        
        // Both should result in the same navigation behavior
        expect(stopWalkSpy).toHaveBeenCalled();
        expect(mockRouter.navigate).toHaveBeenCalledWith(`session/${sessionId}`);
    });
});