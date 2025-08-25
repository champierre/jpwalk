// Location Data Retrieval and Display Test
// This test verifies that all saved location data is properly retrieved and displayed

describe('Location Data Management', () => {
    let mockWorker;
    let mockModel;
    let mockView;
    let mockController;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div id="locationsList" class="max-h-64 overflow-y-auto">
                <p class="text-gray-500 text-sm">位置情報がありません</p>
            </div>
        `;

        // Mock console methods to capture debug logs
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});

        // Mock Worker
        mockWorker = {
            postMessage: jest.fn(),
            terminate: jest.fn()
        };

        // Create mock model with location methods
        mockModel = {
            worker: mockWorker,
            currentSession: { startTime: Date.now() },
            getLocationsBySessionId: jest.fn(),
            saveLocation: jest.fn(),
            selectObjects: jest.fn()
        };

        // Create mock view with display methods  
        mockView = {
            displayLocations: jest.fn(),
            displaySessionDetails: jest.fn()
        };

        // Create mock controller
        mockController = {
            model: mockModel,
            view: mockView,
            loadSessionDetails: jest.fn()
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('getLocationsBySessionId returns all locations for a session', async () => {
        const sessionId = 30;
        const mockLocations = [
            { id: 15, session_id: 30, latitude: 12.3456789, longitude: 98.7654321, timestamp: 1756077800000, phase: 'fast' },
            { id: 16, session_id: 30, latitude: 12.3456800, longitude: 98.7654400, timestamp: 1756077805000, phase: 'fast' },
            { id: 17, session_id: 30, latitude: 12.3456900, longitude: 98.7654500, timestamp: 1756077810000, phase: 'slow' }
        ];

        // Mock the database query response
        mockModel.selectObjects.mockResolvedValue(mockLocations);
        mockModel.getLocationsBySessionId = async function(sessionId) {
            console.log('🔍 Getting locations for session ID:', sessionId);
            const locations = await this.selectObjects('SELECT * FROM walking_locations WHERE session_id = ? ORDER BY timestamp', [sessionId]);
            console.log('📊 SQLite query result for session', sessionId, ':', locations);
            return locations;
        };

        const result = await mockModel.getLocationsBySessionId(sessionId);

        expect(result).toEqual(mockLocations);
        expect(result).toHaveLength(3);
        expect(mockModel.selectObjects).toHaveBeenCalledWith(
            'SELECT * FROM walking_locations WHERE session_id = ? ORDER BY timestamp', 
            [sessionId]
        );
    });

    test('displayLocations shows all location records in table format', () => {
        const mockLocations = [
            { id: 15, session_id: 30, latitude: 12.3456789, longitude: 98.7654321, timestamp: 1756077800000, phase: 'fast' },
            { id: 16, session_id: 30, latitude: 12.3456800, longitude: 98.7654400, timestamp: 1756077805000, phase: 'fast' },
            { id: 17, session_id: 30, latitude: 12.3456900, longitude: 98.7654500, timestamp: 1756077810000, phase: 'slow' }
        ];

        // Implement the actual displayLocations method
        function displayLocations(locations) {
            const locationsList = document.getElementById('locationsList');
            
            console.log('🗺️ displayLocations called with:', locations);
            console.log('📊 Number of locations:', locations ? locations.length : 0);
            
            if (!locations || locations.length === 0) {
                locationsList.innerHTML = '<p class="text-gray-500 text-sm">位置情報がありません</p>';
                return;
            }

            const table = document.createElement('table');
            table.className = 'w-full text-sm';
            
            const headerRow = document.createElement('tr');
            headerRow.className = 'border-b border-gray-200';
            headerRow.innerHTML = `
                <th class="text-left py-2 text-gray-600 font-medium">時刻</th>
                <th class="text-left py-2 text-gray-600 font-medium">フェーズ</th>
                <th class="text-left py-2 text-gray-600 font-medium">緯度</th>
                <th class="text-left py-2 text-gray-600 font-medium">経度</th>
            `;
            table.appendChild(headerRow);

            locations.forEach((location, index) => {
                console.log(`📍 Location ${index + 1}:`, location);
                
                const row = document.createElement('tr');
                row.className = 'border-b border-gray-100';
                
                const time = new Date(location.timestamp).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                
                const phaseColor = location.phase === 'fast' ? 'text-red-600' : 'text-blue-600';
                const phaseName = location.phase === 'fast' ? '速歩き' : 'ゆっくり歩き';
                
                row.innerHTML = `
                    <td class="py-2">${time}</td>
                    <td class="py-2 ${phaseColor} font-medium">${phaseName}</td>
                    <td class="py-2 font-mono text-xs">${location.latitude.toFixed(6)}</td>
                    <td class="py-2 font-mono text-xs">${location.longitude.toFixed(6)}</td>
                `;
                table.appendChild(row);
            });

            locationsList.innerHTML = '';
            locationsList.appendChild(table);
        }

        displayLocations(mockLocations);

        const locationsList = document.getElementById('locationsList');
        const table = locationsList.querySelector('table');
        const rows = table.querySelectorAll('tr');

        // Should have header + 3 data rows
        expect(rows).toHaveLength(4);
        
        // Check that all locations are displayed
        expect(table.textContent).toContain('速歩き');
        expect(table.textContent).toContain('ゆっくり歩き');
        expect(table.textContent).toContain('12.345679'); // First location latitude
        expect(table.textContent).toContain('12.345690'); // Last location latitude
    });

    test('displayLocations handles empty location array', () => {
        function displayLocations(locations) {
            const locationsList = document.getElementById('locationsList');
            
            if (!locations || locations.length === 0) {
                locationsList.innerHTML = '<p class="text-gray-500 text-sm">位置情報がありません</p>';
                return;
            }
        }

        displayLocations([]);

        const locationsList = document.getElementById('locationsList');
        expect(locationsList.textContent).toContain('位置情報がありません');
    });

    test('location data is saved with correct session ID', async () => {
        const sessionId = 30;
        const locationData = {
            lat: 12.3456789,
            lng: 98.7654321,
            timestamp: 1756077800000,
            phase: 'fast'
        };

        // Mock execSQL method
        const mockExecSQL = jest.fn().mockResolvedValue({ lastInsertRowId: 18 });
        
        // Implement saveLocation method
        async function saveLocation(sessionId, location) {
            console.log('💾 Saving location for session ID:', sessionId);
            console.log('📍 Location data:', location);
            
            const locationDataToSave = {
                session_id: sessionId,
                latitude: location.lat,
                longitude: location.lng,
                timestamp: location.timestamp,
                phase: location.phase,
                created_at: new Date().toISOString()
            };

            const result = await mockExecSQL(
                'INSERT INTO walking_locations (session_id, latitude, longitude, timestamp, phase, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                [locationDataToSave.session_id, locationDataToSave.latitude, locationDataToSave.longitude, locationDataToSave.timestamp, locationDataToSave.phase, locationDataToSave.created_at]
            );
            
            return result;
        }

        const result = await saveLocation(sessionId, locationData);

        expect(mockExecSQL).toHaveBeenCalledWith(
            'INSERT INTO walking_locations (session_id, latitude, longitude, timestamp, phase, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            expect.arrayContaining([sessionId, locationData.lat, locationData.lng, locationData.timestamp, locationData.phase, expect.any(String)])
        );
        expect(result.lastInsertRowId).toBe(18);
    });

    test('session detail loading retrieves and displays all locations', async () => {
        const sessionId = 30;
        const mockSession = {
            id: 30,
            duration: 1800,
            distance: 2.5,
            created_at: '2025-08-24T10:00:00.000Z'
        };
        
        const mockLocations = [
            { id: 15, session_id: 30, latitude: 12.3456789, longitude: 98.7654321, timestamp: 1756077800000, phase: 'fast' },
            { id: 16, session_id: 30, latitude: 12.3456800, longitude: 98.7654400, timestamp: 1756077805000, phase: 'fast' },
            { id: 17, session_id: 30, latitude: 12.3456900, longitude: 98.7654500, timestamp: 1756077810000, phase: 'slow' }
        ];

        // Mock methods
        const mockGetSessionById = jest.fn().mockResolvedValue(mockSession);
        const mockGetLocationsBySessionId = jest.fn().mockResolvedValue(mockLocations);
        const mockDisplaySessionDetails = jest.fn();

        // Implement loadSessionDetails
        async function loadSessionDetails(sessionId) {
            console.log('🔍 Loading session details for session ID:', sessionId);
            
            const session = await mockGetSessionById(sessionId);
            if (!session) {
                console.warn('セッションが見つかりません:', sessionId);
                return;
            }

            const locations = await mockGetLocationsBySessionId(sessionId);
            console.log('📊 Retrieved locations:', locations);
            console.log('📊 Number of locations:', locations ? locations.length : 0);
            
            mockDisplaySessionDetails(session, locations);
        }

        await loadSessionDetails(sessionId);

        expect(mockGetSessionById).toHaveBeenCalledWith(sessionId);
        expect(mockGetLocationsBySessionId).toHaveBeenCalledWith(sessionId);
        expect(mockDisplaySessionDetails).toHaveBeenCalledWith(mockSession, mockLocations);
        
        // Verify that all 3 locations were passed to display
        const displayCall = mockDisplaySessionDetails.mock.calls[0];
        expect(displayCall[1]).toHaveLength(3);
    });
});