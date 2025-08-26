// Model Layer - Data management and business logic
export class WalkingModel {
    constructor() {
        this.worker = null;
        this.requestId = 0;
        this.pendingRequests = new Map();
        this.currentSession = null;
        this.currentSessionId = null;
        this.localStorageSessionId = 0;
    }

    // Database operations
    async initSQLite() {
        try {
            console.log('SQLite WASMを初期化中...');
            
            this.worker = new Worker('sqlite-worker.js');
            
            this.worker.onmessage = (event) => {
                const { type, id, result, error, data } = event.data;
                
                if (type === 'log') {
                    console.log(data);
                    return;
                }
                
                if (type === 'dbReady') {
                    console.log('✅ SQLite + IndexedDB の初期化完了（永続化対応）');
                    document.dispatchEvent(new CustomEvent('dbReady'));
                    return;
                }
                
                const promise = this.pendingRequests.get(id);
                if (promise) {
                    this.pendingRequests.delete(id);
                    if (error || type.includes('Error')) {
                        promise.reject(new Error(error));
                    } else {
                        promise.resolve(result);
                    }
                }
            };

            this.worker.onerror = (error) => {
                console.error('Worker error:', error);
                this.initLocalStorageFallback();
            };

            // Initialize the worker
            this.worker.postMessage({ type: 'init' });

            // Wait for dbReady event from worker instead of manually creating tables
            
        } catch (error) {
            console.error('SQLite 初期化エラー:', error);
            this.initLocalStorageFallback();
        }
    }

    initLocalStorageFallback() {
        console.log('LocalStorageフォールバックを使用します');
        
        if (!localStorage.getItem('walkingSessions')) {
            localStorage.setItem('walkingSessions', JSON.stringify([]));
        }
        if (!localStorage.getItem('walkingLocations')) {
            localStorage.setItem('walkingLocations', JSON.stringify([]));
        }
        
        this.localStorageSessionId = parseInt(localStorage.getItem('lastSessionId') || '0');
        
        document.dispatchEvent(new CustomEvent('dbReady'));
    }

    async execSQL(query, params = []) {
        if (!this.worker) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const id = ++this.requestId;
            this.pendingRequests.set(id, { resolve, reject });
            
            this.worker.postMessage({
                type: 'exec',
                id,
                data: {
                    id,
                    sql: query,
                    bind: params.length > 0 ? params : null
                }
            });
        });
    }

    async selectObjects(query, params = []) {
        if (!this.worker) {
            const sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
            return sessions;
        }

        return new Promise((resolve, reject) => {
            const id = ++this.requestId;
            this.pendingRequests.set(id, { resolve, reject });
            
            this.worker.postMessage({
                type: 'selectObjects',
                id,
                data: {
                    id,
                    sql: query,
                    bind: params.length > 0 ? params : null
                }
            });
        });
    }

    async selectObject(query, params = []) {
        const results = await this.selectObjects(query, params);
        return results.length > 0 ? results[0] : null;
    }

    async selectValue(query, params = []) {
        if (!this.worker) {
            const result = await this.selectObject(query, params);
            return result ? Object.values(result)[0] : null;
        }

        return new Promise((resolve, reject) => {
            const id = ++this.requestId;
            this.pendingRequests.set(id, { resolve, reject });
            
            this.worker.postMessage({
                type: 'selectValue',
                id,
                data: {
                    id,
                    sql: query,
                    bind: params.length > 0 ? params : null
                }
            });
        });
    }

    // Session management
    async saveSession(duration) {
        const sessionData = {
            duration: Math.floor(duration / 1000),
            distance: 0,
            created_at: new Date(this.currentSession.startTime).toISOString()
        };

        if (this.worker) {
            try {
                const result = await this.execSQL(
                    'INSERT INTO walking_sessions (duration, distance, created_at) VALUES (?, ?, ?)',
                    [sessionData.duration, sessionData.distance, sessionData.created_at]
                );
                
                // Get the session ID from the exec result
                const sessionId = result.lastInsertRowId;
                console.log('セッションをSQLiteに保存しました:', sessionId);
                return sessionId;
            } catch (error) {
                console.error('SQLiteセッション保存エラー:', error);
                return this.saveSessionToLocalStorage(sessionData);
            }
        } else {
            return this.saveSessionToLocalStorage(sessionData);
        }
    }

    saveSessionToLocalStorage(sessionData) {
        const sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
        const sessionId = ++this.localStorageSessionId;
        
        const session = {
            id: sessionId,
            ...sessionData
        };
        
        sessions.push(session);
        localStorage.setItem('walkingSessions', JSON.stringify(sessions));
        localStorage.setItem('lastSessionId', sessionId.toString());
        
        console.log('セッションをLocalStorageに保存しました:', sessionId);
        return sessionId;
    }

    // セッション開始時にデータベースに初期セッションを作成
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
                return this.saveSessionToLocalStorage(sessionData);
            }
        } else {
            return this.saveSessionToLocalStorage(sessionData);
        }
    }

    // セッション終了時にデータを更新
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
                // LocalStorageでは新規作成になってしまうが、フォールバック
                return await this.saveSession(duration);
            }
        } else {
            // LocalStorageでは更新が難しいので新規作成
            return await this.saveSession(duration);
        }
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
        const sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
        const sessionIndex = sessions.findIndex(s => s.id == sessionId);
        
        if (sessionIndex !== -1) {
            sessions[sessionIndex].duration = Math.floor(duration / 1000);
            sessions[sessionIndex].distance = distance;
            localStorage.setItem('walkingSessions', JSON.stringify(sessions));
            console.log('✅ LocalStorageセッション更新完了（距離込み）:', sessionId);
            return sessionId;
        } else {
            console.warn('⚠️ LocalStorageでセッションが見つかりません:', sessionId);
            // フォールバックとして新しいセッションを作成
            return await this.saveSession(duration);
        }
    }

    async saveLocation(sessionId, location) {
        console.log('💾 Saving location for session ID:', sessionId);
        console.log('📍 Location data:', location);
        console.log('🔄 Current session state:', this.currentSession);
        
        const locationData = {
            session_id: sessionId,
            latitude: location.lat,
            longitude: location.lng,
            timestamp: location.timestamp,
            phase: location.phase,
            created_at: new Date(this.currentSession.startTime).toISOString()
        };

        if (this.worker) {
            try {
                const result = await this.execSQL(
                    'INSERT INTO walking_locations (session_id, latitude, longitude, timestamp, phase, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                    [locationData.session_id, locationData.latitude, locationData.longitude, locationData.timestamp, locationData.phase, locationData.created_at]
                );
                console.log('📍 位置情報をSQLiteに保存しました:', location);
                console.log('💾 Insert result:', result);
            } catch (error) {
                console.error('SQLite位置情報保存エラー:', error);
                this.saveLocationToLocalStorage(locationData);
            }
        } else {
            this.saveLocationToLocalStorage(locationData);
        }
    }

    saveLocationToLocalStorage(locationData) {
        const locations = JSON.parse(localStorage.getItem('walkingLocations') || '[]');
        locations.push({
            id: Date.now(),
            ...locationData
        });
        localStorage.setItem('walkingLocations', JSON.stringify(locations));
        console.log('📍 位置情報をLocalStorageに保存しました:', locationData);
    }

    async getSessionById(sessionId) {
        if (this.worker) {
            return await this.selectObject('SELECT * FROM walking_sessions WHERE id = ?', [sessionId]);
        } else {
            const sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
            return sessions.find(s => s.id == sessionId);
        }
    }

    async getLocationsBySessionId(sessionId) {
        console.log('🔍 Getting locations for session ID:', sessionId);
        
        if (this.worker) {
            const locations = await this.selectObjects('SELECT * FROM walking_locations WHERE session_id = ? ORDER BY timestamp', [sessionId]);
            console.log('📊 SQLite query result for session', sessionId, ':', locations);
            return locations;
        } else {
            const locations = JSON.parse(localStorage.getItem('walkingLocations') || '[]');
            const filtered = locations.filter(l => l.session_id == sessionId).sort((a, b) => a.timestamp - b.timestamp);
            console.log('📊 LocalStorage filtered result for session', sessionId, ':', filtered);
            return filtered;
        }
    }

    async getRecentSessions(limit = 3) {
        if (this.worker) {
            return await this.selectObjects('SELECT * FROM walking_sessions ORDER BY created_at DESC LIMIT ?', [limit]);
        } else {
            const sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
            return sessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
        }
    }

    async getAllSessions(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        
        if (this.worker) {
            const sessions = await this.selectObjects('SELECT * FROM walking_sessions ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
            const totalCount = await this.selectValue('SELECT COUNT(*) FROM walking_sessions');
            return { sessions, totalCount };
        } else {
            const allSessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
            const sorted = allSessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            const sessions = sorted.slice(offset, offset + limit);
            return { sessions, totalCount: allSessions.length };
        }
    }

    // Get total count of all sessions
    async getAllSessionsCount() {
        if (this.worker) {
            try {
                const result = await this.selectValue('SELECT COUNT(*) FROM walking_sessions');
                return result || 0;
            } catch (error) {
                console.error('セッション数取得エラー:', error);
                return 0;
            }
        } else {
            const sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
            return sessions.length;
        }
    }

    async getWeeklyStats() {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekAgoISOString = oneWeekAgo.toISOString();

        if (this.worker) {
            const count = await this.selectValue('SELECT COUNT(*) FROM walking_sessions WHERE created_at >= ?', [oneWeekAgoISOString]);
            const duration = await this.selectValue('SELECT SUM(duration) FROM walking_sessions WHERE created_at >= ?', [oneWeekAgoISOString]);
            return { count: count || 0, duration: duration || 0 };
        } else {
            const sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
            const weekSessions = sessions.filter(s => new Date(s.created_at) >= oneWeekAgo);
            const count = weekSessions.length;
            const duration = weekSessions.reduce((sum, s) => sum + s.duration, 0);
            return { count, duration };
        }
    }

    async deleteSessionById(sessionId) {
        if (this.worker) {
            await this.execSQL('DELETE FROM walking_locations WHERE session_id = ?', [sessionId]);
            await this.execSQL('DELETE FROM walking_sessions WHERE id = ?', [sessionId]);
        } else {
            let sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
            sessions = sessions.filter(s => s.id != sessionId);
            localStorage.setItem('walkingSessions', JSON.stringify(sessions));
            
            let locations = JSON.parse(localStorage.getItem('walkingLocations') || '[]');
            locations = locations.filter(l => l.session_id != sessionId);
            localStorage.setItem('walkingLocations', JSON.stringify(locations));
        }
    }

    
    // Data Export/Import functionality
    async exportAllData() {
        try {
            let sessions = [];
            let locations = [];

            if (this.worker) {
                // Get all sessions from SQLite (exclude the unused locations column)
                sessions = await this.selectObjects('SELECT id, duration, distance, created_at FROM walking_sessions ORDER BY created_at DESC');
                
                // Get all locations from SQLite
                locations = await this.selectObjects('SELECT * FROM walking_locations ORDER BY session_id, timestamp');
            } else {
                // Get data from LocalStorage
                sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
                locations = JSON.parse(localStorage.getItem('walkingLocations') || '[]');
            }

            const exportData = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                appName: 'Japanese Walking (インターバル速歩)',
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

    async importAllData(importData, options = { merge: false, validate: true }) {
        try {
            // Validate import data structure
            if (options.validate) {
                this.validateImportData(importData);
            }

            const { sessions, locations } = importData.data;
            
            if (!options.merge) {
                // Clear existing data before import
                await this.clearAllData();
            }

            // Import sessions
            let importedSessionsCount = 0;
            for (const session of sessions) {
                try {
                    if (this.worker) {
                        // Check if session already exists (for merge mode)
                        if (options.merge) {
                            const existing = await this.selectValue('SELECT COUNT(*) FROM walking_sessions WHERE id = ?', [session.id]);
                            if (existing > 0) {
                                console.log(`⏭️ セッション ${session.id} は既に存在するためスキップ`);
                                continue;
                            }
                        }

                        // Only import the essential fields, excluding the unused locations column
                        await this.execSQL(
                            'INSERT INTO walking_sessions (id, duration, distance, created_at) VALUES (?, ?, ?, ?)',
                            [session.id, session.duration, session.distance || 0, session.created_at]
                        );
                    } else {
                        // LocalStorage import - clean session object by removing locations field
                        const cleanSession = {
                            id: session.id,
                            duration: session.duration,
                            distance: session.distance || 0,
                            created_at: session.created_at
                        };
                        const existingSessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
                        if (!options.merge || !existingSessions.find(s => s.id === session.id)) {
                            existingSessions.push(cleanSession);
                            localStorage.setItem('walkingSessions', JSON.stringify(existingSessions));
                        }
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
                        // Check if location already exists (for merge mode)
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
                    } else {
                        // LocalStorage import
                        const existingLocations = JSON.parse(localStorage.getItem('walkingLocations') || '[]');
                        if (!options.merge || !existingLocations.find(l => l.id === location.id)) {
                            existingLocations.push(location);
                            localStorage.setItem('walkingLocations', JSON.stringify(existingLocations));
                        }
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
        try {
            if (this.worker) {
                // Clear SQLite data
                await this.execSQL('DELETE FROM walking_locations');
                await this.execSQL('DELETE FROM walking_sessions');
                console.log('🗑️ SQLiteデータをクリアしました');
            } else {
                // Clear LocalStorage data
                localStorage.removeItem('walkingSessions');
                localStorage.removeItem('walkingLocations');
                console.log('🗑️ LocalStorageデータをクリアしました');
            }
        } catch (error) {
            console.error('データクリアエラー:', error);
            throw new Error('データのクリアに失敗しました: ' + error.message);
        }
    }
}