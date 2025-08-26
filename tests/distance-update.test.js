/**
 * セッション距離更新機能のテストスイート
 * Test suite for session distance update functionality
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
        // Simulate SQLite behavior
        if (query.includes('UPDATE walking_sessions')) {
            console.log(`SQLite UPDATE: ${query}`, params);
            return { success: true };
        }
        throw new Error('Mock SQL error');
    }

    // セッション終了時に距離と時間を更新
    async updateSessionWithDistance(sessionId, duration, distance) {
        console.log('🔄 セッション更新（距離込み） - ID:', sessionId, 'Duration:', duration, 'Distance:', distance);
        
        if (this.worker) {
            try {
                await this.execSQL(
                    'UPDATE walking_sessions SET duration = ?, distance = ? WHERE id = ?',
                    [Math.floor(duration / 1000), distance, sessionId]
                );
                console.log('✅ セッション更新完了（距離込み）:', sessionId);
                return sessionId;
            } catch (error) {
                console.error('SQLiteセッション更新エラー:', error);
                // LocalStorageではフォールバック処理
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
            console.log('✅ LocalStorageセッション更新完了（距離込み）:', sessionId);
            return sessionId;
        } else {
            console.warn('⚠️ LocalStorageでセッションが見つかりません:', sessionId);
            // フォールバックとして新しいセッションを作成
            return await this.saveSession(duration);
        }
    }

    async saveSession(duration) {
        // Mock session creation
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
        // Clear localStorage before each test
        localStorageMock.clear();
        jest.clearAllMocks();
    });

    describe('LocalStorage Backend', () => {
        beforeEach(() => {
            model = new TestModel(false); // Use LocalStorage
        });

        test('正常な距離更新 - 既存セッション', async () => {
            // 既存セッションを作成
            const sessionId = await model.saveSession(1800000); // 30分
            
            // 距離を更新
            const duration = 1800000; // 30分 (ms)
            const distance = 2.5; // 2.5km
            
            const result = await model.updateSessionWithDistance(sessionId, duration, distance);
            
            expect(result).toBe(sessionId);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'walkingSessions',
                expect.stringContaining(`"distance":${distance}`)
            );
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'walkingSessions',
                expect.stringContaining(`"duration":1800`) // 秒単位
            );
        });

        test('存在しないセッションの更新 - フォールバック', async () => {
            const nonExistentSessionId = 999999;
            const duration = 1800000;
            const distance = 2.5;
            
            const result = await model.updateSessionWithDistance(nonExistentSessionId, duration, distance);
            
            // 新しいセッションが作成される
            expect(result).not.toBe(nonExistentSessionId);
            expect(typeof result).toBe('number');
            expect(localStorageMock.setItem).toHaveBeenCalled();
        });

        test('距離0の更新', async () => {
            const sessionId = await model.saveSession(1800000);
            const distance = 0;
            
            const result = await model.updateSessionWithDistance(sessionId, 1800000, distance);
            
            expect(result).toBe(sessionId);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'walkingSessions',
                expect.stringContaining(`"distance":0`)
            );
        });

        test('小数点距離の更新', async () => {
            const sessionId = await model.saveSession(1800000);
            const distance = 1.234567;
            
            const result = await model.updateSessionWithDistance(sessionId, 1800000, distance);
            
            expect(result).toBe(sessionId);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'walkingSessions',
                expect.stringContaining(`"distance":1.234567`)
            );
        });

        test('時間の正しい変換（ミリ秒 → 秒）', async () => {
            const sessionId = await model.saveSession(1000);
            const durationMs = 1234567; // 1234.567秒
            const expectedDurationSec = 1234; // 小数点以下切り捨て
            
            const result = await model.updateSessionWithDistance(sessionId, durationMs, 2.5);
            
            expect(result).toBe(sessionId);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'walkingSessions',
                expect.stringContaining(`"duration":${expectedDurationSec}`)
            );
        });

        test('複数セッション存在時の正しい更新', async () => {
            // 3つのセッションを作成
            const session1 = await model.saveSession(1800000);
            const session2 = await model.saveSession(1200000);
            const session3 = await model.saveSession(900000);
            
            // 2番目のセッションを更新
            const result = await model.updateSessionWithDistance(session2, 1200000, 3.5);
            
            expect(result).toBe(session2);
            
            // 更新されたデータを確認
            const sessions = JSON.parse(localStorageMock.getItem('walkingSessions'));
            expect(sessions).toHaveLength(3);
            
            const updatedSession = sessions.find(s => s.id === session2);
            expect(updatedSession.distance).toBe(3.5);
            expect(updatedSession.duration).toBe(1200); // 秒単位
            
            // 他のセッションは変更されていないことを確認
            const session1Data = sessions.find(s => s.id === session1);
            const session3Data = sessions.find(s => s.id === session3);
            expect(session1Data.distance).toBe(0);
            expect(session3Data.distance).toBe(0);
        });

        test('LocalStorage空の状態での更新', async () => {
            // LocalStorageが空の状態で更新を試行
            const nonExistentSessionId = 12345;
            
            const result = await model.updateSessionWithDistance(nonExistentSessionId, 1800000, 2.5);
            
            // 新しいセッションが作成される
            expect(typeof result).toBe('number');
            expect(localStorageMock.setItem).toHaveBeenCalled();
        });
    });

    describe('SQLite Backend with LocalStorage Fallback', () => {
        beforeEach(() => {
            model = new TestModel(true); // Use SQLite
        });

        test('SQLite正常動作時の距離更新', async () => {
            const sessionId = 123;
            const duration = 1800000;
            const distance = 2.5;
            
            // Mock successful SQL execution
            model.execSQL = jest.fn().mockResolvedValue({ success: true });
            
            const result = await model.updateSessionWithDistance(sessionId, duration, distance);
            
            expect(result).toBe(sessionId);
            expect(model.execSQL).toHaveBeenCalledWith(
                'UPDATE walking_sessions SET duration = ?, distance = ? WHERE id = ?',
                [1800, 2.5, 123]
            );
        });

        test('SQLiteエラー時のLocalStorageフォールバック', async () => {
            // 事前にLocalStorageにセッションを作成
            const sessionId = await model.saveSession(1800000);
            
            // SQLite実行エラーをシミュレート
            model.execSQL = jest.fn().mockRejectedValue(new Error('SQL Error'));
            
            const duration = 1800000;
            const distance = 2.5;
            
            const result = await model.updateSessionWithDistance(sessionId, duration, distance);
            
            expect(result).toBe(sessionId);
            expect(model.execSQL).toHaveBeenCalled();
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'walkingSessions',
                expect.stringContaining(`"distance":2.5`)
            );
        });

        test('SQLiteとLocalStorage両方でエラーの場合', async () => {
            // SQLiteエラーをシミュレート
            model.execSQL = jest.fn().mockRejectedValue(new Error('SQL Error'));
            
            // 存在しないセッションで更新を試行
            const nonExistentSessionId = 999999;
            const duration = 1800000;
            const distance = 2.5;
            
            const result = await model.updateSessionWithDistance(nonExistentSessionId, duration, distance);
            
            // 新しいセッションが作成される
            expect(typeof result).toBe('number');
            expect(result).not.toBe(nonExistentSessionId);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        beforeEach(() => {
            model = new TestModel(false);
        });

        test('負の距離値での更新', async () => {
            const sessionId = await model.saveSession(1800000);
            const distance = -1.5; // 負の距離
            
            const result = await model.updateSessionWithDistance(sessionId, 1800000, distance);
            
            expect(result).toBe(sessionId);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'walkingSessions',
                expect.stringContaining(`"distance":-1.5`)
            );
        });

        test('非常に大きな距離値での更新', async () => {
            const sessionId = await model.saveSession(1800000);
            const distance = 999999.99; // 非現実的に大きな距離
            
            const result = await model.updateSessionWithDistance(sessionId, 1800000, distance);
            
            expect(result).toBe(sessionId);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'walkingSessions',
                expect.stringContaining(`"distance":999999.99`)
            );
        });

        test('0時間の更新', async () => {
            const sessionId = await model.saveSession(1000);
            const duration = 0;
            const distance = 1.5;
            
            const result = await model.updateSessionWithDistance(sessionId, duration, distance);
            
            expect(result).toBe(sessionId);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'walkingSessions',
                expect.stringContaining(`"duration":0`)
            );
        });

        test('NaN距離値での更新', async () => {
            const sessionId = await model.saveSession(1800000);
            const distance = NaN;
            
            const result = await model.updateSessionWithDistance(sessionId, 1800000, distance);
            
            expect(result).toBe(sessionId);
            // NaNはJSONで null になる
            const sessions = JSON.parse(localStorageMock.getItem('walkingSessions'));
            const updatedSession = sessions.find(s => s.id === sessionId);
            expect(updatedSession.distance).toBeNull();
        });

        test('文字列のセッションIDでの更新', async () => {
            const sessionId = await model.saveSession(1800000);
            const sessionIdString = sessionId.toString();
            
            const result = await model.updateSessionWithDistance(sessionIdString, 1800000, 2.5);
            
            // 文字列IDでも == 比較で見つかる
            expect(result).toBe(sessionIdString);
            expect(localStorageMock.setItem).toHaveBeenCalled();
        });

        test('LocalStorage破損データの処理', async () => {
            // 破損したJSONデータを設定
            localStorageMock.setItem('walkingSessions', '{"invalid": json}');
            
            await expect(
                model.updateSessionWithDistance(123, 1800000, 2.5)
            ).rejects.toThrow(); // JSON.parseエラーが発生
        });
    });

    describe('Performance Tests', () => {
        beforeEach(() => {
            model = new TestModel(false);
        });

        test('大量のセッション存在時の更新パフォーマンス', async () => {
            // 1000個のセッションを作成
            const sessionIds = [];
            for (let i = 0; i < 1000; i++) {
                const id = await model.saveSession(1800000);
                sessionIds.push(id);
            }
            
            // 500番目のセッションを更新
            const targetSessionId = sessionIds[499];
            
            const startTime = performance.now();
            const result = await model.updateSessionWithDistance(targetSessionId, 1800000, 2.5);
            const endTime = performance.now();
            
            expect(result).toBe(targetSessionId);
            
            // 処理時間が妥当な範囲内（100ms以下）
            const processingTime = endTime - startTime;
            expect(processingTime).toBeLessThan(100);
        });
    });

    describe('Integration Tests', () => {
        test('セッション作成から距離更新までの一連の流れ', async () => {
            model = new TestModel(false);
            
            // 1. セッション作成
            const sessionId = await model.saveSession(1800000);
            expect(typeof sessionId).toBe('number');
            
            // 2. 初期状態確認
            let sessions = JSON.parse(localStorageMock.getItem('walkingSessions'));
            let session = sessions.find(s => s.id === sessionId);
            expect(session.distance).toBe(0);
            expect(session.duration).toBe(1800);
            
            // 3. 距離更新
            const result = await model.updateSessionWithDistance(sessionId, 1800000, 3.2);
            expect(result).toBe(sessionId);
            
            // 4. 更新後の状態確認
            sessions = JSON.parse(localStorageMock.getItem('walkingSessions'));
            session = sessions.find(s => s.id === sessionId);
            expect(session.distance).toBe(3.2);
            expect(session.duration).toBe(1800);
        });
    });
});