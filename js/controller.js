// Controller Layer - Business logic and coordination
import { WalkingModel } from './model.js';
import { WalkingView } from './view.js';

export class WalkingController {
    constructor() {
        this.model = new WalkingModel();
        this.view = new WalkingView();
        this.timer = null;
        this.startTime = null;
        this.pauseTime = 0;
        this.currentPhase = 'ready';
        this.phaseStartTime = null;
        this.intervalCount = 0;
        this.locationTimer = null;
        
        this.PHASES = {
            fast: { name: '速歩き', duration: 3 * 60 * 1000, next: 'slow' },
            slow: { name: 'ゆっくり歩き', duration: 3 * 60 * 1000, next: 'fast' }
        };

        this.router = {
            currentView: 'main',
            isInitialized: false,
            
            init: () => {
                window.addEventListener('hashchange', () => this.router.handleRoute());
                this.router.isInitialized = true;
            },
            
            handleRoute: () => {
                const hash = window.location.hash;
                const url = new URL(window.location);
                const deleted = url.searchParams.get('deleted');
                
                if (hash.startsWith('#session/')) {
                    const sessionId = hash.split('/')[1];
                    this.showSession(sessionId);
                } else if (hash === '#sessions') {
                    this.showSessions();
                } else {
                    // Check for deletion flash message
                    if (deleted === 'session') {
                        this.showMain('セッションが正常に削除されました', 'success');
                        // Clear the parameter from URL to prevent repeated messages
                        const newUrl = new URL(window.location);
                        newUrl.searchParams.delete('deleted');
                        window.history.replaceState({}, '', newUrl.toString());
                    } else {
                        this.showMain();
                    }
                }
            },
            
            navigate: (path) => {
                if (path.startsWith('?')) {
                    // Handle query parameters by updating the current URL
                    const currentUrl = new URL(window.location);
                    const params = new URLSearchParams(path.substring(1));
                    params.forEach((value, key) => {
                        currentUrl.searchParams.set(key, value);
                    });
                    window.history.pushState({}, '', currentUrl.toString());
                    this.router.handleRoute();
                } else {
                    window.location.hash = path;
                }
            }
        };
    }

    async init() {
        await this.model.initSQLite();
        this.router.init();
        this.setupEventListeners();
        
        document.addEventListener('dbReady', () => {
            if (this.router.isInitialized && window.location.hash) {
                this.router.handleRoute();
            } else {
                this.showMain();
            }
        });
    }

    setupEventListeners() {
        document.getElementById('startWalkBtn').addEventListener('click', () => this.startWalk());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopWalk());
        document.getElementById('backBtn').addEventListener('click', () => this.router.navigate(''));
        document.getElementById('backToMainBtn').addEventListener('click', () => this.router.navigate(''));
        document.getElementById('deleteBtn').addEventListener('click', () => this.view.showDeleteConfirmation());
        document.getElementById('cancelBtn').addEventListener('click', () => this.view.hideDeleteConfirmation());
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.deleteCurrentSession());
        document.getElementById('prevPageBtn').addEventListener('click', () => this.goToPreviousPage());
        document.getElementById('nextPageBtn').addEventListener('click', () => this.goToNextPage());
        
        // Data management event listeners
        document.getElementById('dataManagementBtn').addEventListener('click', () => this.showDataManagement());
        document.getElementById('closeDataModalBtn').addEventListener('click', () => this.hideDataManagement());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFileInput').click();
        });
        document.getElementById('importFileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const mergeMode = document.getElementById('mergeCheckbox').checked;
                this.importData(file, { merge: mergeMode });
                e.target.value = ''; // Reset file input
            }
        });
    }

    // Navigation methods
    showMain(flashMessage = null, flashType = 'success') {
        this.view.showMainView();
        this.router.currentView = 'main';
        this.loadSessions();
        this.updateWeeklyStats();
        
        // Show flash message if provided
        if (flashMessage) {
            this.view.showFlashMessage(flashMessage, flashType);
        }
    }

    showSessions() {
        this.view.showSessionsView();
        this.router.currentView = 'sessions';
        this.loadAllSessions();
    }

    showSession(sessionId) {
        this.model.currentSessionId = sessionId;
        this.view.showSessionView();
        this.router.currentView = 'session';
        
        if (this.model.worker) {
            this.loadSessionDetails(sessionId);
        } else {
            const sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
            if (sessions.length > 0) {
                this.loadSessionDetailsFromLocalStorage(sessionId);
            }
        }
    }

    // Walking session methods
    async startWalk() {
        const sessionStartTime = Date.now();
        
        // まず最初にセッションをデータベースに作成
        const sessionId = await this.model.createInitialSession(sessionStartTime);
        console.log('🆔 セッション開始 - セッションID:', sessionId);
        
        this.model.currentSession = {
            startTime: sessionStartTime,
            intervals: []
        };
        this.model.currentSessionId = sessionId; // 一貫したセッションIDを使用
        
        this.startTime = sessionStartTime;
        this.pauseTime = 0;
        this.currentPhase = 'fast';
        this.phaseStartTime = sessionStartTime;
        this.intervalCount = 0;

        this.view.showSessionUI();
        this.view.updatePhaseDisplay(this.currentPhase);
        this.startTimer();
        this.startLocationTracking();
        this.trackLocation();
    }

    togglePause() {
        if (this.timer) {
            this.pauseWalk();
        } else {
            this.resumeWalk();
        }
    }

    pauseWalk() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            this.pauseTime = Date.now();
            this.view.updatePauseButton(true);
            this.stopLocationTracking();
            this.trackLocation();
        }
    }

    resumeWalk() {
        if (!this.timer && this.pauseTime > 0) {
            const pausedDuration = Date.now() - this.pauseTime;
            this.startTime += pausedDuration;
            this.phaseStartTime += pausedDuration;
            this.pauseTime = 0;
            
            this.startTimer();
            this.view.updatePauseButton(false);
            this.startLocationTracking();
            this.trackLocation();
        }
    }

    async stopWalk() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        this.stopLocationTracking();
        
        const duration = Date.now() - this.startTime;
        console.log('🛑 セッション停止 - 既存セッションを更新:', this.model.currentSessionId);
        
        // 最後の位置データを同じセッションIDで保存
        await this.trackLocation();
        
        // 位置情報から距離を計算
        const locations = await this.model.getLocationsBySessionId(this.model.currentSessionId);
        const totalDistance = this.calculateTotalDistance(locations);
        console.log('📏 計算された距離:', totalDistance, 'km');
        
        // 既存のセッションを距離と時間で更新
        await this.model.updateSessionWithDistance(this.model.currentSessionId, duration, totalDistance);
        
        // セッション完了後、そのセッションの詳細ページに遷移
        const completedSessionId = this.model.currentSessionId;
        this.model.currentSession = null;
        this.model.currentSessionId = null;
        this.view.hideSessionUI();
        this.router.navigate(`session/${completedSessionId}`);
    }

    startTimer() {
        this.timer = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            this.view.updateTimeDisplay(minutes, seconds);

            const phaseElapsed = Date.now() - this.phaseStartTime;
            if (phaseElapsed >= this.PHASES[this.currentPhase].duration) {
                if (this.intervalCount < 4) {
                    this.currentPhase = this.PHASES[this.currentPhase].next;
                    this.phaseStartTime = Date.now();
                    this.view.updatePhaseDisplay(this.currentPhase);
                    
                    if (this.currentPhase === 'fast') {
                        this.intervalCount++;
                    }
                } else {
                    this.stopWalk();
                    return;
                }
            }
        }, 1000);

        this.view.updatePhaseDisplay(this.currentPhase);
    }

    // Location tracking methods
    startLocationTracking() {
        this.locationTimer = setInterval(() => {
            this.trackLocation();
        }, 60000);  // 1分ごとに位置情報を取得
    }

    stopLocationTracking() {
        if (this.locationTimer) {
            clearInterval(this.locationTimer);
            this.locationTimer = null;
        }
    }

    trackLocation() {
        return new Promise((resolve) => {
            console.log('📍 位置情報取得を試みています...');
            
            if (!navigator.geolocation) {
                console.log('⚠️ このブラウザは位置情報をサポートしていません');
                this.useMockLocation(resolve);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('✅ 位置情報取得成功:', position.coords);
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        timestamp: Date.now(),
                        phase: this.currentPhase
                    };
                    
                    if (this.model.currentSession) {
                        this.model.saveLocation(this.model.currentSessionId, location);
                    }
                    resolve();
                },
                (error) => {
                    console.log('❌ 位置情報取得失敗:', error.message);
                    this.useMockLocation(resolve);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        });
    }

    useMockLocation(resolve) {
        console.log('🧪 モック位置情報を使用します（東京駅周辺）');
        const mockLocation = {
            lat: 35.6762 + (Math.random() - 0.5) * 0.01,
            lng: 139.6503 + (Math.random() - 0.5) * 0.01,
            timestamp: Date.now(),
            phase: this.currentPhase
        };
        
        console.log('📍 モック位置情報:', mockLocation);
        
        if (this.model.currentSession) {
            this.model.saveLocation(this.model.currentSessionId, mockLocation);
        }
        resolve();
    }

    // Session loading methods
    async loadSessions() {
        try {
            const sessions = await this.model.getRecentSessions(3);
            const allSessionsCount = await this.model.getAllSessionsCount();
            this.view.clearSessionLists();
            
            const sessionList = document.getElementById('sessionList');
            
            if (sessions.length === 0) {
                sessionList.innerHTML = '<p class="text-gray-500 text-sm">まだセッションがありません</p>';
                return;
            }

            // Recalculate distance for each session from location data
            for (const session of sessions) {
                const locations = await this.model.getLocationsBySessionId(session.id);
                if (locations && locations.length > 0) {
                    const calculatedDistance = this.calculateTotalDistance(locations);
                    session.calculatedDistance = calculatedDistance;
                    // Update the session.distance field to ensure consistency
                    session.distance = calculatedDistance;
                }
                sessionList.appendChild(this.view.addSessionToDOM(session));
            }

            // Show "more" button only if there are more than 3 sessions total
            if (allSessionsCount > 3) {
                this.view.showMoreSessionsButton();
            }
        } catch (error) {
            console.error('セッション読み込みエラー:', error);
        }
    }

    async loadAllSessions(page = 1) {
        try {
            const { sessions, totalCount } = await this.model.getAllSessions(page, 10);
            
            const allSessionsList = document.getElementById('allSessionsList');
            allSessionsList.innerHTML = '';
            
            if (sessions.length === 0) {
                allSessionsList.innerHTML = '<p class="text-gray-500 text-sm">まだセッションがありません</p>';
                this.view.updatePaginationControls(1, 1, 0);
                return;
            }

            // Recalculate distance for each session from location data
            for (const session of sessions) {
                const locations = await this.model.getLocationsBySessionId(session.id);
                if (locations && locations.length > 0) {
                    const calculatedDistance = this.calculateTotalDistance(locations);
                    session.calculatedDistance = calculatedDistance;
                    // Update the session.distance field to ensure consistency
                    session.distance = calculatedDistance;
                }
                allSessionsList.appendChild(this.view.addSessionToAllSessionsDOM(session));
            }

            const totalPages = Math.ceil(totalCount / 10);
            this.view.updatePaginationControls(page, totalPages, totalCount);
        } catch (error) {
            console.error('全セッション読み込みエラー:', error);
        }
    }

    async loadSessionDetails(sessionId) {
        try {
            const session = await this.model.getSessionById(sessionId);
            if (!session) {
                console.warn('セッションが見つかりません:', sessionId);
                this.router.navigate('');
                return;
            }

            console.log('🔍 Loading session details for session ID:', sessionId);
            const locations = await this.model.getLocationsBySessionId(sessionId);
            console.log('📊 Retrieved locations:', locations);
            console.log('📊 Number of locations:', locations ? locations.length : 0);
            
            // 位置情報から距離を再計算（既存のセッションでも正確な距離を表示）
            if (locations && locations.length > 0) {
                const calculatedDistance = this.calculateTotalDistance(locations);
                session.calculatedDistance = calculatedDistance;
                console.log('📏 再計算された距離:', calculatedDistance, 'km');
            }
            
            this.view.displaySessionDetails(session, locations);
        } catch (error) {
            console.error('セッション詳細読み込みエラー:', error);
        }
    }

    loadSessionDetailsFromLocalStorage(sessionId) {
        const sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
        const session = sessions.find(s => s.id == sessionId);
        
        if (!session) {
            console.warn('セッションが見つかりません:', sessionId);
            this.router.navigate('');
            return;
        }

        const locations = JSON.parse(localStorage.getItem('walkingLocations') || '[]')
            .filter(l => l.session_id == sessionId)
            .sort((a, b) => a.timestamp - b.timestamp);
        
        // 位置情報から距離を再計算（LocalStorageの既存セッションでも正確な距離を表示）
        if (locations && locations.length > 0) {
            const calculatedDistance = this.calculateTotalDistance(locations);
            session.calculatedDistance = calculatedDistance;
            console.log('📏 LocalStorage - 再計算された距離:', calculatedDistance, 'km');
        }
            
        this.view.displaySessionDetails(session, locations);
    }

    async updateWeeklyStats() {
        try {
            const stats = await this.model.getWeeklyStats();
            this.view.updateWeeklyStats(stats);
            
            // Also update daily stats graph
            const dailyStats = await this.model.getDailyStats();
            this.view.updateDailyGraph(dailyStats);
            
            // Update weekly achievement display
            const weeklyAchievement = await this.model.getWeeklyAchievement();
            this.view.updateWeeklyAchievement(weeklyAchievement);
        } catch (error) {
            console.error('週間統計読み込みエラー:', error);
        }
    }

    // Data Export/Import methods
    async exportData() {
        try {
            console.log('📤 データエクスポートを開始...');
            const exportData = await this.model.exportAllData();
            
            // Create downloadable file
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            // Generate filename with current date
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
            const filename = `jpwalk-data-${dateStr}.json`;
            
            // Check if iOS Safari (iPhone/iPad)
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            
            if (isIOS || isSafari) {
                // iOS Safari specific handling
                // Convert blob to data URL for better iOS compatibility
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result;
                    const downloadLink = document.createElement('a');
                    downloadLink.href = dataUrl;
                    downloadLink.download = filename;
                    downloadLink.setAttribute('target', '_blank');
                    
                    // Add visual indication for iOS
                    downloadLink.textContent = 'Download ' + filename;
                    downloadLink.style.position = 'fixed';
                    downloadLink.style.top = '50%';
                    downloadLink.style.left = '50%';
                    downloadLink.style.transform = 'translate(-50%, -50%)';
                    downloadLink.style.padding = '12px 24px';
                    downloadLink.style.backgroundColor = '#3B82F6';
                    downloadLink.style.color = 'white';
                    downloadLink.style.borderRadius = '8px';
                    downloadLink.style.textDecoration = 'none';
                    downloadLink.style.zIndex = '10000';
                    downloadLink.style.fontSize = '16px';
                    downloadLink.style.fontWeight = 'bold';
                    downloadLink.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                    
                    document.body.appendChild(downloadLink);
                    
                    // For iOS, we need user interaction to trigger download
                    downloadLink.addEventListener('click', () => {
                        setTimeout(() => {
                            document.body.removeChild(downloadLink);
                        }, 1000);
                    });
                    
                    // Auto-remove after 10 seconds if not clicked
                    setTimeout(() => {
                        if (document.body.contains(downloadLink)) {
                            document.body.removeChild(downloadLink);
                        }
                    }, 10000);
                    
                    // Show instruction for iOS users
                    alert(`ファイル「${filename}」をダウンロードするには、表示されたボタンをタップしてください。\n\nダウンロード後、「ファイル」アプリの「ダウンロード」フォルダで確認できます。`);
                };
                reader.readAsDataURL(dataBlob);
                
            } else {
                // Standard download for other browsers
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
            }
            
            console.log('✅ データエクスポート完了:', filename);
            this.view.showExportSuccess(exportData.metadata);
            
        } catch (error) {
            console.error('エクスポートエラー:', error);
            this.view.showExportError(error.message);
        }
    }

    async importData(file, options = { merge: false }) {
        try {
            console.log('📥 データインポートを開始...');
            
            const fileContent = await this.readFileAsText(file);
            const importData = JSON.parse(fileContent);
            
            const result = await this.model.importAllData(importData, {
                merge: options.merge,
                validate: true
            });
            
            console.log('✅ データインポート完了:', result);
            this.view.showImportSuccess(result);
            
            // Refresh the UI to show imported data
            await this.loadSessions();
            await this.updateWeeklyStats();
            
        } catch (error) {
            console.error('インポートエラー:', error);
            this.view.showImportError(error.message);
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('ファイルの読み込みに失敗しました'));
            reader.readAsText(file);
        });
    }

    showDataManagement() {
        this.view.showDataManagementModal();
    }

    hideDataManagement() {
        this.view.hideDataManagementModal();
    }

    // Pagination methods
    goToPreviousPage() {
        if (this.view.currentSessionsPage > 1) {
            this.loadAllSessions(this.view.currentSessionsPage - 1);
        }
    }

    goToNextPage() {
        this.loadAllSessions(this.view.currentSessionsPage + 1);
    }

    // Delete session
    async deleteCurrentSession() {
        try {
            await this.model.deleteSessionById(this.model.currentSessionId);
            this.view.hideDeleteConfirmation();
            
            // Navigate to main with flash message
            this.router.navigate('?deleted=session');
        } catch (error) {
            console.error('セッション削除エラー:', error);
            this.view.showFlashMessage('セッションの削除に失敗しました', 'error');
        }
    }

    // Utility methods
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
}