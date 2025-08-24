let worker;
let requestId = 0;
const pendingRequests = new Map();

let currentSession = null;
let timer = null;
let startTime = null;
let pauseTime = 0;
let currentPhase = 'ready';
let phaseStartTime = null;
let intervalCount = 0;
let currentSessionId = null;
let locationTimer = null;
let map = null;
let routeLine = null;

const PHASES = {
    fast: { name: '速歩き', duration: 3 * 60 * 1000, next: 'slow' },
    slow: { name: 'ゆっくり歩き', duration: 3 * 60 * 1000, next: 'fast' }
};

const log = (msg, isError = false) => {
    console.log(msg);
};

// Routing
const router = {
    currentView: 'main',
    isInitialized: false,
    
    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        // Don't handle initial route immediately - wait for database to be ready
        this.isInitialized = true;
    },
    
    handleRoute() {
        const hash = window.location.hash;
        if (hash.startsWith('#session/')) {
            const sessionId = hash.split('/')[1];
            this.showSession(sessionId);
        } else if (hash === '#sessions') {
            this.showSessions();
        } else {
            this.showMain();
        }
    },
    
    showMain() {
        document.getElementById('mainView').classList.remove('hidden');
        document.getElementById('sessionView').classList.add('hidden');
        document.getElementById('sessionsView').classList.add('hidden');
        this.currentView = 'main';
        loadSessions();
        updateWeeklyStats();
    },
    
    showSessions() {
        document.getElementById('mainView').classList.add('hidden');
        document.getElementById('sessionView').classList.add('hidden');
        document.getElementById('sessionsView').classList.remove('hidden');
        this.currentView = 'sessions';
        loadAllSessions();
    },
    
    showSession(sessionId) {
        currentSessionId = sessionId;
        document.getElementById('mainView').classList.add('hidden');
        document.getElementById('sessionView').classList.remove('hidden');
        document.getElementById('sessionsView').classList.add('hidden');
        this.currentView = 'session';
        // Only load details if data storage is ready
        // If SQLite worker exists, use it
        if (worker) {
            loadSessionDetails(sessionId);
        } 
        // If no worker but localStorage has data, use localStorage
        else {
            const sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
            if (sessions.length > 0) {
                loadSessionDetailsFromLocalStorage(sessionId);
            }
            // If neither is ready, details will be loaded when dbReady or localStorage fallback is triggered
        }
    },
    
    navigate(path) {
        window.location.hash = path;
    }
};;

const initSQLite = async () => {
    try {
        log('SQLite WASMを初期化中...');
        
        // sql.js doesn't require Cross-Origin Isolation
        
        worker = new Worker('sqlite-worker.js');
        
        worker.onmessage = (event) => {
            const message = event.data;
            const { type, data, id } = message;
            
            switch (type) {
                case 'log':
                    console.log(data);
                    break;
                case 'error':
                    console.error(data);
                    break;
                case 'initialized':
                    log('✅ SQLite + IndexedDB の初期化完了（永続化対応）');
                    break;
                case 'dbReady':
                    // Handle initial route now that database is ready
                    if (router.isInitialized) {
                        router.handleRoute();
                    } else {
                        // Fallback if router wasn't initialized yet
                        const hash = window.location.hash;
                        if (hash.startsWith('#session/')) {
                            const sessionId = hash.split('/')[1];
                            loadSessionDetails(sessionId);
                        } else {
                            loadSessions();
                            updateWeeklyStats();
                        }
                    }
                    break;
                case 'initError':
                    console.error('Worker initialization error:', data ? data.error : 'Unknown error');
                    log('❌ SQLiteの初期化に失敗しました。ローカルストレージを使用します。', true);
                    initLocalStorageFallback();
                    break;
                case 'execResult':
                case 'selectResult':
                case 'selectValueResult':
                case 'selectObjectResult':
                    if (pendingRequests.has(id)) {
                        pendingRequests.get(id).resolve(event.data.result);
                        pendingRequests.delete(id);
                    }
                    break;
                case 'execError':
                case 'selectError':
                case 'selectValueError':
                case 'selectObjectError':
                    if (pendingRequests.has(id)) {
                        pendingRequests.get(id).reject(new Error(event.data.error));
                        pendingRequests.delete(id);
                    }
                    break;
            }
        };
        
        worker.postMessage({ type: 'init' });
        
    } catch (error) {
        console.error('エラー:', error);
        log('❌ SQLiteの初期化に失敗しました。ローカルストレージを使用します。', true);
        initLocalStorageFallback();
    }
};

const execSQL = (sql, bind = []) => {
    return new Promise((resolve, reject) => {
        const id = requestId++;
        pendingRequests.set(id, { resolve, reject });
        worker.postMessage({ type: 'exec', data: { id, sql, bind } });
    });
};

const selectObjects = (sql, bind = []) => {
    return new Promise((resolve, reject) => {
        const id = requestId++;
        pendingRequests.set(id, { resolve, reject });
        worker.postMessage({ type: 'selectObjects', data: { id, sql, bind } });
    });
};

const selectValue = (sql, bind = []) => {
    return new Promise((resolve, reject) => {
        const id = requestId++;
        pendingRequests.set(id, { resolve, reject });
        worker.postMessage({ type: 'selectValue', data: { id, sql, bind } });
    });
};

const selectObject = (sql, bind = []) => {
    return new Promise((resolve, reject) => {
        const id = requestId++;
        pendingRequests.set(id, { resolve, reject });
        worker.postMessage({ type: 'selectObject', data: { id, sql, bind } });
    });
};

const loadSessions = async () => {
    if (!worker) {
        loadSessionsFromLocalStorage();
        return;
    }
    
    try {
        const sessions = await selectObjects('SELECT * FROM walking_sessions ORDER BY created_at DESC LIMIT 3');
        const sessionList = document.getElementById('sessionList');
        sessionList.innerHTML = '';
        
        if (sessions.length === 0) {
            sessionList.innerHTML = '<p class="text-gray-500 text-center py-8">まだセッションがありません</p>';
            return;
        }
        
        sessions.forEach(session => {
            addSessionToDOM(session);
        });
        
        // Add "more sessions" button if there might be more sessions
        const totalSessions = await selectValue('SELECT COUNT(*) FROM walking_sessions');
        if (totalSessions > 3) {
            const moreButton = document.createElement('button');
            moreButton.className = 'w-full text-blue-500 hover:text-blue-600 text-sm py-2 mt-3 transition-colors';
            moreButton.textContent = 'もっと見る';
            moreButton.onclick = () => router.navigate('sessions');
            sessionList.appendChild(moreButton);
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
};

const loadAllSessions = async () => {
    if (!worker) {
        loadAllSessionsFromLocalStorage();
        return;
    }
    
    try {
        const sessions = await selectObjects('SELECT * FROM walking_sessions ORDER BY created_at DESC');
        const allSessionsList = document.getElementById('allSessionsList');
        allSessionsList.innerHTML = '';
        
        if (sessions.length === 0) {
            allSessionsList.innerHTML = '<p class="text-gray-500 text-center py-8">まだセッションがありません</p>';
            return;
        }
        
        sessions.forEach(session => {
            addSessionToAllSessionsDOM(session);
        });
    } catch (error) {
        console.error('Error loading all sessions:', error);
    }
};

const addSessionToAllSessionsDOM = (session) => {
    const allSessionsList = document.getElementById('allSessionsList');
    const sessionItem = document.createElement('div');
    sessionItem.onclick = () => router.navigate(`session/${session.id}`);
    sessionItem.className = 'cursor-pointer block border-b border-gray-200 pb-3 flex justify-between items-center hover:bg-gray-50 transition-colors';
    
    const date = new Date(session.created_at);
    const dateStr = date.toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const duration = Math.round(session.duration / 60000);
    const distance = (session.distance || 0).toFixed(1);
    
    sessionItem.innerHTML = `
        <div class="flex-1">
            <div class="text-gray-800">${dateStr} ${timeStr}</div>
            <div class="text-sm text-gray-600">${duration}分 • ${distance}km</div>
        </div>
        <div class="text-green-600 text-sm font-medium">完了</div>
    `;
    
    allSessionsList.appendChild(sessionItem);
};

const loadAllSessionsFromLocalStorage = () => {
    const sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
    const allSessionsList = document.getElementById('allSessionsList');
    allSessionsList.innerHTML = '';
    
    if (sessions.length === 0) {
        allSessionsList.innerHTML = '<p class="text-gray-500 text-center py-8">まだセッションがありません</p>';
        return;
    }
    
    sessions.reverse().forEach(session => {
        addSessionToAllSessionsDOM(session);
    });
};

const addSessionToDOM = (session) => {
    const sessionList = document.getElementById('sessionList');
    const sessionItem = document.createElement('div');
    sessionItem.onclick = () => router.navigate(`session/${session.id}`);
    sessionItem.className = 'cursor-pointer block border-b border-gray-200 pb-3 flex justify-between items-center hover:bg-gray-50 transition-colors';
    
    const date = new Date(session.created_at);
    const dateStr = date.toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const duration = Math.round(session.duration / 60000);
    const distance = (session.distance || 0).toFixed(1);
    
    sessionItem.innerHTML = `
        <div class="flex-1">
            <div class="text-gray-800">${dateStr} ${timeStr}</div>
            <div class="text-sm text-gray-600">${duration}分 • ${distance}km</div>
        </div>
        <div class="text-green-600 text-sm font-medium">完了</div>
    `;
    
    sessionList.appendChild(sessionItem);
};

const startWalk = () => {
    if (currentSession) return;
    
    const startBtn = document.getElementById('startWalkBtn');
    const timerElement = document.getElementById('timer');
    
    startBtn.classList.add('hidden');
    timerElement.classList.remove('hidden');
    
    // Set initial timer styling for fast phase
    timerElement.className = 'bg-red-50 border border-red-200 rounded-lg p-6 shadow-sm';
    
    currentSession = {
        startTime: Date.now(),
        duration: 0,
        distance: 0,
        locations: [],
        phases: []
    };
    
    currentPhase = 'fast';
    phaseStartTime = Date.now();
    intervalCount = 1;
    pauseTime = 0;
    
    updatePhaseDisplay();
    startTimer();
    startLocationTracking();
    
    log('ウォーキングを開始しました！');
};

const pauseWalk = () => {
    if (!timer) return;
    
    // Track location before pausing
    console.log('⏸️ 一時停止前に位置情報を記録');
    trackLocation();
    
    clearInterval(timer);
    timer = null;
    pauseTime = Date.now();
    
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
        </svg>
        <span>再開</span>
    `;
    pauseBtn.onclick = resumeWalk;
    
    log('ウォーキングを一時停止しました');
};

const resumeWalk = () => {
    if (timer) return;
    
    if (pauseTime) {
        const pauseDuration = Date.now() - pauseTime;
        phaseStartTime += pauseDuration;
        pauseTime = 0;
    }
    
    startTimer();
    
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.25 9v6m-4.5 0V9M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>一時停止</span>
    `;
    pauseBtn.onclick = pauseWalk;
    
    log('ウォーキングを再開しました');
};

const stopWalk = async () => {
    if (!currentSession) return;
    
    // Track final location before stopping
    console.log('🏁 終了前に最終位置情報を記録');
    trackLocation();
    
    clearInterval(timer);
    timer = null;
    stopLocationTracking();
    
    const duration = Date.now() - currentSession.startTime - (pauseTime ? Date.now() - pauseTime : 0);
    currentSession.duration = duration;
    
    // Calculate distance from locations
    if (currentSession.locations.length > 1) {
        currentSession.distance = calculateTotalDistance(currentSession.locations);
    }
    
    // Save session to database
    await saveSession(currentSession);
    
    // Reset UI
    const startBtn = document.getElementById('startWalkBtn');
    const timerElement = document.getElementById('timer');
    
    startBtn.classList.remove('hidden');
    timerElement.classList.add('hidden');
    
    // Reset timer styling
    timerElement.className = 'hidden bg-white rounded-lg p-6 shadow-sm';
    
    // Reset session
    currentSession = null;
    currentPhase = 'ready';
    intervalCount = 0;
    pauseTime = 0;
    
    // Update displays
    loadSessions();
    updateWeeklyStats();
    
    const minutes = Math.round(duration / 60000);
    log(`ウォーキングを終了しました！ (${minutes}分)`);
};

const saveSession = async (session) => {
    if (!worker) {
        saveSessionToLocalStorage(session);
        return;
    }
    
    try {
        const locationsJson = JSON.stringify(session.locations || []);
        const result = await execSQL(
            'INSERT INTO walking_sessions (duration, distance, locations, created_at) VALUES (?, ?, ?, ?)',
            [session.duration, session.distance, locationsJson, new Date().toISOString()]
        );
        return result.lastInsertRowId;
    } catch (error) {
        console.error('Error saving session:', error);
    }
};

const updateWeeklyStats = async () => {
    if (!worker) {
        updateWeeklyStatsFromLocalStorage();
        return;
    }
    
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const weeklyCount = await selectValue(
            'SELECT COUNT(*) FROM walking_sessions WHERE created_at >= ?',
            [oneWeekAgo.toISOString()]
        );
        
        const weeklyDuration = await selectValue(
            'SELECT COALESCE(SUM(duration), 0) FROM walking_sessions WHERE created_at >= ?',
            [oneWeekAgo.toISOString()]
        );
        
        document.getElementById('weeklyCount').textContent = weeklyCount || 0;
        document.getElementById('weeklyDuration').textContent = Math.round((weeklyDuration || 0) / 60000);
    } catch (error) {
        console.error('Error updating weekly stats:', error);
    }
};

const startTimer = () => {
    timer = setInterval(() => {
        const now = Date.now();
        const elapsed = now - currentSession.startTime - (pauseTime ? now - pauseTime : 0);
        
        updateTimeDisplay(elapsed);
        
        // Check phase transitions
        const phaseElapsed = now - phaseStartTime;
        const currentPhaseInfo = PHASES[currentPhase];
        
        if (phaseElapsed >= currentPhaseInfo.duration) {
            // Switch phase
            currentPhase = currentPhaseInfo.next;
            phaseStartTime = now;
            
            if (currentPhase === 'fast') {
                intervalCount++;
                if (intervalCount > 5) {
                    // Workout complete
                    stopWalk();
                    return;
                }
            }
            
            updatePhaseDisplay();
        }
    }, 1000);
};

let localStorageSessionId = 1;

const updateTimeDisplay = (elapsed) => {
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('timeDisplay').textContent = display;
};

const updatePhaseDisplay = () => {
    const phaseInfo = PHASES[currentPhase];
    const phaseDisplay = document.getElementById('phaseDisplay');
    const timerElement = document.getElementById('timer');
    
    phaseDisplay.textContent = `${intervalCount}/5 - ${phaseInfo.name}`;
    
    // Update colors based on phase
    if (currentPhase === 'fast') {
        phaseDisplay.className = 'text-lg px-4 py-2 rounded-full text-white bg-red-500 inline-block';
        if (!timerElement.classList.contains('hidden')) {
            timerElement.className = 'bg-red-50 border border-red-200 rounded-lg p-6 shadow-sm';
        }
    } else {
        phaseDisplay.className = 'text-lg px-4 py-2 rounded-full text-white bg-blue-500 inline-block';
        if (!timerElement.classList.contains('hidden')) {
            timerElement.className = 'bg-blue-50 border border-blue-200 rounded-lg p-6 shadow-sm';
        }
    }
};

const initLocalStorageFallback = () => {
    const sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
    if (sessions.length > 0) {
        localStorageSessionId = Math.max(...sessions.map(s => s.id)) + 1;
    }
    
    // Handle initial route now that localStorage is ready
    if (router.isInitialized) {
        router.handleRoute();
    } else {
        // Fallback if router wasn't initialized yet
        const hash = window.location.hash;
        if (hash.startsWith('#session/')) {
            const sessionId = hash.split('/')[1];
            loadSessionDetailsFromLocalStorage(sessionId);
        } else {
            loadSessionsFromLocalStorage();
            updateWeeklyStatsFromLocalStorage();
        }
    }
    
    log('⚠️ ローカルストレージモードで動作中（データは永続化されません）');
};

const loadSessionsFromLocalStorage = () => {
    const sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
    const sessionList = document.getElementById('sessionList');
    sessionList.innerHTML = '';
    
    if (sessions.length === 0) {
        sessionList.innerHTML = '<p class="text-gray-500 text-center py-8">まだセッションがありません</p>';
        return;
    }
    
    sessions.slice(0, 10).forEach(session => addSessionToDOM(session));
};

const saveSessionToLocalStorage = (session) => {
    const sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
    const newSession = {
        id: localStorageSessionId++,
        duration: session.duration,
        distance: session.distance,
        locations: session.locations || [],
        created_at: new Date().toISOString()
    };
    sessions.unshift(newSession);
    localStorage.setItem('walkingSessions', JSON.stringify(sessions));
    loadSessionsFromLocalStorage();
    log('セッションを保存しました（ローカルストレージ）');
};

const updateWeeklyStatsFromLocalStorage = () => {
    const sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklySessions = sessions.filter(s => new Date(s.created_at) >= oneWeekAgo);
    const weeklyCount = weeklySessions.length;
    const weeklyDuration = weeklySessions.reduce((sum, s) => sum + s.duration, 0);
    
    document.getElementById('weeklyCount').textContent = weeklyCount;
    document.getElementById('weeklyDuration').textContent = Math.round(weeklyDuration / 60000);
};




// Load session details for detail view
const loadSessionDetails = async (sessionId) => {
    if (!worker) {
        loadSessionDetailsFromLocalStorage(sessionId);
        return;
    }
    
    try {
        const session = await selectObject('SELECT * FROM walking_sessions WHERE id = ?', [sessionId]);
        if (!session) {
            // Don't show alert during page load - just redirect silently
            console.warn(`Session ${sessionId} not found, redirecting to main page`);
            router.navigate('');
            return;
        }
        displaySessionDetails(session);
    } catch (error) {
        console.error('Error loading session details:', error);
        loadSessionDetailsFromLocalStorage(sessionId);
    }
};

const loadSessionDetailsFromLocalStorage = (sessionId) => {
    const sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
    const session = sessions.find(s => s.id === parseInt(sessionId));
    
    if (!session) {
        // Don't show alert during page load - just redirect silently
        console.warn(`Session ${sessionId} not found in localStorage, redirecting to main page`);
        router.navigate('');
        return;
    }
    
    displaySessionDetails(session);
};

const displaySessionDetails = (session) => {
    const startDate = new Date(session.created_at);
    const endDate = new Date(startDate.getTime() + session.duration);
    
    const formatDate = (date) => {
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    document.getElementById('startTime').textContent = formatDate(startDate);
    document.getElementById('endTime').textContent = formatDate(endDate);
    document.getElementById('duration').textContent = `${Math.round(session.duration / 60000)} 分`;
    document.getElementById('distance').textContent = `${(session.distance || 0).toFixed(2)} km`;
    
    // Display map
    displayRouteMap(session);
    
    // Display locations data
    displayLocations(session);
};

const deleteSession = async () => {
    if (!currentSessionId) return;
    
    // Close modal first
    document.getElementById('deleteModal').classList.add('hidden');
    
    if (worker) {
        try {
            await execSQL('DELETE FROM walking_sessions WHERE id = ?', [currentSessionId]);
            router.navigate('');
        } catch (error) {
            console.error('Error deleting session:', error);
            alert('セッションの削除に失敗しました');
        }
    } else {
        const sessions = JSON.parse(localStorage.getItem('walkingSessions') || '[]');
        const filtered = sessions.filter(s => s.id !== parseInt(currentSessionId));
        localStorage.setItem('walkingSessions', JSON.stringify(filtered));
        router.navigate('');
    }
};

// Location tracking functions
const startLocationTracking = () => {
    if (!navigator.geolocation) {
        console.log('❌ このブラウザは位置情報機能をサポートしていません');
        return;
    }
    
    console.log('🚀 位置情報トラッキングを開始します');
    console.log('   → 初回の位置情報を取得中...');
    
    // Track location immediately
    trackLocation();
    
    // Then track every minute
    locationTimer = setInterval(() => {
        console.log('⏱️ 1分経過 - 定期位置情報取得');
        trackLocation();
    }, 60000);
    
    console.log('   → 1分ごとに位置情報を記録します');
};

const stopLocationTracking = () => {
    if (locationTimer) {
        clearInterval(locationTimer);
        locationTimer = null;
        console.log('🛑 位置情報の定期取得を停止しました');
    }
};

const trackLocation = () => {
    console.log('📍 位置情報取得を試みています...');
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                timestamp: Date.now(),
                phase: currentPhase
            };
            
            if (currentSession) {
                currentSession.locations.push(location);
                const time = new Date(location.timestamp).toLocaleTimeString('ja-JP');
                const phaseJa = currentPhase === 'fast' ? '速歩き' : 'ゆっくり歩き';
                
                console.log(`✅ 位置情報を保存しました [${time}]`);
                console.log(`   フェーズ: ${phaseJa} (${intervalCount}/5)`);
                console.log(`   緯度: ${location.lat.toFixed(6)}`);
                console.log(`   経度: ${location.lng.toFixed(6)}`);
                console.log(`   保存済み位置情報数: ${currentSession.locations.length}件`);
                console.log('   詳細:', location);
            } else {
                console.warn('⚠️ セッションが開始されていないため、位置情報を保存できませんでした');
            }
        },
        (error) => {
            console.error('❌ 位置情報の取得に失敗しました:', error);
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    console.error('   → 位置情報の使用が拒否されました');
                    break;
                case error.POSITION_UNAVAILABLE:
                    console.error('   → 位置情報が利用できません');
                    break;
                case error.TIMEOUT:
                    console.error('   → 位置情報の取得がタイムアウトしました');
                    break;
                default:
                    console.error('   → 不明なエラー');
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 0
        }
    );
};

const calculateTotalDistance = (locations) => {
    let total = 0;
    for (let i = 1; i < locations.length; i++) {
        total += calculateDistance(
            locations[i - 1].lat,
            locations[i - 1].lng,
            locations[i].lat,
            locations[i].lng
        );
    }
    return total;
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const toRad = (deg) => {
    return deg * (Math.PI / 180);
};

const displayRouteMap = (session) => {
    // Parse locations if it's a string
    let locations = session.locations;
    if (typeof locations === 'string') {
        try {
            locations = JSON.parse(locations);
        } catch (e) {
            locations = [];
        }
    }
    
    if (!locations || locations.length === 0) {
        document.getElementById('mapContainer').innerHTML = 
            '<div class="bg-gray-100 rounded-lg p-4 h-64 flex items-center justify-center">' +
            '<p class="text-gray-500 text-sm">位置情報がありません</p></div>';
        return;
    }
    
    // Initialize map
    setTimeout(() => {
        if (map) {
            map.remove();
        }
        
        const center = locations[Math.floor(locations.length / 2)];
        map = L.map('map').setView([center.lat, center.lng], 15);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        // Prepare route segments
        const fastSegments = [];
        const slowSegments = [];
        let currentSegment = [];
        let currentPhaseType = locations[0].phase;
        
        locations.forEach((loc, index) => {
            currentSegment.push([loc.lat, loc.lng]);
            
            if (index === locations.length - 1 || locations[index + 1].phase !== currentPhaseType) {
                if (currentSegment.length > 1) {
                    if (currentPhaseType === 'fast') {
                        fastSegments.push([...currentSegment]);
                    } else {
                        slowSegments.push([...currentSegment]);
                    }
                }
                if (index < locations.length - 1) {
                    currentSegment = [[loc.lat, loc.lng]];
                    currentPhaseType = locations[index + 1].phase;
                }
            }
        });
        
        // Draw fast walking segments (red)
        fastSegments.forEach(segment => {
            L.polyline(segment, { color: 'red', weight: 4, opacity: 0.8 }).addTo(map);
        });
        
        // Draw slow walking segments (blue)
        slowSegments.forEach(segment => {
            L.polyline(segment, { color: 'blue', weight: 4, opacity: 0.8 }).addTo(map);
        });
        
        // Add start and end markers with custom colors
        // Start marker (green)
        const startIcon = L.divIcon({
            html: '<div style="background-color: #10b981; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12],
            className: ''
        });
        
        L.marker([locations[0].lat, locations[0].lng], { icon: startIcon }).addTo(map)
            .bindPopup('<b>🚶 開始地点</b><br>' + new Date(locations[0].timestamp).toLocaleTimeString('ja-JP'));
        
        // End marker (red)
        const endIcon = L.divIcon({
            html: '<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12],
            className: ''
        });
        
        const lastLoc = locations[locations.length - 1];
        L.marker([lastLoc.lat, lastLoc.lng], { icon: endIcon }).addTo(map)
            .bindPopup('<b>🏁 終了地点</b><br>' + new Date(lastLoc.timestamp).toLocaleTimeString('ja-JP'));
        
        // Fit map to show all route
        const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lng]));
        map.fitBounds(bounds, { padding: [20, 20] });
    }, 100);
};

const displayLocations = (session) => {
    // Parse locations if it's a string
    let locations = session.locations;
    if (typeof locations === 'string') {
        try {
            locations = JSON.parse(locations);
        } catch (e) {
            locations = [];
        }
    }
    
    const locationsContainer = document.getElementById('locationsList');
    
    if (!locations || locations.length === 0) {
        locationsContainer.innerHTML = '<p class="text-gray-500 text-sm">位置情報がありません</p>';
        return;
    }
    
    // Create a table to display locations
    const table = document.createElement('table');
    table.className = 'w-full text-sm';
    
    // Create table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr class="border-b">
            <th class="text-left py-2 px-2">#</th>
            <th class="text-left py-2 px-2">時刻</th>
            <th class="text-left py-2 px-2">フェーズ</th>
            <th class="text-left py-2 px-2">緯度</th>
            <th class="text-left py-2 px-2">経度</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    locations.forEach((loc, index) => {
        const tr = document.createElement('tr');
        tr.className = 'border-b hover:bg-gray-50';
        
        const time = new Date(loc.timestamp);
        const timeStr = time.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const phaseColor = loc.phase === 'fast' ? 'text-red-600' : 'text-blue-600';
        const phaseName = loc.phase === 'fast' ? '速歩き' : 'ゆっくり';
        
        tr.innerHTML = `
            <td class="py-2 px-2">${index + 1}</td>
            <td class="py-2 px-2">${timeStr}</td>
            <td class="py-2 px-2 ${phaseColor} font-medium">${phaseName}</td>
            <td class="py-2 px-2 font-mono text-xs">${loc.lat.toFixed(6)}</td>
            <td class="py-2 px-2 font-mono text-xs">${loc.lng.toFixed(6)}</td>
        `;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    // Add summary at the top
    const summary = document.createElement('div');
    summary.className = 'mb-3 text-sm text-gray-600';
    summary.textContent = `記録数: ${locations.length}件`;
    
    locationsContainer.innerHTML = '';
    locationsContainer.appendChild(summary);
    locationsContainer.appendChild(table);
};

document.addEventListener('DOMContentLoaded', () => {
    initSQLite();
    router.init();
    
    // Main view buttons
    document.getElementById('startWalkBtn').addEventListener('click', startWalk);
    document.getElementById('pauseBtn').addEventListener('click', pauseWalk);
    document.getElementById('stopBtn').addEventListener('click', stopWalk);
    
    // Session view buttons
    document.getElementById('backBtn').addEventListener('click', () => router.navigate(''));
    document.getElementById('deleteBtn').addEventListener('click', () => {
        document.getElementById('deleteModal').classList.remove('hidden');
    });
    
    // All sessions view buttons
    document.getElementById('backToMainBtn').addEventListener('click', () => router.navigate(''));
    
    // Modal buttons
    document.getElementById('cancelBtn').addEventListener('click', () => {
        document.getElementById('deleteModal').classList.add('hidden');
    });
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
        deleteSession();
    });
    
    // Close modal on outside click
    document.getElementById('deleteModal').addEventListener('click', (e) => {
        if (e.target.id === 'deleteModal') {
            document.getElementById('deleteModal').classList.add('hidden');
        }
    });
});