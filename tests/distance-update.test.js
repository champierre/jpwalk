/**
 * セッション距離更新機能の基本テスト
 * Basic tests for session distance update functionality
 */

// Mock LocalStorage for testing
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn((key) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        })
    };
})();

// Mock Model class with distance update methods
class TestModel {
    constructor(useSQLite = false) {
        this.worker = useSQLite ? {} : null;
        this.currentSessionId = null;
    }

    // Mock SQLite execution
    async execSQL(query, params = []) {
        if (query.includes('UPDATE walking_sessions')) {
            return { success: true };
        }
        throw new Error('Mock SQL error');
    }

    // セッション終了時に距離と時間を更新
    async updateSessionWithDistance(sessionId, duration, distance) {
        if (this.worker) {
            try {
                await this.execSQL(
                    'UPDATE walking_sessions SET duration = ?, distance = ? WHERE id = ?',
                    [Math.floor(duration / 1000), distance, sessionId]
                );
                return sessionId;
            } catch (error) {
                return await this.updateSessionWithDistanceLocalStorage(sessionId, duration, distance);
            }
        } else {
            return await this.updateSessionWithDistanceLocalStorage(sessionId, duration, distance);
        }
    }

    async updateSessionWithDistanceLocalStorage(sessionId, duration, distance) {
        const sessions = JSON.parse(localStorageMock.getItem('walkingSessions') || '[]');
        const sessionIndex = sessions.findIndex(s => s.id == sessionId);
        
        if (sessionIndex !== -1) {
            sessions[sessionIndex].duration = Math.floor(duration / 1000);
            sessions[sessionIndex].distance = distance;
            localStorageMock.setItem('walkingSessions', JSON.stringify(sessions));
            return sessionId;
        } else {
            return await this.saveSession(duration);
        }
    }

    async saveSession(duration) {
        const sessionId = Date.now();
        const session = {
            id: sessionId,
            start_time: new Date().toISOString(),
            duration: Math.floor(duration / 1000),
            distance: 0
        };
        
        const sessions = JSON.parse(localStorageMock.getItem('walkingSessions') || '[]');
        sessions.push(session);
        localStorageMock.setItem('walkingSessions', JSON.stringify(sessions));
        
        return sessionId;
    }
}

describe('Distance Update Functionality', () => {
    let model;

    beforeEach(() => {
        localStorageMock.clear();
        jest.clearAllMocks();
    });

    describe('LocalStorage Backend - Core Functionality', () => {
        beforeEach(() => {
            model = new TestModel(false);
        });

        test('正常な距離更新', async () => {
            const sessionId = await model.saveSession(1800000);
            const distance = 2.5;
            
            const result = await model.updateSessionWithDistance(sessionId, 1800000, distance);
            
            expect(result).toBe(sessionId);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'walkingSessions',
                expect.stringContaining(`"distance":${distance}`)
            );
        });

        test('存在しないセッションの更新 - フォールバック', async () => {
            const nonExistentSessionId = 999999;
            const result = await model.updateSessionWithDistance(nonExistentSessionId, 1800000, 2.5);
            
            expect(result).not.toBe(nonExistentSessionId);
            expect(typeof result).toBe('number');
        });

        test('時間の正しい変換（ミリ秒 → 秒）', async () => {
            const sessionId = await model.saveSession(1000);
            const durationMs = 1800000; // 30分 (ms)
            const expectedDurationSec = 1800; // 30分 (秒)
            
            const result = await model.updateSessionWithDistance(sessionId, durationMs, 2.5);
            
            expect(result).toBe(sessionId);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'walkingSessions',
                expect.stringContaining(`"duration":${expectedDurationSec}`)
            );
        });
    });

    describe('SQLite Backend - Essential Tests', () => {
        beforeEach(() => {
            model = new TestModel(true);
        });

        test('SQLite正常動作時の距離更新', async () => {
            const sessionId = 123;
            const distance = 2.5;
            
            model.execSQL = jest.fn().mockResolvedValue({ success: true });
            
            const result = await model.updateSessionWithDistance(sessionId, 1800000, distance);
            
            expect(result).toBe(sessionId);
            expect(model.execSQL).toHaveBeenCalled();
        });

        test('SQLiteエラー時のLocalStorageフォールバック', async () => {
            const sessionId = await model.saveSession(1800000);
            
            model.execSQL = jest.fn().mockRejectedValue(new Error('SQL Error'));
            
            const result = await model.updateSessionWithDistance(sessionId, 1800000, 2.5);
            
            expect(result).toBe(sessionId);
            expect(localStorageMock.setItem).toHaveBeenCalled();
        });
    });

    describe('Essential Error Handling', () => {
        beforeEach(() => {
            model = new TestModel(false);
        });

        test('NaN距離値での更新', async () => {
            const sessionId = await model.saveSession(1800000);
            const distance = NaN;
            
            const result = await model.updateSessionWithDistance(sessionId, 1800000, distance);
            expect(result).toBe(sessionId);
            
            const sessions = JSON.parse(localStorageMock.getItem('walkingSessions'));
            const updatedSession = sessions.find(s => s.id === sessionId);
            expect(updatedSession.distance).toBeNull();
        });
    });

    describe('Integration Tests', () => {
        test('セッション作成から距離更新までの基本フロー', async () => {
            model = new TestModel(false);
            
            const sessionId = await model.saveSession(1800000);
            expect(typeof sessionId).toBe('number');
            
            const result = await model.updateSessionWithDistance(sessionId, 1800000, 3.2);
            expect(result).toBe(sessionId);
            
            const sessions = JSON.parse(localStorageMock.getItem('walkingSessions'));
            const session = sessions.find(s => s.id === sessionId);
            expect(session.distance).toBe(3.2);
            expect(session.duration).toBe(1800);
        });
    });
});