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
            phaseDisplay.className = 'text-lg px-4 py-2 rounded-full text-white bg-orange-500 inline-block';
            timer.className = 'bg-orange-50 border-2 border-orange-200 rounded-lg p-6 shadow-sm';
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
        sessionElement.className = 'group flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 rounded-lg px-3 -mx-3 hover:shadow-sm active:bg-blue-100';
        sessionElement.onclick = () => window.location.hash = `#session/${session.id}`;

        const startTime = new Date(session.created_at);
        const formattedDate = startTime.toLocaleDateString('ja-JP', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        sessionElement.innerHTML = `
            <div class="flex-1">
                <div class="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">${Math.floor(session.duration / 60)}分</div>
                <div class="text-sm text-gray-600">${formattedDate}</div>
            </div>
            <div class="flex items-center gap-3">
                <div class="text-sm text-gray-600">${session.distance ? session.distance.toFixed(2) + 'km' : '距離なし'}</div>
                <svg class="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </div>
        `;

        return sessionElement;
    }

    addSessionToAllSessionsDOM(session) {
        const sessionElement = document.createElement('div');
        sessionElement.className = 'group flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 rounded-lg px-3 -mx-3 hover:shadow-sm active:bg-blue-100';
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
            <div class="flex-1">
                <div class="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">${Math.floor(session.duration / 60)}分</div>
                <div class="text-sm text-gray-600">${formattedDate}</div>
            </div>
            <div class="flex items-center gap-3">
                <div class="text-sm text-gray-600">${session.distance ? session.distance.toFixed(2) + 'km' : '距離なし'}</div>
                <svg class="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
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
        
        // 再計算された距離を優先的に使用、次にセッションに保存された距離、最後に「距離なし」
        let displayDistance = '距離なし';
        if (session.calculatedDistance !== undefined && session.calculatedDistance > 0) {
            displayDistance = `${session.calculatedDistance.toFixed(2)}km`;
        } else if (session.distance && session.distance > 0) {
            displayDistance = `${session.distance.toFixed(2)}km`;
        }
        document.getElementById('distance').textContent = displayDistance;

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

        // Group consecutive locations by phase and draw colored segments
        this.routeLines = [];
        let allBounds = L.latLngBounds();

        if (locations.length > 1) {
            for (let i = 0; i < locations.length - 1; i++) {
                const currentLocation = locations[i];
                const nextLocation = locations[i + 1];
                
                // Create a segment between current and next location
                const segmentCoords = [
                    [currentLocation.latitude, currentLocation.longitude],
                    [nextLocation.latitude, nextLocation.longitude]
                ];
                
                // Use the phase of the current location to determine color
                const phase = currentLocation.phase || 'slow'; // default to slow if phase is missing
                const color = phase === 'fast' ? '#f97316' : '#3b82f6'; // orange for fast, blue for slow
                
                const segmentLine = L.polyline(segmentCoords, { 
                    color: color,
                    weight: 4,
                    opacity: 0.8
                }).addTo(this.map);
                
                this.routeLines.push(segmentLine);
                allBounds.extend(segmentLine.getBounds());
            }
        } else if (locations.length === 1) {
            // Handle single location case
            allBounds.extend([locations[0].latitude, locations[0].longitude]);
        }

        // Add start and end markers
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

        // Fit map to show all segments
        if (allBounds.isValid()) {
            this.map.fitBounds(allBounds, { padding: [20, 20] });
        }
    }

    displayLocations(locations) {
        const locationsList = document.getElementById('locationsList');
        
        if (!locations || locations.length < 2) {
            locationsList.innerHTML = '<p class="text-gray-500 text-sm">区間データがありません（2地点以上必要）</p>';
            return;
        }

        // Calculate raw segments from location points
        const rawSegments = [];
        for (let i = 1; i < locations.length; i++) {
            const startLoc = locations[i - 1];
            const endLoc = locations[i];
            
            // Calculate distance using haversine formula
            const distance = this.calculateDistance(
                startLoc.latitude, startLoc.longitude,
                endLoc.latitude, endLoc.longitude
            );
            
            // Calculate time difference in seconds
            const timeDiff = (new Date(endLoc.timestamp) - new Date(startLoc.timestamp)) / 1000;
            
            // Calculate speed in km/h (distance in km, time in seconds)
            const speed = timeDiff > 0 ? (distance / timeDiff) * 3600 : 0;
            
            rawSegments.push({
                startTime: new Date(startLoc.timestamp),
                endTime: new Date(endLoc.timestamp),
                phase: startLoc.phase, // Use the phase at the start of segment
                distance: distance,
                speed: speed,
                duration: timeDiff
            });
        }

        // Merge consecutive segments with the same phase
        const segments = [];
        let currentSegment = null;
        
        for (const segment of rawSegments) {
            if (!currentSegment || currentSegment.phase !== segment.phase) {
                // Start a new merged segment
                if (currentSegment) {
                    segments.push(currentSegment);
                }
                currentSegment = {
                    startTime: segment.startTime,
                    endTime: segment.endTime,
                    phase: segment.phase,
                    distance: segment.distance,
                    totalDuration: segment.duration,
                    speeds: [segment.speed],
                    durations: [segment.duration]
                };
            } else {
                // Merge with current segment
                currentSegment.endTime = segment.endTime;
                currentSegment.distance += segment.distance;
                currentSegment.totalDuration += segment.duration;
                currentSegment.speeds.push(segment.speed);
                currentSegment.durations.push(segment.duration);
            }
        }
        
        // Don't forget the last segment
        if (currentSegment) {
            segments.push(currentSegment);
        }
        
        // Calculate weighted average speed for merged segments
        const finalSegments = segments.map(segment => {
            // Calculate weighted average speed (weighted by duration)
            let weightedSpeedSum = 0;
            for (let i = 0; i < segment.speeds.length; i++) {
                weightedSpeedSum += segment.speeds[i] * segment.durations[i];
            }
            const avgSpeed = segment.totalDuration > 0 ? weightedSpeedSum / segment.totalDuration : 0;
            
            return {
                startTime: segment.startTime,
                endTime: segment.endTime,
                phase: segment.phase,
                distance: segment.distance,
                speed: avgSpeed,
                duration: segment.totalDuration
            };
        });

        const table = document.createElement('table');
        table.className = 'w-full text-sm';
        
        const headerRow = document.createElement('tr');
        headerRow.className = 'border-b border-gray-200';
        headerRow.innerHTML = `
            <th class="text-left py-2 text-gray-600 font-medium">時間</th>
            <th class="text-left py-2 text-gray-600 font-medium">フェーズ</th>
            <th class="text-left py-2 text-gray-600 font-medium">距離</th>
            <th class="text-left py-2 text-gray-600 font-medium">速度</th>
        `;
        table.appendChild(headerRow);

        finalSegments.forEach((segment) => {
            const row = document.createElement('tr');
            row.className = 'border-b border-gray-100';
            
            const startTime = segment.startTime.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const endTime = segment.endTime.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const phaseColor = segment.phase === 'fast' ? 'text-orange-600' : 'text-blue-600';
            const phaseName = segment.phase === 'fast' ? '速歩き' : 'ゆっくり歩き';
            
            row.innerHTML = `
                <td class="py-2 text-xs">${startTime} - ${endTime}</td>
                <td class="py-2 ${phaseColor} font-medium">${phaseName}</td>
                <td class="py-2">${(segment.distance * 1000).toFixed(0)}m</td>
                <td class="py-2">${segment.speed.toFixed(1)}km/h</td>
            `;
            table.appendChild(row);
        });

        locationsList.innerHTML = '';
        locationsList.appendChild(table);
    }

    // Add distance calculation helper method
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in kilometers
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRad(value) {
        return value * Math.PI / 180;
    }

    updateWeeklyStats(stats) {
        document.getElementById('weeklyCount').textContent = stats.count;
        document.getElementById('weeklyDuration').textContent = Math.floor(stats.duration / 60);
    }

    updateDailyGraph(dailyStats) {
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        const graphContainer = document.getElementById('dailyGraph');
        
        if (!graphContainer) {
            console.error('dailyGraph container not found');
            return;
        }
        
        // Clear existing content
        graphContainer.innerHTML = '';
        
        // Create graph title
        const title = document.createElement('h3');
        title.className = 'text-sm font-medium text-gray-700 mb-3 text-center';
        title.textContent = '今週の達成度（日曜日〜土曜日）';
        graphContainer.appendChild(title);
        
        // Create graph container
        const barsContainer = document.createElement('div');
        barsContainer.className = 'flex items-end justify-between gap-1 h-24 mb-2';
        
        dailyStats.forEach((dayStat, index) => {
            const dayContainer = document.createElement('div');
            dayContainer.className = 'flex flex-col items-center flex-1';
            
            // Bar container with background
            const barBg = document.createElement('div');
            barBg.className = 'w-full bg-gray-100 rounded-t-sm flex flex-col justify-end';
            barBg.style.height = '60px';
            
            // Achievement bar
            const bar = document.createElement('div');
            bar.className = 'w-full rounded-t-sm transition-all duration-300';
            
            // Set bar height and color based on achievement
            const heightPercent = dayStat.achievementPercent;
            const cappedPercent = Math.min(heightPercent, 100); // Cap at 100% for height calculation
            bar.style.height = `${Math.max(2, (cappedPercent / 100) * 60)}px`;
            
            // Color coding based on achievement level
            if (heightPercent === 0) {
                bar.className += ' bg-gray-200';
            } else if (heightPercent < 50) {
                bar.className += ' bg-red-400';
            } else if (heightPercent < 100) {
                bar.className += ' bg-yellow-400';
            } else {
                bar.className += ' bg-green-500';
            }
            
            // Add hover effect and tooltip
            dayContainer.title = `${dayNames[index]}曜日: ${dayStat.sessionCount}セッション, ${Math.floor(dayStat.totalDuration / 60)}分 (${heightPercent}%)`;
            dayContainer.className += ' cursor-pointer hover:opacity-80';
            
            barBg.appendChild(bar);
            dayContainer.appendChild(barBg);
            
            // Day label
            const dayLabel = document.createElement('div');
            dayLabel.className = 'text-xs text-gray-600 font-medium mt-1';
            dayLabel.textContent = dayNames[index];
            
            // Highlight today
            const today = new Date();
            if (dayStat.date.toDateString() === today.toDateString()) {
                dayLabel.className = 'text-xs text-blue-600 font-bold mt-1';
            }
            
            dayContainer.appendChild(dayLabel);
            barsContainer.appendChild(dayContainer);
        });
        
        graphContainer.appendChild(barsContainer);
        
        // Add legend
        const legend = document.createElement('div');
        legend.className = 'flex justify-center gap-3 text-xs text-gray-600';
        legend.innerHTML = `
            <div class="flex items-center gap-1">
                <div class="w-3 h-3 bg-gray-200 rounded"></div>
                <span>0%</span>
            </div>
            <div class="flex items-center gap-1">
                <div class="w-3 h-3 bg-red-400 rounded"></div>
                <span>0-49%</span>
            </div>
            <div class="flex items-center gap-1">
                <div class="w-3 h-3 bg-yellow-400 rounded"></div>
                <span>50-99%</span>
            </div>
            <div class="flex items-center gap-1">
                <div class="w-3 h-3 bg-green-500 rounded"></div>
                <span>100%+</span>
            </div>
        `;
        graphContainer.appendChild(legend);
        
        // Add target info
        const targetInfo = document.createElement('div');
        targetInfo.className = 'text-center text-xs text-gray-500 mt-2';
        targetInfo.textContent = '目標: 1日30分';
        graphContainer.appendChild(targetInfo);
    }

    updateWeeklyAchievement(weeklyAchievement) {
        // Find the weekly progress container to add the achievement display
        const weeklyProgressContainer = document.getElementById('weeklyProgress');
        if (!weeklyProgressContainer) {
            console.error('Weekly progress container not found');
            return;
        }
        
        // Remove existing weekly achievement display if it exists
        const existingAchievement = document.getElementById('weeklyAchievement');
        if (existingAchievement) {
            existingAchievement.remove();
        }
        
        // Create weekly achievement display
        const achievementContainer = document.createElement('div');
        achievementContainer.id = 'weeklyAchievement';
        achievementContainer.className = 'border-t border-gray-100 pt-4 mt-4';
        
        // Achievement title
        const title = document.createElement('h3');
        title.className = 'text-sm font-medium text-gray-700 mb-3 text-center';
        title.textContent = '週の達成度';
        
        // Achievement status card
        const statusCard = document.createElement('div');
        statusCard.className = `p-4 rounded-lg border-2 ${
            weeklyAchievement.achieved 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-gray-50 border-gray-200 text-gray-600'
        }`;
        
        // Achievement icon and text
        const achievementContent = document.createElement('div');
        achievementContent.className = 'flex items-center justify-center gap-3';
        
        const icon = document.createElement('div');
        icon.innerHTML = weeklyAchievement.achieved 
            ? '🏆' 
            : '⭐';
        
        const statusText = document.createElement('div');
        statusText.className = 'text-center';
        
        const mainText = document.createElement('div');
        mainText.className = 'font-semibold';
        mainText.textContent = weeklyAchievement.achieved 
            ? '週の目標達成！' 
            : '週の目標まであと少し';
        
        const detailText = document.createElement('div');
        detailText.className = 'text-sm mt-1';
        detailText.textContent = `${weeklyAchievement.completedDays}日/4日完了 (${weeklyAchievement.achievementPercent}%)`;
        
        statusText.appendChild(mainText);
        statusText.appendChild(detailText);
        
        achievementContent.appendChild(icon);
        achievementContent.appendChild(statusText);
        statusCard.appendChild(achievementContent);
        
        // Achievement progress bar
        if (weeklyAchievement.completedDays > 0) {
            const progressContainer = document.createElement('div');
            progressContainer.className = 'mt-3';
            
            const progressBar = document.createElement('div');
            progressBar.className = 'w-full bg-gray-200 rounded-full h-2';
            
            const progressFill = document.createElement('div');
            progressFill.className = `h-2 rounded-full transition-all duration-300 ${
                weeklyAchievement.achieved ? 'bg-green-500' : 'bg-blue-500'
            }`;
            progressFill.style.width = `${weeklyAchievement.achievementPercent}%`;
            
            progressBar.appendChild(progressFill);
            progressContainer.appendChild(progressBar);
            statusCard.appendChild(progressContainer);
        }
        
        achievementContainer.appendChild(title);
        achievementContainer.appendChild(statusCard);
        
        // Add achievement info
        const infoText = document.createElement('div');
        infoText.className = 'text-center text-xs text-gray-500 mt-2';
        infoText.textContent = '週に4日以上、1日30分の目標を達成すると週の達成度100%';
        achievementContainer.appendChild(infoText);
        
        // Append to weekly progress container
        weeklyProgressContainer.appendChild(achievementContainer);
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

    // Data Management UI methods
    showDataManagementModal() {
        document.getElementById('dataModal').classList.remove('hidden');
    }

    hideDataManagementModal() {
        document.getElementById('dataModal').classList.add('hidden');
    }

    showExportSuccess(metadata) {
        const message = `データのエクスポートが完了しました！\n\nセッション数: ${metadata.totalSessions}\n位置情報数: ${metadata.totalLocations}`;
        alert(message);
    }

    showExportError(errorMessage) {
        alert(`エクスポートに失敗しました:\n${errorMessage}`);
    }

    showImportSuccess(result) {
        const message = `データのインポートが完了しました！\n\nインポート済み:\n- セッション: ${result.imported.sessions}/${result.total.sessions}\n- 位置情報: ${result.imported.locations}/${result.total.locations}`;
        alert(message);
    }

    showImportError(errorMessage) {
        alert(`インポートに失敗しました:\n${errorMessage}`);
    }

    // Flash message methods
    showFlashMessage(message, type = 'success') {
        const flashContainer = document.getElementById('flashMessage');
        const flashText = document.getElementById('flashMessageText');
        const flashDiv = flashContainer.querySelector('div');
        const flashIcon = document.getElementById('flashMessageIcon');
        
        if (!flashContainer || !flashText || !flashDiv) {
            console.error('Flash message elements not found');
            return;
        }

        // Set message text
        flashText.textContent = message;
        
        // Set icon and style based on type
        let iconPath = '';
        let baseClasses = 'px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-down';
        
        if (type === 'success') {
            flashDiv.className = `bg-green-500 text-white ${baseClasses}`;
            iconPath = 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
        } else if (type === 'error') {
            flashDiv.className = `bg-red-500 text-white ${baseClasses}`;
            iconPath = 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z';
        } else if (type === 'warning') {
            flashDiv.className = `bg-yellow-500 text-white ${baseClasses}`;
            iconPath = 'M12 9v3.75m0 0v.008h.008V12.75H12zm0 0h.008v.008H12V12.75zm9-6.75a9 9 0 11-18 0 9 9 0 0118 0z';
        } else if (type === 'info') {
            flashDiv.className = `bg-blue-500 text-white ${baseClasses}`;
            iconPath = 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z';
        }
        
        // Update icon if element exists
        if (flashIcon) {
            const pathElement = flashIcon.querySelector('path');
            if (pathElement) {
                pathElement.setAttribute('d', iconPath);
            }
        }
        
        // Show the flash message
        flashContainer.classList.remove('hidden');
        
        // Auto-hide after 5 seconds (longer for error messages)
        const hideTimeout = type === 'error' ? 6000 : 5000;
        setTimeout(() => {
            this.hideFlashMessage();
        }, hideTimeout);
        
        // Setup close button
        const closeBtn = document.getElementById('flashMessageClose');
        if (closeBtn) {
            closeBtn.onclick = () => this.hideFlashMessage();
        }
    }
    
    hideFlashMessage() {
        const flashContainer = document.getElementById('flashMessage');
        if (flashContainer) {
            flashContainer.classList.add('hidden');
        }
    }
}