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

    async saveLocation(sessionId, location) {
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
                await this.execSQL(
                    'INSERT INTO walking_locations (session_id, latitude, longitude, timestamp, phase, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                    [locationData.session_id, locationData.latitude, locationData.longitude, locationData.timestamp, locationData.phase, locationData.created_at]
                );
                console.log('📍 位置情報をSQLiteに保存しました:', location);
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
        if (this.worker) {
            return await this.selectObjects('SELECT * FROM walking_locations WHERE session_id = ? ORDER BY timestamp', [sessionId]);
        } else {
            const locations = JSON.parse(localStorage.getItem('walkingLocations') || '[]');
            return locations.filter(l => l.session_id == sessionId).sort((a, b) => a.timestamp - b.timestamp);
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
}