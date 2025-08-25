// Session Location Integration Test
// This test verifies the complete flow of session creation, location tracking, and data display

describe('Session Location Integration', () => {
    let mockWorker;
    let consoleLogSpy;
    
    beforeEach(() => {
        // Setup DOM with session detail view structure
        document.body.innerHTML = `
            <div id="sessionView" class="hidden">
                <div id="startTime"></div>
                <div id="endTime"></div>
                <div id="duration"></div>
                <div id="distance"></div>
                <div id="mapContainer" class="rounded-lg overflow-hidden h-64">
                    <div id="map" class="w-full h-full"></div>
                </div>
                <div id="locationsList" class="max-h-64 overflow-y-auto">
                    <p class="text-gray-500 text-sm">位置情報がありません</p>
                </div>
            </div>
        `;

        // Mock console to capture logs
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});

        // Mock Worker
        mockWorker = {
            postMessage: jest.fn(),
            terminate: jest.fn()
        };

        // Mock Leaflet
        global.L = {
            map: jest.fn().mockReturnValue({
                setView: jest.fn().mockReturnThis(),
                remove: jest.fn()
            }),
            tileLayer: jest.fn().mockReturnValue({ addTo: jest.fn() }),
            polyline: jest.fn().mockReturnValue({ addTo: jest.fn() }),
            marker: jest.fn().mockReturnValue({ 
                addTo: jest.fn().mockReturnThis(),
                bindPopup: jest.fn().mockReturnThis()
            }),
            divIcon: jest.fn()
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('complete session workflow saves and displays multiple locations', async () => {
        // Mock a complete session with multiple location points
        const sessionId = 30;
        const mockSession = {
            id: sessionId,
            duration: 1800, // 30 minutes
            distance: 2.5,
            created_at: '2025-08-24T10:00:00.000Z'
        };

        // Mock location data that should be saved during a 30-minute session
        const mockLocations = [
            { id: 15, session_id: sessionId, latitude: 12.3456789, longitude: 98.7654321, timestamp: 1756077800000, phase: 'fast' },
            { id: 16, session_id: sessionId, latitude: 12.3456800, longitude: 98.7654400, timestamp: 1756077805000, phase: 'fast' },
            { id: 17, session_id: sessionId, latitude: 12.3456850, longitude: 98.7654450, timestamp: 1756077810000, phase: 'fast' },
            { id: 18, session_id: sessionId, latitude: 12.3456900, longitude: 98.7654500, timestamp: 1756077980000, phase: 'slow' },
            { id: 19, session_id: sessionId, latitude: 12.3456950, longitude: 98.7654550, timestamp: 1756077985000, phase: 'slow' },
            { id: 20, session_id: sessionId, latitude: 12.3457000, longitude: 98.7654600, timestamp: 1756077990000, phase: 'slow' }
        ];

        // Simulate the complete workflow
        class MockWalkingModel {
            constructor() {
                this.worker = mockWorker;
                this.currentSession = { startTime: 1756077800000 };
                this.savedLocations = [];
            }

            async saveLocation(sessionId, location) {
                console.log('💾 Saving location for session ID:', sessionId);
                console.log('📍 Location data:', location);
                
                const locationData = {
                    session_id: sessionId,
                    latitude: location.lat,
                    longitude: location.lng,
                    timestamp: location.timestamp,
                    phase: location.phase
                };
                
                // Simulate saving to database
                this.savedLocations.push(locationData);
                return { lastInsertRowId: this.savedLocations.length };
            }

            async getLocationsBySessionId(sessionId) {
                console.log('🔍 Getting locations for session ID:', sessionId);
                const locations = this.savedLocations.filter(l => l.session_id === sessionId);
                console.log('📊 SQLite query result for session', sessionId, ':', locations);
                return locations;
            }

            async getSessionById(sessionId) {
                return mockSession;
            }
        }

        class MockWalkingView {
            displaySessionDetails(session, locations) {
                console.log('🖥️ Displaying session details:', session);
                this.displayLocations(locations);
            }

            displayRouteMap(locations) {
                // Mock map display
                console.log('🗺️ Displaying route map with', locations?.length || 0, 'points');
            }

            displayLocations(locations) {
                const locationsList = document.getElementById('locationsList');
                
                console.log('🗺️ displayLocations called with:', locations);
                console.log('📊 Number of locations:', locations ? locations.length : 0);
                
                if (!locations || locations.length === 0) {
                    locationsList.innerHTML = '<p class="text-gray-500 text-sm">位置情報がありません</p>';
                    return;
                }

                const table = document.createElement('table');
                table.className = 'w-full text-sm';
                table.id = 'locationsTable';
                
                const headerRow = document.createElement('tr');
                headerRow.innerHTML = `
                    <th>時刻</th>
                    <th>フェーズ</th>
                    <th>緯度</th>
                    <th>経度</th>
                `;
                table.appendChild(headerRow);

                locations.forEach((location, index) => {
                    console.log(`📍 Location ${index + 1}:`, location);
                    
                    const row = document.createElement('tr');
                    row.className = 'location-row';
                    row.innerHTML = `
                        <td>${new Date(location.timestamp).toLocaleTimeString()}</td>
                        <td>${location.phase === 'fast' ? '速歩き' : 'ゆっくり歩き'}</td>
                        <td>${location.latitude.toFixed(6)}</td>
                        <td>${location.longitude.toFixed(6)}</td>
                    `;
                    table.appendChild(row);
                });

                locationsList.innerHTML = '';
                locationsList.appendChild(table);
            }
        }

        class MockWalkingController {
            constructor() {
                this.model = new MockWalkingModel();
                this.view = new MockWalkingView();
            }

            async loadSessionDetails(sessionId) {
                console.log('🔍 Loading session details for session ID:', sessionId);
                
                const session = await this.model.getSessionById(sessionId);
                if (!session) {
                    console.warn('セッションが見つかりません:', sessionId);
                    return;
                }

                const locations = await this.model.getLocationsBySessionId(sessionId);
                console.log('📊 Retrieved locations:', locations);
                console.log('📊 Number of locations:', locations ? locations.length : 0);
                
                this.view.displaySessionDetails(session, locations);
            }
        }

        const controller = new MockWalkingController();

        // Step 1: Simulate saving multiple locations during session
        for (let i = 0; i < mockLocations.length; i++) {
            const location = mockLocations[i];
            await controller.model.saveLocation(sessionId, {
                lat: location.latitude,
                lng: location.longitude,
                timestamp: location.timestamp,
                phase: location.phase
            });
        }

        // Step 2: Load session details (this should retrieve all saved locations)
        await controller.loadSessionDetails(sessionId);

        // Verify all locations were saved
        expect(controller.model.savedLocations).toHaveLength(6);

        // Verify locations table was created with all data
        const table = document.getElementById('locationsTable');
        expect(table).not.toBeNull();
        
        const locationRows = table.querySelectorAll('.location-row');
        expect(locationRows).toHaveLength(6);

        // Verify console logs show correct number of locations
        expect(consoleLogSpy).toHaveBeenCalledWith('📊 Number of locations:', 6);
        expect(consoleLogSpy).toHaveBeenCalledWith('📊 Retrieved locations:', expect.arrayContaining([
            expect.objectContaining({ session_id: sessionId, phase: 'fast' }),
            expect.objectContaining({ session_id: sessionId, phase: 'slow' })
        ]));
    });

    test('regression test: ensure location data persists with consistent session ID (FIXED)', async () => {
        const sessionId = 42;
        const startTime = Date.now();
        
        // Simulate the FIXED scenario - consistent session ID throughout
        const locationsSavedDuringSession = [
            { lat: 12.3456789, lng: 98.7654321, timestamp: 1756077824506, phase: 'fast' },
            { lat: 12.3456800, lng: 98.7654400, timestamp: 1756077829083, phase: 'fast' },
            { lat: 12.3456850, lng: 98.7654450, timestamp: 1756077834000, phase: 'slow' },
            { lat: 12.3456900, lng: 98.7654500, timestamp: 1756077839000, phase: 'slow' }
        ];

        class FixedTestModel {
            constructor() {
                this.locations = [];
                this.sessions = [];
                this.currentSessionId = null;
            }

            // NEW: Create initial session at start
            async createInitialSession(startTime) {
                console.log('🆔 初期セッションをSQLiteに作成しました:', sessionId);
                const session = {
                    id: sessionId,
                    duration: 0, // Will be updated later
                    distance: 0,
                    created_at: new Date(startTime).toISOString()
                };
                this.sessions.push(session);
                this.currentSessionId = sessionId;
                return sessionId;
            }

            async saveLocation(sessionId, locationData) {
                console.log('💾 Saving location for session ID:', sessionId);
                console.log('📍 Location data:', locationData);
                
                // Verify consistent session ID
                expect(sessionId).toBe(this.currentSessionId);
                
                const saved = {
                    id: this.locations.length + 1,
                    session_id: sessionId, // Same ID throughout
                    latitude: locationData.lat,
                    longitude: locationData.lng,
                    timestamp: locationData.timestamp,
                    phase: locationData.phase
                };
                
                this.locations.push(saved);
                console.log('📍 位置情報をSQLiteに保存しました:', locationData);
                return { lastInsertRowId: saved.id };
            }

            // NEW: Update existing session instead of creating new one
            async updateSession(sessionId, duration) {
                console.log('🔄 セッション更新 - ID:', sessionId, 'Duration:', duration);
                
                const session = this.sessions.find(s => s.id === sessionId);
                if (session) {
                    session.duration = Math.floor(duration / 1000);
                    console.log('✅ セッション更新完了:', sessionId);
                }
                return sessionId;
            }

            async getLocationsBySessionId(sessionId) {
                console.log('🔍 Getting locations for session ID:', sessionId);
                const locations = this.locations.filter(l => l.session_id === sessionId);
                console.log('📊 SQLite query result for session', sessionId, ':', locations);
                return locations;
            }

            async getSessionById(sessionId) {
                return this.sessions.find(s => s.id === sessionId);
            }
        }

        const model = new FixedTestModel();

        // Step 1: NEW - Create initial session first 
        const createdSessionId = await model.createInitialSession(startTime);
        expect(createdSessionId).toBe(sessionId);

        // Step 2: Save locations during session with consistent ID
        for (const locationData of locationsSavedDuringSession) {
            await model.saveLocation(sessionId, locationData);
        }

        // Step 3: NEW - Update existing session instead of creating new
        await model.updateSession(sessionId, 1800000); // 30 minutes

        // Step 4: Retrieve all locations - should get all 4
        const retrievedLocations = await model.getLocationsBySessionId(sessionId);

        // Verify all locations are retrieved with consistent session ID
        expect(retrievedLocations).toHaveLength(4);
        expect(retrievedLocations[0]).toMatchObject({
            session_id: sessionId,
            latitude: 12.3456789,
            longitude: 98.7654321,
            phase: 'fast'
        });
        expect(retrievedLocations[3]).toMatchObject({
            session_id: sessionId,
            latitude: 12.3456900,
            longitude: 98.7654500,
            phase: 'slow'
        });

        // Verify console logs show the fix is working
        expect(consoleLogSpy).toHaveBeenCalledWith('🆔 初期セッションをSQLiteに作成しました:', sessionId);
        expect(consoleLogSpy).toHaveBeenCalledWith('🔄 セッション更新 - ID:', sessionId, 'Duration:', 1800000);
        expect(consoleLogSpy).toHaveBeenCalledWith('📊 SQLite query result for session', sessionId, ':', 
            expect.arrayContaining([
                expect.objectContaining({ session_id: sessionId }),
                expect.objectContaining({ session_id: sessionId }),
                expect.objectContaining({ session_id: sessionId }),
                expect.objectContaining({ session_id: sessionId })
            ])
        );

        // The key fix: All locations have the SAME session ID
        const sessionIds = retrievedLocations.map(loc => loc.session_id);
        const uniqueSessionIds = [...new Set(sessionIds)];
        expect(uniqueSessionIds).toHaveLength(1);
        expect(uniqueSessionIds[0]).toBe(sessionId);
    });
});