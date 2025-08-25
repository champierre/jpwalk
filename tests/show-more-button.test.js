// Show More Button Display Logic Test
// This test verifies that "Show more" button is only displayed when there are more than 3 sessions

describe('Show More Button Display Logic', () => {
    let mockWorker;
    let consoleLogSpy;

    beforeEach(() => {
        // Setup DOM with session list structure
        document.body.innerHTML = `
            <div id="sessionList" class="space-y-3"></div>
            <div id="allSessionsList" class="space-y-3"></div>
        `;

        // Mock console methods
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});

        // Mock Worker
        mockWorker = {
            postMessage: jest.fn(),
            terminate: jest.fn()
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should NOT show "Show more" button when total sessions are 3 or less', async () => {
        const mockRecentSessions = [
            { id: 1, duration: 1800, distance: 2.5, created_at: '2025-08-24T10:00:00.000Z' },
            { id: 2, duration: 1800, distance: 2.3, created_at: '2025-08-24T09:00:00.000Z' },
            { id: 3, duration: 1800, distance: 2.1, created_at: '2025-08-24T08:00:00.000Z' }
        ];

        class MockWalkingModel {
            constructor() {
                this.worker = mockWorker;
            }

            async getRecentSessions(limit) {
                return mockRecentSessions.slice(0, limit);
            }

            async getAllSessionsCount() {
                return 3; // Total of 3 sessions
            }
        }

        class MockWalkingView {
            clearSessionLists() {
                document.getElementById('sessionList').innerHTML = '';
                document.getElementById('allSessionsList').innerHTML = '';
            }

            addSessionToDOM(session) {
                const div = document.createElement('div');
                div.className = 'session-item';
                div.textContent = `Session ${session.id}`;
                return div;
            }

            showMoreSessionsButton() {
                const sessionList = document.getElementById('sessionList');
                const moreButton = document.createElement('div');
                moreButton.className = 'text-center pt-3';
                moreButton.innerHTML = `
                    <button id="moreSessionsBtn" class="text-blue-500 hover:text-blue-600 text-sm font-medium">
                        もっと見る
                    </button>
                `;
                sessionList.appendChild(moreButton);
            }
        }

        class MockController {
            constructor() {
                this.model = new MockWalkingModel();
                this.view = new MockWalkingView();
            }

            async loadSessions() {
                try {
                    const sessions = await this.model.getRecentSessions(3);
                    const allSessionsCount = await this.model.getAllSessionsCount();
                    this.view.clearSessionLists();
                    
                    const sessionList = document.getElementById('sessionList');
                    
                    if (sessions.length === 0) {
                        sessionList.innerHTML = '<p class="text-gray-500 text-sm">まだセッションがありません</p>';
                        return;
                    }

                    sessions.forEach(session => {
                        sessionList.appendChild(this.view.addSessionToDOM(session));
                    });

                    // Show "more" button only if there are more than 3 sessions total
                    if (allSessionsCount > 3) {
                        this.view.showMoreSessionsButton();
                    }
                } catch (error) {
                    console.error('セッション読み込みエラー:', error);
                }
            }
        }

        const controller = new MockController();
        await controller.loadSessions();

        // Verify that sessions are displayed
        const sessionItems = document.querySelectorAll('.session-item');
        expect(sessionItems).toHaveLength(3);

        // Verify that "Show more" button is NOT displayed
        const moreButton = document.getElementById('moreSessionsBtn');
        expect(moreButton).toBeNull();
    });

    test('should show "Show more" button when total sessions are more than 3', async () => {
        const mockRecentSessions = [
            { id: 1, duration: 1800, distance: 2.5, created_at: '2025-08-24T10:00:00.000Z' },
            { id: 2, duration: 1800, distance: 2.3, created_at: '2025-08-24T09:00:00.000Z' },
            { id: 3, duration: 1800, distance: 2.1, created_at: '2025-08-24T08:00:00.000Z' }
        ];

        class MockWalkingModel {
            constructor() {
                this.worker = mockWorker;
            }

            async getRecentSessions(limit) {
                return mockRecentSessions.slice(0, limit);
            }

            async getAllSessionsCount() {
                return 5; // Total of 5 sessions (more than 3)
            }
        }

        class MockWalkingView {
            clearSessionLists() {
                document.getElementById('sessionList').innerHTML = '';
                document.getElementById('allSessionsList').innerHTML = '';
            }

            addSessionToDOM(session) {
                const div = document.createElement('div');
                div.className = 'session-item';
                div.textContent = `Session ${session.id}`;
                return div;
            }

            showMoreSessionsButton() {
                const sessionList = document.getElementById('sessionList');
                const moreButton = document.createElement('div');
                moreButton.className = 'text-center pt-3';
                moreButton.innerHTML = `
                    <button id="moreSessionsBtn" class="text-blue-500 hover:text-blue-600 text-sm font-medium">
                        もっと見る
                    </button>
                `;
                sessionList.appendChild(moreButton);
            }
        }

        class MockController {
            constructor() {
                this.model = new MockWalkingModel();
                this.view = new MockWalkingView();
            }

            async loadSessions() {
                try {
                    const sessions = await this.model.getRecentSessions(3);
                    const allSessionsCount = await this.model.getAllSessionsCount();
                    this.view.clearSessionLists();
                    
                    const sessionList = document.getElementById('sessionList');
                    
                    if (sessions.length === 0) {
                        sessionList.innerHTML = '<p class="text-gray-500 text-sm">まだセッションがありません</p>';
                        return;
                    }

                    sessions.forEach(session => {
                        sessionList.appendChild(this.view.addSessionToDOM(session));
                    });

                    // Show "more" button only if there are more than 3 sessions total
                    if (allSessionsCount > 3) {
                        this.view.showMoreSessionsButton();
                    }
                } catch (error) {
                    console.error('セッション読み込みエラー:', error);
                }
            }
        }

        const controller = new MockController();
        await controller.loadSessions();

        // Verify that sessions are displayed
        const sessionItems = document.querySelectorAll('.session-item');
        expect(sessionItems).toHaveLength(3);

        // Verify that "Show more" button IS displayed
        const moreButton = document.getElementById('moreSessionsBtn');
        expect(moreButton).not.toBeNull();
        expect(moreButton.textContent.trim()).toBe('もっと見る');
    });

    test('should not show "Show more" button when there are no sessions', async () => {
        class MockWalkingModel {
            constructor() {
                this.worker = mockWorker;
            }

            async getRecentSessions(limit) {
                return [];
            }

            async getAllSessionsCount() {
                return 0;
            }
        }

        class MockWalkingView {
            clearSessionLists() {
                document.getElementById('sessionList').innerHTML = '';
                document.getElementById('allSessionsList').innerHTML = '';
            }

            addSessionToDOM(session) {
                const div = document.createElement('div');
                div.className = 'session-item';
                div.textContent = `Session ${session.id}`;
                return div;
            }

            showMoreSessionsButton() {
                const sessionList = document.getElementById('sessionList');
                const moreButton = document.createElement('div');
                moreButton.className = 'text-center pt-3';
                moreButton.innerHTML = `
                    <button id="moreSessionsBtn" class="text-blue-500 hover:text-blue-600 text-sm font-medium">
                        もっと見る
                    </button>
                `;
                sessionList.appendChild(moreButton);
            }
        }

        class MockController {
            constructor() {
                this.model = new MockWalkingModel();
                this.view = new MockWalkingView();
            }

            async loadSessions() {
                try {
                    const sessions = await this.model.getRecentSessions(3);
                    const allSessionsCount = await this.model.getAllSessionsCount();
                    this.view.clearSessionLists();
                    
                    const sessionList = document.getElementById('sessionList');
                    
                    if (sessions.length === 0) {
                        sessionList.innerHTML = '<p class="text-gray-500 text-sm">まだセッションがありません</p>';
                        return;
                    }

                    sessions.forEach(session => {
                        sessionList.appendChild(this.view.addSessionToDOM(session));
                    });

                    // Show "more" button only if there are more than 3 sessions total
                    if (allSessionsCount > 3) {
                        this.view.showMoreSessionsButton();
                    }
                } catch (error) {
                    console.error('セッション読み込みエラー:', error);
                }
            }
        }

        const controller = new MockController();
        await controller.loadSessions();

        // Verify that "no sessions" message is displayed
        const sessionList = document.getElementById('sessionList');
        expect(sessionList.textContent).toContain('まだセッションがありません');

        // Verify that "Show more" button is NOT displayed
        const moreButton = document.getElementById('moreSessionsBtn');
        expect(moreButton).toBeNull();
    });

    test('edge case: exactly 3 sessions should not show "Show more" button', async () => {
        const mockRecentSessions = [
            { id: 1, duration: 1800, distance: 2.5, created_at: '2025-08-24T10:00:00.000Z' },
            { id: 2, duration: 1800, distance: 2.3, created_at: '2025-08-24T09:00:00.000Z' },
            { id: 3, duration: 1800, distance: 2.1, created_at: '2025-08-24T08:00:00.000Z' }
        ];

        class MockWalkingModel {
            constructor() {
                this.worker = mockWorker;
            }

            async getRecentSessions(limit) {
                return mockRecentSessions.slice(0, limit);
            }

            async getAllSessionsCount() {
                return 3; // Exactly 3 sessions
            }
        }

        class MockWalkingView {
            clearSessionLists() {
                document.getElementById('sessionList').innerHTML = '';
                document.getElementById('allSessionsList').innerHTML = '';
            }

            addSessionToDOM(session) {
                const div = document.createElement('div');
                div.className = 'session-item';
                div.textContent = `Session ${session.id}`;
                return div;
            }

            showMoreSessionsButton() {
                const sessionList = document.getElementById('sessionList');
                const moreButton = document.createElement('div');
                moreButton.className = 'text-center pt-3';
                moreButton.innerHTML = `
                    <button id="moreSessionsBtn" class="text-blue-500 hover:text-blue-600 text-sm font-medium">
                        もっと見る
                    </button>
                `;
                sessionList.appendChild(moreButton);
            }
        }

        class MockController {
            constructor() {
                this.model = new MockWalkingModel();
                this.view = new MockWalkingView();
            }

            async loadSessions() {
                try {
                    const sessions = await this.model.getRecentSessions(3);
                    const allSessionsCount = await this.model.getAllSessionsCount();
                    this.view.clearSessionLists();
                    
                    const sessionList = document.getElementById('sessionList');
                    
                    if (sessions.length === 0) {
                        sessionList.innerHTML = '<p class="text-gray-500 text-sm">まだセッションがありません</p>';
                        return;
                    }

                    sessions.forEach(session => {
                        sessionList.appendChild(this.view.addSessionToDOM(session));
                    });

                    // Show "more" button only if there are more than 3 sessions total
                    if (allSessionsCount > 3) {
                        this.view.showMoreSessionsButton();
                    }
                } catch (error) {
                    console.error('セッション読み込みエラー:', error);
                }
            }
        }

        const controller = new MockController();
        await controller.loadSessions();

        // Verify that all 3 sessions are displayed
        const sessionItems = document.querySelectorAll('.session-item');
        expect(sessionItems).toHaveLength(3);

        // Verify that "Show more" button is NOT displayed (edge case: exactly 3)
        const moreButton = document.getElementById('moreSessionsBtn');
        expect(moreButton).toBeNull();
    });
});