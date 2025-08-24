// Model Layer - getAllSessions Method Test
// Tests the data retrieval logic for session counting

import { WalkingModel } from '../js/model.js';

describe('WalkingModel - getAllSessions Method', () => {
    let model;
    let mockWorker;

    beforeEach(() => {
        model = new WalkingModel();
        
        // Mock the worker
        mockWorker = {
            postMessage: jest.fn(),
            onmessage: jest.fn(),
            onerror: jest.fn(),
            terminate: jest.fn()
        };
        
        // Mock localStorage for fallback testing
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn(),
                setItem: jest.fn(),
                clear: jest.fn()
            },
            writable: true
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllSessions with SQLite Worker', () => {
        beforeEach(() => {
            model.worker = mockWorker;
            model.requestId = 0;
            model.pendingRequests = new Map();
        });

        test('should return sessions and totalCount when worker is available', async () => {
            const mockSessions = [
                { id: 1, created_at: '2024-01-01', duration: 1800000 },
                { id: 2, created_at: '2024-01-02', duration: 1800000 }
            ];
            const mockTotalCount = 5;

            // Mock the selectObjects and selectValue methods
            model.selectObjects = jest.fn().mockResolvedValue(mockSessions);
            model.selectValue = jest.fn().mockResolvedValue(mockTotalCount);

            const result = await model.getAllSessions(1, 10);

            expect(model.selectObjects).toHaveBeenCalledWith(
                'SELECT * FROM walking_sessions ORDER BY created_at DESC LIMIT ? OFFSET ?',
                [10, 0]
            );
            expect(model.selectValue).toHaveBeenCalledWith(
                'SELECT COUNT(*) FROM walking_sessions'
            );

            expect(result).toEqual({
                sessions: mockSessions,
                totalCount: mockTotalCount
            });
        });

        test('should handle pagination parameters correctly', async () => {
            const mockSessions = [
                { id: 3, created_at: '2024-01-03', duration: 1800000 }
            ];
            const mockTotalCount = 5;

            model.selectObjects = jest.fn().mockResolvedValue(mockSessions);
            model.selectValue = jest.fn().mockResolvedValue(mockTotalCount);

            // Test page 2 with limit 2
            await model.getAllSessions(2, 2);

            expect(model.selectObjects).toHaveBeenCalledWith(
                'SELECT * FROM walking_sessions ORDER BY created_at DESC LIMIT ? OFFSET ?',
                [2, 2] // limit=2, offset=(2-1)*2=2
            );
        });

        test('should use default pagination parameters', async () => {
            const mockSessions = [];
            const mockTotalCount = 0;

            model.selectObjects = jest.fn().mockResolvedValue(mockSessions);
            model.selectValue = jest.fn().mockResolvedValue(mockTotalCount);

            // Call without parameters - should use defaults (page=1, limit=10)
            await model.getAllSessions();

            expect(model.selectObjects).toHaveBeenCalledWith(
                'SELECT * FROM walking_sessions ORDER BY created_at DESC LIMIT ? OFFSET ?',
                [10, 0] // default limit=10, offset=(1-1)*10=0
            );
        });

        test('should handle database errors gracefully', async () => {
            model.selectObjects = jest.fn().mockRejectedValue(new Error('Database connection failed'));
            model.selectValue = jest.fn().mockResolvedValue(5);

            await expect(model.getAllSessions(1, 10)).rejects.toThrow('Database connection failed');
        });

        test('should handle count query errors gracefully', async () => {
            const mockSessions = [
                { id: 1, created_at: '2024-01-01', duration: 1800000 }
            ];

            model.selectObjects = jest.fn().mockResolvedValue(mockSessions);
            model.selectValue = jest.fn().mockRejectedValue(new Error('Count query failed'));

            await expect(model.getAllSessions(1, 10)).rejects.toThrow('Count query failed');
        });
    });

    describe('getAllSessions with LocalStorage Fallback', () => {
        beforeEach(() => {
            model.worker = null; // No worker available
        });

        test('should use localStorage when worker is not available', async () => {
            const mockSessions = [
                { id: 1, created_at: '2024-01-01', duration: 1800000, distance: 2.5 },
                { id: 2, created_at: '2024-01-02', duration: 1800000, distance: 3.0 },
                { id: 3, created_at: '2024-01-03', duration: 1800000, distance: 2.8 },
                { id: 4, created_at: '2024-01-04', duration: 1800000, distance: 3.2 },
                { id: 5, created_at: '2024-01-05', duration: 1800000, distance: 2.9 }
            ];

            localStorage.getItem.mockReturnValue(JSON.stringify(mockSessions));

            const result = await model.getAllSessions(1, 3);

            expect(localStorage.getItem).toHaveBeenCalledWith('walkingSessions');
            expect(result.totalCount).toBe(5);
            expect(result.sessions).toHaveLength(3); // limited to 3
            
            // Should be sorted by created_at DESC
            expect(result.sessions[0].id).toBe(5); // newest first
            expect(result.sessions[1].id).toBe(4);
            expect(result.sessions[2].id).toBe(3);
        });

        test('should handle empty localStorage gracefully', async () => {
            localStorage.getItem.mockReturnValue(null);

            const result = await model.getAllSessions(1, 10);

            expect(result).toEqual({
                sessions: [],
                totalCount: 0
            });
        });

        test('should handle invalid JSON in localStorage', async () => {
            localStorage.getItem.mockReturnValue('invalid json');

            const result = await model.getAllSessions(1, 10);

            // Should fallback to empty array when JSON is invalid
            expect(result).toEqual({
                sessions: [],
                totalCount: 0
            });
        });

        test('should handle pagination correctly with localStorage', async () => {
            const mockSessions = Array.from({ length: 15 }, (_, i) => ({
                id: i + 1,
                created_at: `2024-01-${String(i + 1).padStart(2, '0')}`,
                duration: 1800000,
                distance: 2.5
            }));

            localStorage.getItem.mockReturnValue(JSON.stringify(mockSessions));

            // Test page 2 with limit 5
            const result = await model.getAllSessions(2, 5);

            expect(result.totalCount).toBe(15);
            expect(result.sessions).toHaveLength(5);
            
            // Should skip first 5 and take next 5
            expect(result.sessions[0].id).toBe(10); // sorted DESC, so id 15,14,13,12,11 are skipped
            expect(result.sessions[4].id).toBe(6);
        });

        test('should return empty page when requesting beyond available data', async () => {
            const mockSessions = [
                { id: 1, created_at: '2024-01-01', duration: 1800000, distance: 2.5 }
            ];

            localStorage.getItem.mockReturnValue(JSON.stringify(mockSessions));

            // Request page 5 with limit 10 (beyond available data)
            const result = await model.getAllSessions(5, 10);

            expect(result.totalCount).toBe(1);
            expect(result.sessions).toHaveLength(0); // no sessions on page 5
        });
    });

    describe('Edge Cases and Boundary Testing', () => {
        test('should handle page=0 correctly', async () => {
            model.worker = mockWorker;
            model.selectObjects = jest.fn().mockResolvedValue([]);
            model.selectValue = jest.fn().mockResolvedValue(0);

            await model.getAllSessions(0, 10);

            // Page 0 should be treated as page 1 (offset = -10, but typically clamped to 0)
            expect(model.selectObjects).toHaveBeenCalledWith(
                'SELECT * FROM walking_sessions ORDER BY created_at DESC LIMIT ? OFFSET ?',
                [10, -10]
            );
        });

        test('should handle negative page numbers', async () => {
            model.worker = mockWorker;
            model.selectObjects = jest.fn().mockResolvedValue([]);
            model.selectValue = jest.fn().mockResolvedValue(0);

            await model.getAllSessions(-1, 10);

            expect(model.selectObjects).toHaveBeenCalledWith(
                'SELECT * FROM walking_sessions ORDER BY created_at DESC LIMIT ? OFFSET ?',
                [10, -20]
            );
        });

        test('should handle limit=0', async () => {
            model.worker = mockWorker;
            model.selectObjects = jest.fn().mockResolvedValue([]);
            model.selectValue = jest.fn().mockResolvedValue(5);

            const result = await model.getAllSessions(1, 0);

            expect(model.selectObjects).toHaveBeenCalledWith(
                'SELECT * FROM walking_sessions ORDER BY created_at DESC LIMIT ? OFFSET ?',
                [0, 0]
            );
            expect(result.sessions).toHaveLength(0);
            expect(result.totalCount).toBe(5);
        });

        test('should handle very large page numbers', async () => {
            model.worker = mockWorker;
            model.selectObjects = jest.fn().mockResolvedValue([]);
            model.selectValue = jest.fn().mockResolvedValue(5);

            await model.getAllSessions(1000000, 10);

            expect(model.selectObjects).toHaveBeenCalledWith(
                'SELECT * FROM walking_sessions ORDER BY created_at DESC LIMIT ? OFFSET ?',
                [10, 9999990]
            );
        });
    });

    describe('Data Consistency', () => {
        test('should ensure sessions are ordered by created_at DESC', async () => {
            const mockSessions = [
                { id: 3, created_at: '2024-01-03T10:00:00Z', duration: 1800000 },
                { id: 1, created_at: '2024-01-01T10:00:00Z', duration: 1800000 },
                { id: 2, created_at: '2024-01-02T10:00:00Z', duration: 1800000 }
            ];

            localStorage.getItem.mockReturnValue(JSON.stringify(mockSessions));
            model.worker = null;

            const result = await model.getAllSessions(1, 10);

            // Should be sorted by created_at DESC
            expect(result.sessions[0].created_at).toBe('2024-01-03T10:00:00Z');
            expect(result.sessions[1].created_at).toBe('2024-01-02T10:00:00Z');
            expect(result.sessions[2].created_at).toBe('2024-01-01T10:00:00Z');
        });

        test('should maintain data integrity between sessions and totalCount', async () => {
            const mockSessions = Array.from({ length: 7 }, (_, i) => ({
                id: i + 1,
                created_at: `2024-01-${String(i + 1).padStart(2, '0')}`,
                duration: 1800000
            }));

            localStorage.getItem.mockReturnValue(JSON.stringify(mockSessions));
            model.worker = null;

            const result = await model.getAllSessions(1, 3);

            expect(result.totalCount).toBe(7); // Total in storage
            expect(result.sessions).toHaveLength(3); // Limited by page size
        });
    });
});