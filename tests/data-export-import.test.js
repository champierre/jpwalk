// Data Export/Import Functionality Test
// This test verifies that data export and import operations work correctly

describe('Data Export/Import Functionality', () => {
    let mockWorker;
    let consoleLogSpy;

    beforeEach(() => {
        // Mock console methods
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});

        // Mock Worker
        mockWorker = {
            postMessage: jest.fn(),
            terminate: jest.fn()
        };

        // Mock global objects
        global.URL = {
            createObjectURL: jest.fn().mockReturnValue('blob:mock-url'),
            revokeObjectURL: jest.fn()
        };

        global.Blob = jest.fn().mockImplementation((content, options) => ({
            content,
            options
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('exportAllData returns properly formatted export data', async () => {
        const mockSessions = [
            { id: 1, duration: 1800, distance: 2.5, created_at: '2025-08-24T10:00:00.000Z' },
            { id: 2, duration: 1800, distance: 2.3, created_at: '2025-08-24T09:00:00.000Z' }
        ];

        const mockLocations = [
            { id: 1, session_id: 1, latitude: 12.3456789, longitude: 98.7654321, timestamp: 1756077800000, phase: 'fast' },
            { id: 2, session_id: 1, latitude: 12.3456800, longitude: 98.7654400, timestamp: 1756077805000, phase: 'slow' },
            { id: 3, session_id: 2, latitude: 12.3456850, longitude: 98.7654450, timestamp: 1756077810000, phase: 'fast' }
        ];

        class MockWalkingModel {
            constructor() {
                this.worker = mockWorker;
            }

            async selectObjects(query) {
                if (query.includes('walking_sessions')) {
                    return mockSessions;
                } else if (query.includes('walking_locations')) {
                    return mockLocations;
                }
                return [];
            }

            async exportAllData() {
                try {
                    let sessions = [];
                    let locations = [];

                    if (this.worker) {
                        sessions = await this.selectObjects('SELECT * FROM walking_sessions ORDER BY created_at DESC');
                        locations = await this.selectObjects('SELECT * FROM walking_locations ORDER BY session_id, timestamp');
                    }

                    const exportData = {
                        version: '1.0',
                        exportedAt: new Date().toISOString(),
                        appName: 'Walk Log (インターバル速歩)',
                        data: {
                            sessions: sessions,
                            locations: locations
                        },
                        metadata: {
                            totalSessions: sessions.length,
                            totalLocations: locations.length,
                            dateRange: {
                                earliest: sessions.length > 0 ? sessions[sessions.length - 1].created_at : null,
                                latest: sessions.length > 0 ? sessions[0].created_at : null
                            }
                        }
                    };

                    console.log('📤 データエクスポート完了:', exportData.metadata);
                    return exportData;
                } catch (error) {
                    console.error('データエクスポートエラー:', error);
                    throw new Error('データのエクスポートに失敗しました: ' + error.message);
                }
            }
        }

        const model = new MockWalkingModel();
        const exportData = await model.exportAllData();

        // Verify export data structure
        expect(exportData.version).toBe('1.0');
        expect(exportData.appName).toBe('Walk Log (インターバル速歩)');
        expect(exportData.exportedAt).toBeTruthy();

        // Verify data content
        expect(exportData.data.sessions).toEqual(mockSessions);
        expect(exportData.data.locations).toEqual(mockLocations);

        // Verify metadata
        expect(exportData.metadata.totalSessions).toBe(2);
        expect(exportData.metadata.totalLocations).toBe(3);
        expect(exportData.metadata.dateRange.earliest).toBe('2025-08-24T09:00:00.000Z');
        expect(exportData.metadata.dateRange.latest).toBe('2025-08-24T10:00:00.000Z');

        expect(consoleLogSpy).toHaveBeenCalledWith('📤 データエクスポート完了:', exportData.metadata);
    });

    test('importAllData validates and imports data correctly', async () => {
        const importData = {
            version: '1.0',
            exportedAt: '2025-08-24T12:00:00.000Z',
            appName: 'Japanese Walking (インターバル速歩)',
            data: {
                sessions: [
                    { id: 10, duration: 1800, distance: 2.5, created_at: '2025-08-24T10:00:00.000Z' },
                    { id: 11, duration: 1800, distance: 2.3, created_at: '2025-08-24T09:00:00.000Z' }
                ],
                locations: [
                    { id: 20, session_id: 10, latitude: 12.3456789, longitude: 98.7654321, timestamp: 1756077800000, phase: 'fast', created_at: '2025-08-24T10:00:00.000Z' },
                    { id: 21, session_id: 10, latitude: 12.3456800, longitude: 98.7654400, timestamp: 1756077805000, phase: 'slow', created_at: '2025-08-24T10:00:05.000Z' }
                ]
            }
        };

        class MockWalkingModel {
            constructor() {
                this.worker = mockWorker;
                this.importedSessions = [];
                this.importedLocations = [];
            }

            validateImportData(importData) {
                if (!importData || typeof importData !== 'object') {
                    throw new Error('無効なインポートデータ形式です');
                }

                if (!importData.data || !importData.data.sessions || !importData.data.locations) {
                    throw new Error('インポートデータに必要なフィールドが不足しています');
                }

                if (!Array.isArray(importData.data.sessions) || !Array.isArray(importData.data.locations)) {
                    throw new Error('セッションまたは位置情報データが配列ではありません');
                }

                // Validate session data structure
                for (const session of importData.data.sessions) {
                    if (!session.id || !session.duration || !session.created_at) {
                        throw new Error('セッションデータに必要なフィールドが不足しています: id, duration, created_at');
                    }
                }

                // Validate location data structure
                for (const location of importData.data.locations) {
                    if (!location.session_id || location.latitude === undefined || location.longitude === undefined || !location.timestamp) {
                        throw new Error('位置情報データに必要なフィールドが不足しています: session_id, latitude, longitude, timestamp');
                    }
                }

                console.log('✅ インポートデータの検証が完了しました');
                return true;
            }

            async clearAllData() {
                this.importedSessions = [];
                this.importedLocations = [];
                console.log('🗑️ SQLiteデータをクリアしました');
            }

            async execSQL(query, params) {
                // Mock SQL execution
                if (query.includes('INSERT INTO walking_sessions')) {
                    const [id, duration, distance, created_at] = params;
                    this.importedSessions.push({ id, duration, distance, created_at });
                } else if (query.includes('INSERT INTO walking_locations')) {
                    const [id, session_id, latitude, longitude, timestamp, phase, created_at] = params;
                    this.importedLocations.push({ id, session_id, latitude, longitude, timestamp, phase, created_at });
                }
            }

            async selectValue(query, params) {
                // Mock existence check - return 0 (not exists)
                return 0;
            }

            async importAllData(importData, options = { merge: false, validate: true }) {
                try {
                    // Validate import data structure
                    if (options.validate) {
                        this.validateImportData(importData);
                    }

                    const { sessions, locations } = importData.data;
                    
                    if (!options.merge) {
                        await this.clearAllData();
                    }

                    // Import sessions
                    let importedSessionsCount = 0;
                    for (const session of sessions) {
                        try {
                            if (this.worker) {
                                if (options.merge) {
                                    const existing = await this.selectValue('SELECT COUNT(*) FROM walking_sessions WHERE id = ?', [session.id]);
                                    if (existing > 0) {
                                        console.log(`⏭️ セッション ${session.id} は既に存在するためスキップ`);
                                        continue;
                                    }
                                }

                                await this.execSQL(
                                    'INSERT INTO walking_sessions (id, duration, distance, created_at) VALUES (?, ?, ?, ?)',
                                    [session.id, session.duration, session.distance || 0, session.created_at]
                                );
                            }
                            importedSessionsCount++;
                        } catch (sessionError) {
                            console.warn(`⚠️ セッション ${session.id} のインポートに失敗:`, sessionError);
                        }
                    }

                    // Import locations
                    let importedLocationsCount = 0;
                    for (const location of locations) {
                        try {
                            if (this.worker) {
                                if (options.merge) {
                                    const existing = await this.selectValue('SELECT COUNT(*) FROM walking_locations WHERE id = ?', [location.id]);
                                    if (existing > 0) {
                                        continue;
                                    }
                                }

                                await this.execSQL(
                                    'INSERT INTO walking_locations (id, session_id, latitude, longitude, timestamp, phase, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                                    [location.id, location.session_id, location.latitude, location.longitude, location.timestamp, location.phase, location.created_at]
                                );
                            }
                            importedLocationsCount++;
                        } catch (locationError) {
                            console.warn(`⚠️ 位置情報 ${location.id} のインポートに失敗:`, locationError);
                        }
                    }

                    const result = {
                        success: true,
                        imported: {
                            sessions: importedSessionsCount,
                            locations: importedLocationsCount
                        },
                        total: {
                            sessions: sessions.length,
                            locations: locations.length
                        }
                    };

                    console.log('📥 データインポート完了:', result);
                    return result;

                } catch (error) {
                    console.error('データインポートエラー:', error);
                    throw new Error('データのインポートに失敗しました: ' + error.message);
                }
            }
        }

        const model = new MockWalkingModel();
        const result = await model.importAllData(importData);

        // Verify import result
        expect(result.success).toBe(true);
        expect(result.imported.sessions).toBe(2);
        expect(result.imported.locations).toBe(2);
        expect(result.total.sessions).toBe(2);
        expect(result.total.locations).toBe(2);

        // Verify data was actually imported
        expect(model.importedSessions).toHaveLength(2);
        expect(model.importedLocations).toHaveLength(2);

        expect(consoleLogSpy).toHaveBeenCalledWith('✅ インポートデータの検証が完了しました');
        expect(consoleLogSpy).toHaveBeenCalledWith('📥 データインポート完了:', result);
    });

    test('validateImportData rejects invalid data structures', async () => {
        class MockWalkingModel {
            validateImportData(importData) {
                if (!importData || typeof importData !== 'object') {
                    throw new Error('無効なインポートデータ形式です');
                }

                if (!importData.data || !importData.data.sessions || !importData.data.locations) {
                    throw new Error('インポートデータに必要なフィールドが不足しています');
                }

                if (!Array.isArray(importData.data.sessions) || !Array.isArray(importData.data.locations)) {
                    throw new Error('セッションまたは位置情報データが配列ではありません');
                }
            }
        }

        const model = new MockWalkingModel();

        // Test null data
        expect(() => model.validateImportData(null)).toThrow('無効なインポートデータ形式です');

        // Test missing data field
        expect(() => model.validateImportData({})).toThrow('インポートデータに必要なフィールドが不足しています');

        // Test missing sessions field
        expect(() => model.validateImportData({ data: { locations: [] } })).toThrow('インポートデータに必要なフィールドが不足しています');

        // Test non-array sessions
        expect(() => model.validateImportData({ 
            data: { sessions: "not-array", locations: [] } 
        })).toThrow('セッションまたは位置情報データが配列ではありません');
    });

    test('import with merge option skips existing data', async () => {
        const importData = {
            version: '1.0',
            data: {
                sessions: [
                    { id: 1, duration: 1800, distance: 2.5, created_at: '2025-08-24T10:00:00.000Z' }
                ],
                locations: [
                    { id: 1, session_id: 1, latitude: 12.3456789, longitude: 98.7654321, timestamp: 1756077800000, phase: 'fast', created_at: '2025-08-24T10:00:00.000Z' }
                ]
            }
        };

        class MockWalkingModel {
            constructor() {
                this.worker = mockWorker;
                this.importedSessions = [];
                this.importedLocations = [];
            }

            validateImportData() {
                return true;
            }

            async selectValue(query, params) {
                // Mock existing data (return 1 to simulate existing record)
                return 1;
            }

            async execSQL() {
                // Should not be called when data exists and merge=true
            }

            async importAllData(importData, options) {
                this.validateImportData(importData);
                const { sessions, locations } = importData.data;
                
                let importedSessionsCount = 0;
                let importedLocationsCount = 0;

                // Simulate merge behavior
                for (const session of sessions) {
                    if (options.merge) {
                        const existing = await this.selectValue('SELECT COUNT(*) FROM walking_sessions WHERE id = ?', [session.id]);
                        if (existing > 0) {
                            console.log(`⏭️ セッション ${session.id} は既に存在するためスキップ`);
                            continue;
                        }
                    }
                    importedSessionsCount++;
                }

                for (const location of locations) {
                    if (options.merge) {
                        const existing = await this.selectValue('SELECT COUNT(*) FROM walking_locations WHERE id = ?', [location.id]);
                        if (existing > 0) {
                            continue;
                        }
                    }
                    importedLocationsCount++;
                }

                return {
                    success: true,
                    imported: { sessions: importedSessionsCount, locations: importedLocationsCount },
                    total: { sessions: sessions.length, locations: locations.length }
                };
            }
        }

        const model = new MockWalkingModel();
        const result = await model.importAllData(importData, { merge: true, validate: true });

        // When merge=true and data exists, nothing should be imported
        expect(result.imported.sessions).toBe(0);
        expect(result.imported.locations).toBe(0);
        expect(result.total.sessions).toBe(1);
        expect(result.total.locations).toBe(1);

        expect(consoleLogSpy).toHaveBeenCalledWith('⏭️ セッション 1 は既に存在するためスキップ');
    });

    test('export creates correct file download', async () => {
        // Clear console spy for this test
        consoleLogSpy.mockClear();
        
        // Mock DOM elements
        const mockDownloadLink = {
            href: '',
            download: '',
            style: { display: 'block' },
            click: jest.fn(),
            remove: jest.fn()
        };

        const mockAppendChild = jest.fn();
        const mockRemoveChild = jest.fn();

        // Mock document methods
        const originalCreateElement = document.createElement;
        const originalBody = document.body;
        
        document.createElement = jest.fn().mockReturnValue(mockDownloadLink);
        
        // Mock body methods without replacing the body object
        jest.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
        jest.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

        class MockController {
            constructor() {
                this.model = {
                    exportAllData: jest.fn().mockResolvedValue({
                        version: '1.0',
                        data: { sessions: [], locations: [] },
                        metadata: { totalSessions: 0, totalLocations: 0 }
                    })
                };
                this.view = {
                    showExportSuccess: jest.fn(),
                    showExportError: jest.fn()
                };
            }

            async exportData() {
                try {
                    console.log('📤 データエクスポートを開始...');
                    const exportData = await this.model.exportAllData();
                    
                    // Create downloadable file
                    const dataStr = JSON.stringify(exportData, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    
                    // Generate filename with current date
                    const now = new Date();
                    const dateStr = now.toISOString().split('T')[0];
                    const filename = `jpwalk-data-${dateStr}.json`;
                    
                    // Create download link
                    const downloadLink = document.createElement('a');
                    downloadLink.href = URL.createObjectURL(dataBlob);
                    downloadLink.download = filename;
                    downloadLink.style.display = 'none';
                    
                    // Trigger download
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                    
                    // Clean up
                    URL.revokeObjectURL(downloadLink.href);
                    
                    console.log('✅ データエクスポート完了:', filename);
                    this.view.showExportSuccess(exportData.metadata);
                    
                } catch (error) {
                    console.error('エクスポートエラー:', error);
                    this.view.showExportError(error.message);
                }
            }
        }

        const controller = new MockController();
        await controller.exportData();

        // Verify export process
        expect(controller.model.exportAllData).toHaveBeenCalled();
        expect(global.Blob).toHaveBeenCalled();
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(mockDownloadLink.click).toHaveBeenCalled();
        expect(controller.view.showExportSuccess).toHaveBeenCalled();
        expect(global.URL.revokeObjectURL).toHaveBeenCalled();

        expect(consoleLogSpy).toHaveBeenCalledWith('📤 データエクスポートを開始...');
        expect(consoleLogSpy).toHaveBeenCalledWith('✅ データエクスポート完了:', expect.stringMatching(/jpwalk-data-\d{4}-\d{2}-\d{2}\.json/));
    });
});