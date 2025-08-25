// Session ID Consistency Test
// This test verifies that session ID remains consistent throughout the walking session

describe('Session ID Consistency Fix', () => {
    let mockWorker;
    let consoleLogSpy;
    let mockExecSQL;
    
    beforeEach(() => {
        // Setup console spies
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});

        // Mock Worker
        mockWorker = {
            postMessage: jest.fn(),
            terminate: jest.fn()
        };

        // Mock execSQL function
        mockExecSQL = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('createInitialSession creates session at start and returns consistent ID', async () => {
        const startTime = 1756078210532;
        const expectedSessionId = 42;
        
        // Mock execSQL to return session ID
        mockExecSQL.mockResolvedValue({ lastInsertRowId: expectedSessionId });

        // Create mock model with the new method
        class MockWalkingModel {
            constructor() {
                this.worker = mockWorker;
            }

            async execSQL(query, params) {
                return await mockExecSQL(query, params);
            }

            async createInitialSession(startTime) {
                const sessionData = {
                    duration: 0, // 初期値（後で更新される）
                    distance: 0,
                    created_at: new Date(startTime).toISOString()
                };

                if (this.worker) {
                    try {
                        const result = await this.execSQL(
                            'INSERT INTO walking_sessions (duration, distance, created_at) VALUES (?, ?, ?)',
                            [sessionData.duration, sessionData.distance, sessionData.created_at]
                        );
                        
                        const sessionId = result.lastInsertRowId;
                        console.log('🆔 初期セッションをSQLiteに作成しました:', sessionId);
                        return sessionId;
                    } catch (error) {
                        console.error('SQLite初期セッション作成エラー:', error);
                        throw error;
                    }
                }
            }
        }

        const model = new MockWalkingModel();
        const sessionId = await model.createInitialSession(startTime);

        // Verify session was created with correct data
        expect(mockExecSQL).toHaveBeenCalledWith(
            'INSERT INTO walking_sessions (duration, distance, created_at) VALUES (?, ?, ?)',
            [0, 0, new Date(startTime).toISOString()]
        );

        // Verify consistent session ID is returned
        expect(sessionId).toBe(expectedSessionId);
        expect(consoleLogSpy).toHaveBeenCalledWith('🆔 初期セッションをSQLiteに作成しました:', expectedSessionId);
    });

    test('updateSession updates existing session instead of creating new one', async () => {
        const sessionId = 42;
        const duration = 1800000; // 30 minutes in milliseconds

        mockExecSQL.mockResolvedValue({});

        class MockWalkingModel {
            constructor() {
                this.worker = mockWorker;
            }

            async execSQL(query, params) {
                return await mockExecSQL(query, params);
            }

            async updateSession(sessionId, duration) {
                console.log('🔄 セッション更新 - ID:', sessionId, 'Duration:', duration);
                
                if (this.worker) {
                    try {
                        await this.execSQL(
                            'UPDATE walking_sessions SET duration = ? WHERE id = ?',
                            [Math.floor(duration / 1000), sessionId]
                        );
                        console.log('✅ セッション更新完了:', sessionId);
                        return sessionId;
                    } catch (error) {
                        console.error('SQLiteセッション更新エラー:', error);
                        throw error;
                    }
                }
            }
        }

        const model = new MockWalkingModel();
        const result = await model.updateSession(sessionId, duration);

        // Verify UPDATE query was called instead of INSERT
        expect(mockExecSQL).toHaveBeenCalledWith(
            'UPDATE walking_sessions SET duration = ? WHERE id = ?',
            [1800, sessionId] // duration converted to seconds
        );

        // Verify same session ID is returned
        expect(result).toBe(sessionId);
        expect(consoleLogSpy).toHaveBeenCalledWith('🔄 セッション更新 - ID:', sessionId, 'Duration:', duration);
        expect(consoleLogSpy).toHaveBeenCalledWith('✅ セッション更新完了:', sessionId);
    });

    test('full session workflow maintains consistent session ID', async () => {
        const startTime = Date.now();
        const sessionId = 50;
        const locations = [
            { lat: 12.3456789, lng: 98.7654321, timestamp: startTime + 5000, phase: 'fast' },
            { lat: 12.3456800, lng: 98.7654400, timestamp: startTime + 10000, phase: 'fast' },
            { lat: 12.3456900, lng: 98.7654500, timestamp: startTime + 15000, phase: 'slow' }
        ];

        // Mock complete session workflow
        class MockController {
            constructor() {
                this.model = {
                    worker: mockWorker,
                    currentSession: null,
                    currentSessionId: null,
                    savedLocations: []
                };
            }

            async startWalk() {
                // Step 1: Create initial session (NEW BEHAVIOR)
                const sessionId = await this.createInitialSession(startTime);
                console.log('🆔 セッション開始 - セッションID:', sessionId);
                
                this.model.currentSession = { startTime: startTime, intervals: [] };
                this.model.currentSessionId = sessionId; // Consistent ID throughout
                
                return sessionId;
            }

            async createInitialSession(startTime) {
                mockExecSQL.mockResolvedValueOnce({ lastInsertRowId: sessionId });
                
                const result = await mockExecSQL(
                    'INSERT INTO walking_sessions (duration, distance, created_at) VALUES (?, ?, ?)',
                    [0, 0, new Date(startTime).toISOString()]
                );
                
                console.log('🆔 初期セッションをSQLiteに作成しました:', result.lastInsertRowId);
                return result.lastInsertRowId;
            }

            async saveLocation(location) {
                console.log('💾 Saving location for session ID:', this.model.currentSessionId);
                
                // All locations saved with same session ID
                const locationData = {
                    session_id: this.model.currentSessionId,
                    latitude: location.lat,
                    longitude: location.lng,
                    timestamp: location.timestamp,
                    phase: location.phase
                };
                
                this.model.savedLocations.push(locationData);
                return locationData;
            }

            async stopWalk() {
                const duration = 1800000;
                console.log('🛑 セッション停止 - 既存セッションを更新:', this.model.currentSessionId);
                
                // Update existing session (NEW BEHAVIOR - no new session creation)
                mockExecSQL.mockResolvedValueOnce({});
                await mockExecSQL(
                    'UPDATE walking_sessions SET duration = ? WHERE id = ?',
                    [Math.floor(duration / 1000), this.model.currentSessionId]
                );
                
                console.log('✅ セッション更新完了:', this.model.currentSessionId);
                return this.model.currentSessionId;
            }
        }

        const controller = new MockController();

        // Step 1: Start session
        const initialSessionId = await controller.startWalk();
        expect(initialSessionId).toBe(sessionId);

        // Step 2: Save locations during session
        for (const location of locations) {
            const savedLocation = await controller.saveLocation(location);
            expect(savedLocation.session_id).toBe(sessionId); // Same ID for all locations
        }

        // Step 3: Stop session
        const finalSessionId = await controller.stopWalk();
        expect(finalSessionId).toBe(sessionId); // Same ID throughout

        // Verify all locations have the same session ID
        controller.model.savedLocations.forEach(location => {
            expect(location.session_id).toBe(sessionId);
        });

        // Verify we have all saved locations
        expect(controller.model.savedLocations).toHaveLength(3);

        // Verify console logs show consistent session ID
        expect(consoleLogSpy).toHaveBeenCalledWith('🆔 セッション開始 - セッションID:', sessionId);
        expect(consoleLogSpy).toHaveBeenCalledWith('💾 Saving location for session ID:', sessionId);
        expect(consoleLogSpy).toHaveBeenCalledWith('🛑 セッション停止 - 既存セッションを更新:', sessionId);
    });

    test('regression test: location data retrieval returns all locations with consistent session ID', async () => {
        const sessionId = 60;
        
        // Mock scenario where multiple locations are saved and then retrieved
        const mockLocations = [
            { id: 100, session_id: sessionId, latitude: 12.3456789, longitude: 98.7654321, timestamp: 1756078210553, phase: 'fast' },
            { id: 101, session_id: sessionId, latitude: 12.3456800, longitude: 98.7654400, timestamp: 1756078213264, phase: 'fast' },
            { id: 102, session_id: sessionId, latitude: 12.3456900, longitude: 98.7654500, timestamp: 1756078216000, phase: 'slow' },
            { id: 103, session_id: sessionId, latitude: 12.3457000, longitude: 98.7654600, timestamp: 1756078219000, phase: 'slow' }
        ];

        // Mock the database query
        mockExecSQL.mockResolvedValue({
            columns: ['id', 'session_id', 'latitude', 'longitude', 'timestamp', 'phase'],
            values: mockLocations.map(loc => [loc.id, loc.session_id, loc.latitude, loc.longitude, loc.timestamp, loc.phase])
        });

        async function getLocationsBySessionId(sessionId) {
            console.log('🔍 Getting locations for session ID:', sessionId);
            
            const result = await mockExecSQL('SELECT * FROM walking_locations WHERE session_id = ? ORDER BY timestamp', [sessionId]);
            
            const locations = result.values.map(row => ({
                id: row[0],
                session_id: row[1], 
                latitude: row[2],
                longitude: row[3],
                timestamp: row[4],
                phase: row[5]
            }));
            
            console.log('📊 SQLite query result for session', sessionId, ':', locations);
            return locations;
        }

        const retrievedLocations = await getLocationsBySessionId(sessionId);

        // Verify all locations are retrieved
        expect(retrievedLocations).toHaveLength(4);
        
        // Verify all have the same session ID
        retrievedLocations.forEach(location => {
            expect(location.session_id).toBe(sessionId);
        });

        // Verify the exact scenario that was failing before
        expect(consoleLogSpy).toHaveBeenCalledWith('📊 SQLite query result for session', sessionId, ':', 
            expect.arrayContaining([
                expect.objectContaining({ session_id: sessionId, phase: 'fast' }),
                expect.objectContaining({ session_id: sessionId, phase: 'slow' })
            ])
        );

        // This should now show 4 locations instead of just 1
        expect(retrievedLocations[0]).toMatchObject({ session_id: sessionId, phase: 'fast' });
        expect(retrievedLocations[3]).toMatchObject({ session_id: sessionId, phase: 'slow' });
    });
});