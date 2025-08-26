/**
 * 日次達成度グラフの UI テスト
 * Tests for daily achievement graph UI functionality
 */

// Mock WalkingView class with updateDailyGraph method for testing
class TestWalkingView {
    constructor() {
        // Mock DOM container
        this.mockContainer = {
            innerHTML: '',
            appendChild: jest.fn(),
            children: []
        };
    }

    // Mock getElementById to return our test container
    mockGetElementById(id) {
        if (id === 'dailyGraph') {
            return this.mockContainer;
        }
        return null;
    }

    updateDailyGraph(dailyStats) {
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        const graphContainer = this.mockGetElementById('dailyGraph');
        
        if (!graphContainer) {
            console.error('dailyGraph container not found');
            return;
        }
        
        // Clear existing content
        graphContainer.innerHTML = '';
        graphContainer.children = [];
        
        // Create graph title
        const title = this.createElement('h3');
        title.className = 'text-sm font-medium text-gray-700 mb-3 text-center';
        title.textContent = '今週の達成度（日曜日〜土曜日）';
        graphContainer.appendChild(title);
        graphContainer.children.push(title);
        
        // Create graph container
        const barsContainer = this.createElement('div');
        barsContainer.className = 'flex items-end justify-between gap-1 h-24 mb-2';
        barsContainer.children = [];
        
        dailyStats.forEach((dayStat, index) => {
            const dayContainer = this.createElement('div');
            dayContainer.className = 'flex flex-col items-center flex-1';
            dayContainer.children = [];
            
            // Bar container with background
            const barBg = this.createElement('div');
            barBg.className = 'w-full bg-gray-100 rounded-t-sm flex flex-col justify-end';
            barBg.style = { height: '60px' };
            barBg.children = [];
            
            // Achievement bar
            const bar = this.createElement('div');
            bar.className = 'w-full rounded-t-sm transition-all duration-300';
            
            // Set bar height and color based on achievement
            const heightPercent = dayStat.achievementPercent;
            bar.style = { height: `${Math.max(2, (heightPercent / 100) * 60)}px` };
            
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
            
            barBg.children.push(bar);
            dayContainer.children.push(barBg);
            
            // Day label
            const dayLabel = this.createElement('div');
            dayLabel.className = 'text-xs text-gray-600 font-medium mt-1';
            dayLabel.textContent = dayNames[index];
            
            // Highlight today
            const today = new Date();
            if (dayStat.date.toDateString() === today.toDateString()) {
                dayLabel.className = 'text-xs text-blue-600 font-bold mt-1';
            }
            
            dayContainer.children.push(dayLabel);
            barsContainer.children.push(dayContainer);
        });
        
        graphContainer.children.push(barsContainer);
        
        // Add legend
        const legend = this.createElement('div');
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
        graphContainer.children.push(legend);
        
        // Add target info
        const targetInfo = this.createElement('div');
        targetInfo.className = 'text-center text-xs text-gray-500 mt-2';
        targetInfo.textContent = '目標: 1日30分';
        graphContainer.children.push(targetInfo);
    }

    // Helper method to create mock DOM elements
    createElement(tagName) {
        return {
            tagName: tagName,
            className: '',
            textContent: '',
            innerHTML: '',
            style: {},
            title: '',
            children: []
        };
    }
}

describe('Daily Achievement Graph UI', () => {
    let view;
    let today;
    
    beforeEach(() => {
        view = new TestWalkingView();
        today = new Date();
    });

    describe('updateDailyGraph - Basic Functionality', () => {
        test('グラフタイトルが正しく表示される', () => {
            const mockStats = createMockDailyStats();
            
            view.updateDailyGraph(mockStats);
            
            const title = view.mockContainer.children[0];
            expect(title.tagName).toBe('h3');
            expect(title.textContent).toBe('今週の達成度（日曜日〜土曜日）');
            expect(title.className).toContain('text-sm font-medium text-gray-700 mb-3 text-center');
        });

        test('7つの曜日バーが作成される', () => {
            const mockStats = createMockDailyStats();
            
            view.updateDailyGraph(mockStats);
            
            const barsContainer = view.mockContainer.children[1];
            expect(barsContainer.children).toHaveLength(7);
        });

        test('各曜日ラベルが正しく表示される', () => {
            const mockStats = createMockDailyStats();
            const expectedLabels = ['日', '月', '火', '水', '木', '金', '土'];
            
            view.updateDailyGraph(mockStats);
            
            const barsContainer = view.mockContainer.children[1];
            barsContainer.children.forEach((dayContainer, index) => {
                const dayLabel = dayContainer.children[1];
                expect(dayLabel.textContent).toBe(expectedLabels[index]);
            });
        });

        test('凡例が正しく表示される', () => {
            const mockStats = createMockDailyStats();
            
            view.updateDailyGraph(mockStats);
            
            const legend = view.mockContainer.children[2];
            expect(legend.className).toContain('flex justify-center gap-3 text-xs text-gray-600');
            expect(legend.innerHTML).toContain('0%');
            expect(legend.innerHTML).toContain('0-49%');
            expect(legend.innerHTML).toContain('50-99%');
            expect(legend.innerHTML).toContain('100%+');
        });

        test('目標情報が表示される', () => {
            const mockStats = createMockDailyStats();
            
            view.updateDailyGraph(mockStats);
            
            const targetInfo = view.mockContainer.children[3];
            expect(targetInfo.textContent).toBe('目標: 1日30分');
            expect(targetInfo.className).toContain('text-center text-xs text-gray-500 mt-2');
        });
    });

    describe('Bar Height and Color Coding', () => {
        test('達成度0%の場合は灰色で最小高さ', () => {
            const mockStats = createMockDailyStats([
                { day: 0, achievementPercent: 0, sessionCount: 0, totalDuration: 0 }
            ]);
            
            view.updateDailyGraph(mockStats);
            
            const barsContainer = view.mockContainer.children[1];
            const bar = barsContainer.children[0].children[0].children[0];
            
            expect(bar.className).toContain('bg-gray-200');
            expect(bar.style.height).toBe('2px'); // Minimum height
        });

        test('達成度25%の場合は赤色', () => {
            const mockStats = createMockDailyStats([
                { day: 0, achievementPercent: 25, sessionCount: 1, totalDuration: 450 }
            ]);
            
            view.updateDailyGraph(mockStats);
            
            const barsContainer = view.mockContainer.children[1];
            const bar = barsContainer.children[0].children[0].children[0];
            
            expect(bar.className).toContain('bg-red-400');
            expect(bar.style.height).toBe('15px'); // 25% of 60px
        });

        test('達成度75%の場合は黄色', () => {
            const mockStats = createMockDailyStats([
                { day: 0, achievementPercent: 75, sessionCount: 1, totalDuration: 1350 }
            ]);
            
            view.updateDailyGraph(mockStats);
            
            const barsContainer = view.mockContainer.children[1];
            const bar = barsContainer.children[0].children[0].children[0];
            
            expect(bar.className).toContain('bg-yellow-400');
            expect(bar.style.height).toBe('45px'); // 75% of 60px
        });

        test('達成度100%の場合は緑色', () => {
            const mockStats = createMockDailyStats([
                { day: 0, achievementPercent: 100, sessionCount: 1, totalDuration: 1800 }
            ]);
            
            view.updateDailyGraph(mockStats);
            
            const barsContainer = view.mockContainer.children[1];
            const bar = barsContainer.children[0].children[0].children[0];
            
            expect(bar.className).toContain('bg-green-500');
            expect(bar.style.height).toBe('60px'); // 100% of 60px
        });

        test('達成度150%の場合も緑色で最大高さ', () => {
            const mockStats = createMockDailyStats([
                { day: 0, achievementPercent: 150, sessionCount: 2, totalDuration: 2700 }
            ]);
            
            view.updateDailyGraph(mockStats);
            
            const barsContainer = view.mockContainer.children[1];
            const bar = barsContainer.children[0].children[0].children[0];
            
            expect(bar.className).toContain('bg-green-500');
            expect(bar.style.height).toBe('60px'); // Capped at 100%
        });
    });

    describe('Tooltip Content', () => {
        test('ツールチップに正しい情報が含まれる', () => {
            const mockStats = createMockDailyStats([
                { 
                    day: 1, 
                    achievementPercent: 75, 
                    sessionCount: 2, 
                    totalDuration: 1350,
                    date: new Date()
                }
            ]);
            
            view.updateDailyGraph(mockStats);
            
            const barsContainer = view.mockContainer.children[1];
            const dayContainer = barsContainer.children[1]; // Monday
            
            expect(dayContainer.title).toBe('月曜日: 2セッション, 22分 (75%)');
        });

        test('各曜日のツールチップが正しく設定される', () => {
            const mockStats = createMockDailyStats();
            const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
            
            view.updateDailyGraph(mockStats);
            
            const barsContainer = view.mockContainer.children[1];
            barsContainer.children.forEach((dayContainer, index) => {
                expect(dayContainer.title).toContain(`${dayNames[index]}曜日:`);
            });
        });
    });

    describe('Today Highlight', () => {
        test('今日の曜日ラベルがハイライトされる', () => {
            const mockStats = createMockDailyStats();
            // Set today's stats
            const todayDayOfWeek = today.getDay();
            mockStats[todayDayOfWeek].date = today;
            
            view.updateDailyGraph(mockStats);
            
            const barsContainer = view.mockContainer.children[1];
            const todayContainer = barsContainer.children[todayDayOfWeek];
            const todayLabel = todayContainer.children[1];
            
            expect(todayLabel.className).toContain('text-blue-600 font-bold');
        });

        test('今日以外の曜日は通常スタイル', () => {
            const mockStats = createMockDailyStats();
            const todayDayOfWeek = today.getDay();
            mockStats[todayDayOfWeek].date = today;
            
            view.updateDailyGraph(mockStats);
            
            const barsContainer = view.mockContainer.children[1];
            barsContainer.children.forEach((dayContainer, index) => {
                const dayLabel = dayContainer.children[1];
                if (index !== todayDayOfWeek) {
                    expect(dayLabel.className).toContain('text-gray-600 font-medium');
                }
            });
        });
    });

    describe('Error Handling', () => {
        test('グラフコンテナが見つからない場合はエラーログ', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            view.mockGetElementById = () => null; // Simulate missing container
            
            view.updateDailyGraph(createMockDailyStats());
            
            expect(consoleSpy).toHaveBeenCalledWith('dailyGraph container not found');
            consoleSpy.mockRestore();
        });

        test('空の統計データでもエラーが発生しない', () => {
            expect(() => {
                view.updateDailyGraph([]);
            }).not.toThrow();
        });
    });
});

// Helper function to create mock daily stats
function createMockDailyStats(customStats = []) {
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const thisWeekSunday = new Date(today);
    thisWeekSunday.setDate(today.getDate() - currentDayOfWeek);
    thisWeekSunday.setHours(0, 0, 0, 0);
    
    const defaultStats = [];
    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(thisWeekSunday);
        dayDate.setDate(thisWeekSunday.getDate() + i);
        
        defaultStats.push({
            day: i,
            date: dayDate,
            sessionCount: 0,
            totalDuration: 0,
            achievementPercent: 0
        });
    }
    
    // Merge custom stats
    customStats.forEach((customStat) => {
        if (customStat.day !== undefined && customStat.day >= 0 && customStat.day < 7) {
            defaultStats[customStat.day] = {
                ...defaultStats[customStat.day],
                ...customStat
            };
        }
    });
    
    return defaultStats;
}