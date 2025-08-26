/**
 * セッションリスト・詳細の距離表示一貫性テスト
 * Tests for consistent distance display between session lists and details
 * 
 * This test specifically targets the fixes made in PR #11 where distance
 * calculation was added to loadSessions() and loadAllSessions() methods
 */

// Mock dependencies
class MockModel {
    constructor() {
        this.sessions = [];
        this.locations = {};
    }

    async getRecentSessions(limit) {
        return this.sessions.slice(0, limit);
    }

    async getAllSessions(page, pageSize) {
        const start = (page - 1) * pageSize;
        const sessions = this.sessions.slice(start, start + pageSize);
        return { sessions, totalCount: this.sessions.length };
    }

    async getAllSessionsCount() {
        return this.sessions.length;
    }

    async getLocationsBySessionId(sessionId) {
        return this.locations[sessionId] || [];
    }

    // Helper methods for test setup
    addSession(session) {
        this.sessions.push(session);
    }

    addLocations(sessionId, locations) {
        this.locations[sessionId] = locations;
    }
}

class MockView {
    constructor() {
        this.sessionElements = [];
        this.allSessionElements = [];
    }

    clearSessionLists() {
        this.sessionElements = [];
        this.allSessionElements = [];
    }

    addSessionToDOM(session) {
        const element = { sessionData: session };
        this.sessionElements.push(element);
        return element;
    }

    addSessionToAllSessionsDOM(session) {
        const element = { sessionData: session };
        this.allSessionElements.push(element);
        return element;
    }

    showMoreSessionsButton() {}
    updatePaginationControls() {}
}

// Test implementation of the controller with distance calculation methods
class TestWalkingController {
    constructor() {
        this.model = new MockModel();
        this.view = new MockView();
    }

    // Copy of the distance calculation methods from the main controller
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    calculateTotalDistance(locations) {
        if (!locations || locations.length < 2) return 0;
        
        let total = 0;
        for (let i = 1; i < locations.length; i++) {
            total += this.calculateDistance(
                locations[i-1].latitude, locations[i-1].longitude,
                locations[i].latitude, locations[i].longitude
            );
        }
        return total;
    }

    toRad(value) {
        return value * Math.PI / 180;
    }

    // Implementation of the fixed loadSessions method
    async loadSessions() {
        try {
            const sessions = await this.model.getRecentSessions(3);
            const allSessionsCount = await this.model.getAllSessionsCount();
            this.view.clearSessionLists();
            
            // Mock DOM element
            const sessionList = { innerHTML: '', appendChild: () => {} };
            
            if (sessions.length === 0) {
                sessionList.innerHTML = '<p class="text-gray-500 text-sm">まだセッションがありません</p>';
                return;
            }

            // Recalculate distance for each session from location data (PR #11 fix)
            for (const session of sessions) {
                const locations = await this.model.getLocationsBySessionId(session.id);
                if (locations && locations.length > 0) {
                    const calculatedDistance = this.calculateTotalDistance(locations);
                    session.calculatedDistance = calculatedDistance;
                    // Update the session.distance field to ensure consistency
                    session.distance = calculatedDistance;
                }
                sessionList.appendChild = () => this.view.addSessionToDOM(session);
                sessionList.appendChild();
            }

            return sessions; // Return for testing
        } catch (error) {
            console.error('セッション読み込みエラー:', error);
            throw error;
        }
    }

    // Implementation of the fixed loadAllSessions method
    async loadAllSessions(page = 1) {
        try {
            const { sessions, totalCount } = await this.model.getAllSessions(page, 10);
            
            // Mock DOM element
            const allSessionsList = { innerHTML: '', appendChild: () => {} };
            
            if (sessions.length === 0) {
                allSessionsList.innerHTML = '<p class="text-gray-500 text-sm">まだセッションがありません</p>';
                this.view.updatePaginationControls(1, 1, 0);
                return sessions;
            }

            // Recalculate distance for each session from location data (PR #11 fix)
            for (const session of sessions) {
                const locations = await this.model.getLocationsBySessionId(session.id);
                if (locations && locations.length > 0) {
                    const calculatedDistance = this.calculateTotalDistance(locations);
                    session.calculatedDistance = calculatedDistance;
                    // Update the session.distance field to ensure consistency
                    session.distance = calculatedDistance;
                }
                allSessionsList.appendChild = () => this.view.addSessionToAllSessionsDOM(session);
                allSessionsList.appendChild();
            }

            const totalPages = Math.ceil(totalCount / 10);
            this.view.updatePaginationControls(page, totalPages, totalCount);
            return sessions; // Return for testing
        } catch (error) {
            console.error('全セッション読み込みエラー:', error);
            throw error;
        }
    }
}

describe('Session Distance Consistency (PR #11 Fix)', () => {
    let controller;
    
    beforeEach(() => {
        controller = new TestWalkingController();
    });

    describe('loadSessions - Distance Recalculation', () => {
        test('セッションリストで距離が正しく再計算される', async () => {
            // Setup test data
            const sessionWithStoredDistance = {
                id: 1,
                date: '2024-01-01',
                duration: 1800000,
                distance: 0.5 // Stored distance (potentially incorrect)
            };

            const locationData = [
                { latitude: 35.6812, longitude: 139.7671, timestamp: Date.now() },
                { latitude: 35.6820, longitude: 139.7680, timestamp: Date.now() + 60000 },
                { latitude: 35.6830, longitude: 139.7690, timestamp: Date.now() + 120000 }
            ];

            controller.model.addSession(sessionWithStoredDistance);
            controller.model.addLocations(1, locationData);

            // Execute the method
            const sessions = await controller.loadSessions();

            // Verify distance was recalculated
            expect(sessions).toHaveLength(1);
            expect(sessions[0].distance).not.toBe(0.5); // Should be recalculated
            expect(sessions[0].calculatedDistance).toBeGreaterThan(0);
            expect(sessions[0].distance).toBe(sessions[0].calculatedDistance);
        });

        test('位置データがない場合のセッションリスト処理', async () => {
            const sessionWithoutLocations = {
                id: 2,
                date: '2024-01-02',
                duration: 1800000,
                distance: 1.0
            };

            controller.model.addSession(sessionWithoutLocations);
            // No location data added

            const sessions = await controller.loadSessions();

            expect(sessions).toHaveLength(1);
            expect(sessions[0].distance).toBe(1.0); // Original distance preserved
            expect(sessions[0].calculatedDistance).toBeUndefined();
        });

        test('複数セッションの距離一貫性', async () => {
            // Setup multiple sessions with different scenarios
            const sessions = [
                { id: 1, date: '2024-01-01', duration: 1800000, distance: 0.5 },
                { id: 2, date: '2024-01-02', duration: 1800000, distance: 0.8 },
                { id: 3, date: '2024-01-03', duration: 1800000, distance: 1.2 }
            ];

            sessions.forEach(s => controller.model.addSession(s));

            // Add location data only for first two sessions
            controller.model.addLocations(1, [
                { latitude: 35.6812, longitude: 139.7671, timestamp: Date.now() },
                { latitude: 35.6830, longitude: 139.7690, timestamp: Date.now() + 60000 }
            ]);
            controller.model.addLocations(2, [
                { latitude: 35.6812, longitude: 139.7671, timestamp: Date.now() },
                { latitude: 35.6850, longitude: 139.7710, timestamp: Date.now() + 60000 }
            ]);

            const loadedSessions = await controller.loadSessions();

            expect(loadedSessions).toHaveLength(3);
            // First two should have recalculated distances
            expect(loadedSessions[0].calculatedDistance).toBeGreaterThan(0);
            expect(loadedSessions[1].calculatedDistance).toBeGreaterThan(0);
            // Third should preserve original distance
            expect(loadedSessions[2].distance).toBe(1.2);
            expect(loadedSessions[2].calculatedDistance).toBeUndefined();
        });
    });

    describe('loadAllSessions - Distance Recalculation', () => {
        test('全セッションリストで距離が正しく再計算される', async () => {
            const sessionsData = [
                { id: 1, date: '2024-01-01', duration: 1800000, distance: 0.5 },
                { id: 2, date: '2024-01-02', duration: 1800000, distance: 0.7 },
                { id: 3, date: '2024-01-03', duration: 1800000, distance: 0.9 }
            ];

            sessionsData.forEach(s => controller.model.addSession(s));

            // Add location data for all sessions
            sessionsData.forEach((s, index) => {
                const baseDistance = (index + 1) * 0.01; // Vary distances slightly
                controller.model.addLocations(s.id, [
                    { latitude: 35.6812, longitude: 139.7671, timestamp: Date.now() },
                    { latitude: 35.6812 + baseDistance, longitude: 139.7671 + baseDistance, timestamp: Date.now() + 60000 }
                ]);
            });

            const sessions = await controller.loadAllSessions(1);

            expect(sessions).toHaveLength(3);
            sessions.forEach(session => {
                expect(session.calculatedDistance).toBeGreaterThan(0);
                expect(session.distance).toBe(session.calculatedDistance);
                expect(session.distance).not.toBe(session.id === 1 ? 0.5 : session.id === 2 ? 0.7 : 0.9);
            });
        });

        test('ページネーション機能での距離一貫性', async () => {
            // Create 15 sessions (more than one page)
            for (let i = 1; i <= 15; i++) {
                controller.model.addSession({
                    id: i,
                    date: `2024-01-${i.toString().padStart(2, '0')}`,
                    duration: 1800000,
                    distance: i * 0.1
                });

                controller.model.addLocations(i, [
                    { latitude: 35.6812, longitude: 139.7671, timestamp: Date.now() },
                    { latitude: 35.6812 + i * 0.001, longitude: 139.7671 + i * 0.001, timestamp: Date.now() + 60000 }
                ]);
            }

            // Test first page
            const firstPageSessions = await controller.loadAllSessions(1);
            expect(firstPageSessions).toHaveLength(10);

            // Test second page
            const secondPageSessions = await controller.loadAllSessions(2);
            expect(secondPageSessions).toHaveLength(5);

            // All sessions should have consistent distance calculation
            [...firstPageSessions, ...secondPageSessions].forEach(session => {
                expect(session.calculatedDistance).toBeGreaterThan(0);
                expect(session.distance).toBe(session.calculatedDistance);
            });
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('データベースエラー時の適切な処理', async () => {
            // Mock a database error
            controller.model.getRecentSessions = jest.fn().mockRejectedValue(new Error('Database error'));

            await expect(controller.loadSessions()).rejects.toThrow('Database error');
        });

        test('位置データ取得エラー時の処理', async () => {
            const session = { id: 1, date: '2024-01-01', duration: 1800000, distance: 1.0 };
            controller.model.addSession(session);

            // Mock location fetch error
            controller.model.getLocationsBySessionId = jest.fn().mockRejectedValue(new Error('Location fetch error'));

            await expect(controller.loadSessions()).rejects.toThrow('Location fetch error');
        });

        test('不正な位置データでの距離計算', async () => {
            const session = { id: 1, date: '2024-01-01', duration: 1800000, distance: 1.0 };
            controller.model.addSession(session);

            // Add invalid location data
            controller.model.addLocations(1, [
                { latitude: NaN, longitude: 139.7671, timestamp: Date.now() },
                { latitude: 35.6820, longitude: NaN, timestamp: Date.now() + 60000 }
            ]);

            const sessions = await controller.loadSessions();

            expect(sessions).toHaveLength(1);
            expect(sessions[0].calculatedDistance).toBeNaN();
            expect(sessions[0].distance).toBeNaN();
        });

        test('空の位置データ配列での処理', async () => {
            const session = { id: 1, date: '2024-01-01', duration: 1800000, distance: 1.0 };
            controller.model.addSession(session);
            controller.model.addLocations(1, []);

            const sessions = await controller.loadSessions();

            expect(sessions).toHaveLength(1);
            expect(sessions[0].distance).toBe(1.0); // Original distance preserved
            expect(sessions[0].calculatedDistance).toBeUndefined();
        });

        test('単一地点の位置データでの処理', async () => {
            const session = { id: 1, date: '2024-01-01', duration: 1800000, distance: 1.0 };
            controller.model.addSession(session);
            controller.model.addLocations(1, [
                { latitude: 35.6812, longitude: 139.7671, timestamp: Date.now() }
            ]);

            const sessions = await controller.loadSessions();

            expect(sessions).toHaveLength(1);
            expect(sessions[0].calculatedDistance).toBe(0);
            expect(sessions[0].distance).toBe(0);
        });
    });

    describe('Performance Considerations', () => {
        test('大量セッションでの処理時間', async () => {
            // Create 100 sessions to test performance
            const startTime = performance.now();
            
            for (let i = 1; i <= 100; i++) {
                controller.model.addSession({
                    id: i,
                    date: `2024-01-01`,
                    duration: 1800000,
                    distance: 1.0
                });
                
                controller.model.addLocations(i, [
                    { latitude: 35.6812, longitude: 139.7671, timestamp: Date.now() },
                    { latitude: 35.6812 + i * 0.0001, longitude: 139.7671 + i * 0.0001, timestamp: Date.now() + 60000 }
                ]);
            }

            await controller.loadAllSessions(1);
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            // Should complete within reasonable time (adjust threshold as needed)
            expect(executionTime).toBeLessThan(1000); // 1 second
        });

        test('距離計算の精度確認', async () => {
            const session = { id: 1, date: '2024-01-01', duration: 1800000, distance: 0 };
            controller.model.addSession(session);

            // Known distance: Tokyo Station to Shinjuku Station (~7km)
            controller.model.addLocations(1, [
                { latitude: 35.6812, longitude: 139.7671, timestamp: Date.now() },     // Tokyo Station
                { latitude: 35.6896, longitude: 139.7006, timestamp: Date.now() + 60000 }  // Shinjuku Station
            ]);

            const sessions = await controller.loadSessions();

            expect(sessions[0].calculatedDistance).toBeGreaterThan(6);
            expect(sessions[0].calculatedDistance).toBeLessThan(8);
        });
    });
});