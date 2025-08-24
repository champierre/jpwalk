// View Layer - UI management and DOM manipulation
export class WalkingView {
    constructor() {
        this.map = null;
        this.routeLine = null;
        this.currentSessionsPage = 1;
    }

    // Timer display methods
    updateTimeDisplay(minutes, seconds) {
        const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.getElementById('timeDisplay').textContent = timeStr;
    }

    updatePhaseDisplay(phase) {
        const phaseDisplay = document.getElementById('phaseDisplay');
        const timer = document.getElementById('timer');
        
        if (phase === 'fast') {
            phaseDisplay.textContent = '速歩き';
            phaseDisplay.className = 'text-lg px-4 py-2 rounded-full text-white bg-red-500 inline-block';
            timer.className = 'bg-red-50 border-2 border-red-200 rounded-lg p-6 shadow-sm';
        } else if (phase === 'slow') {
            phaseDisplay.textContent = 'ゆっくり歩き';
            phaseDisplay.className = 'text-lg px-4 py-2 rounded-full text-white bg-blue-500 inline-block';
            timer.className = 'bg-blue-50 border-2 border-blue-200 rounded-lg p-6 shadow-sm';
        } else {
            phaseDisplay.textContent = '準備中';
            phaseDisplay.className = 'text-lg px-4 py-2 rounded-full text-white bg-gray-500 inline-block';
            timer.className = 'bg-white rounded-lg p-6 shadow-sm';
        }
    }

    // Session UI management
    showSessionUI() {
        document.getElementById('timer').classList.remove('hidden');
        document.getElementById('startWalkBtn').classList.add('hidden');
        document.getElementById('weeklyProgress').style.display = 'none';
        document.getElementById('recentSessions').style.display = 'none';
    }

    hideSessionUI() {
        document.getElementById('timer').classList.add('hidden');
        document.getElementById('startWalkBtn').classList.remove('hidden');
        document.getElementById('weeklyProgress').style.display = 'block';
        document.getElementById('recentSessions').style.display = 'block';
    }

    updatePauseButton(isPaused) {
        const pauseBtn = document.getElementById('pauseBtn');
        if (isPaused) {
            pauseBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                <span>再開</span>
            `;
        } else {
            pauseBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.25 9v6m-4.5 0V9M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>一時停止</span>
            `;
        }
    }

    // Navigation methods
    showMainView() {
        document.getElementById('mainView').classList.remove('hidden');
        document.getElementById('sessionView').classList.add('hidden');
        document.getElementById('sessionsView').classList.add('hidden');
    }

    showSessionView() {
        document.getElementById('mainView').classList.add('hidden');
        document.getElementById('sessionView').classList.remove('hidden');
        document.getElementById('sessionsView').classList.add('hidden');
    }

    showSessionsView() {
        document.getElementById('mainView').classList.add('hidden');
        document.getElementById('sessionView').classList.add('hidden');
        document.getElementById('sessionsView').classList.remove('hidden');
    }

    // Session list display methods
    addSessionToDOM(session) {
        const sessionElement = document.createElement('div');
        sessionElement.className = 'flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-gray-50 rounded-lg px-3';
        sessionElement.onclick = () => window.location.hash = `#session/${session.id}`;

        const startTime = new Date(session.created_at);
        const formattedDate = startTime.toLocaleDateString('ja-JP', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        sessionElement.innerHTML = `
            <div>
                <div class="font-medium text-gray-800">${Math.floor(session.duration / 60)}分</div>
                <div class="text-sm text-gray-600">${formattedDate}</div>
            </div>
            <div class="text-right">
                <div class="text-sm text-gray-600">${session.distance ? session.distance.toFixed(2) + 'km' : '距離なし'}</div>
            </div>
        `;

        return sessionElement;
    }

    addSessionToAllSessionsDOM(session) {
        const sessionElement = document.createElement('div');
        sessionElement.className = 'flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-gray-50 rounded-lg px-3';
        sessionElement.onclick = () => window.location.hash = `#session/${session.id}`;

        const startTime = new Date(session.created_at);
        const formattedDate = startTime.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        sessionElement.innerHTML = `
            <div>
                <div class="font-medium text-gray-800">${Math.floor(session.duration / 60)}分</div>
                <div class="text-sm text-gray-600">${formattedDate}</div>
            </div>
            <div class="text-right">
                <div class="text-sm text-gray-600">${session.distance ? session.distance.toFixed(2) + 'km' : '距離なし'}</div>
            </div>
        `;

        return sessionElement;
    }

    displaySessionDetails(session, locations) {
        const startTime = new Date(session.created_at);
        const endTime = new Date(startTime.getTime() + (session.duration * 1000));
        
        document.getElementById('startTime').textContent = startTime.toLocaleString('ja-JP', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        document.getElementById('endTime').textContent = endTime.toLocaleString('ja-JP', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        document.getElementById('duration').textContent = `${Math.floor(session.duration / 60)}分`;
        document.getElementById('distance').textContent = session.distance ? `${session.distance.toFixed(2)}km` : '距離なし';

        this.displayRouteMap(locations);
        this.displayLocations(locations);
    }

    displayRouteMap(locations) {
        const mapContainer = document.getElementById('map');
        
        if (!locations || locations.length === 0) {
            mapContainer.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">位置情報がありません</div>';
            return;
        }

        if (this.map) {
            this.map.remove();
        }

        this.map = L.map('map').setView([locations[0].latitude, locations[0].longitude], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        const routeCoords = locations.map(loc => [loc.latitude, loc.longitude]);
        
        this.routeLine = L.polyline(routeCoords, { 
            color: '#3b82f6',
            weight: 4,
            opacity: 0.8
        }).addTo(this.map);

        if (locations.length > 0) {
            const startIcon = L.divIcon({
                html: '<div style="background-color: #22c55e; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });
            
            L.marker([locations[0].latitude, locations[0].longitude], { icon: startIcon })
                .addTo(this.map)
                .bindPopup('開始地点');

            if (locations.length > 1) {
                const endIcon = L.divIcon({
                    html: '<div style="background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                });
                
                L.marker([locations[locations.length - 1].latitude, locations[locations.length - 1].longitude], { icon: endIcon })
                    .addTo(this.map)
                    .bindPopup('終了地点');
            }
        }

        this.map.fitBounds(this.routeLine.getBounds(), { padding: [20, 20] });
    }

    displayLocations(locations) {
        const locationsList = document.getElementById('locationsList');
        
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

        locations.forEach(location => {
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

    updateWeeklyStats(stats) {
        document.getElementById('weeklyCount').textContent = stats.count;
        document.getElementById('weeklyDuration').textContent = Math.floor(stats.duration / 60);
    }

    clearSessionLists() {
        document.getElementById('sessionList').innerHTML = '';
        document.getElementById('allSessionsList').innerHTML = '';
    }

    updatePaginationControls(currentPage, totalPages, totalCount) {
        this.currentSessionsPage = currentPage;
        
        document.getElementById('currentPage').textContent = currentPage;
        document.getElementById('totalPages').textContent = totalPages;
        
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages;
        
        if (prevBtn.disabled) {
            prevBtn.classList.add('text-gray-400', 'cursor-not-allowed');
            prevBtn.classList.remove('text-blue-500', 'hover:text-blue-600');
        } else {
            prevBtn.classList.remove('text-gray-400', 'cursor-not-allowed');
            prevBtn.classList.add('text-blue-500', 'hover:text-blue-600');
        }
        
        if (nextBtn.disabled) {
            nextBtn.classList.add('text-gray-400', 'cursor-not-allowed');
            nextBtn.classList.remove('text-blue-500', 'hover:text-blue-600');
        } else {
            nextBtn.classList.remove('text-gray-400', 'cursor-not-allowed');
            nextBtn.classList.add('text-blue-500', 'hover:text-blue-600');
        }

        const paginationControls = document.getElementById('paginationControls');
        if (totalPages <= 1) {
            paginationControls.style.display = 'none';
        } else {
            paginationControls.style.display = 'flex';
        }
    }

    showDeleteConfirmation() {
        document.getElementById('deleteModal').classList.remove('hidden');
    }

    hideDeleteConfirmation() {
        document.getElementById('deleteModal').classList.add('hidden');
    }

    showMoreSessionsButton() {
        const sessionList = document.getElementById('sessionList');
        const moreButton = document.createElement('div');
        moreButton.className = 'text-center pt-3';
        moreButton.innerHTML = `
            <button id="moreSessionsBtn" class="text-blue-500 hover:text-blue-600 text-sm font-medium">
                もっと見る
            </button>
        `;
        sessionList.appendChild(moreButton);
        
        document.getElementById('moreSessionsBtn').addEventListener('click', () => {
            window.location.hash = '#sessions';
        });
    }
}