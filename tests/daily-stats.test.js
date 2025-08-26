/**
 * 日次統計機能のテスト
 * Tests for daily statistics functionality
 */

// Mock WalkingModel class with getDailyStats method for testing
class TestWalkingModel {
    constructor() {
        this.worker = null;
        this.testSessions = [];
    }

    // Test helper to set mock session data
    setTestSessions(sessions) {
        this.testSessions = sessions;
    }

    async getDailyStats() {
        // Get current week Sunday to Saturday
        const today = new Date();
        const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Calculate this week's Sunday
        const thisWeekSunday = new Date(today);
        thisWeekSunday.setDate(today.getDate() - currentDayOfWeek);
        thisWeekSunday.setHours(0, 0, 0, 0);
        
        // Array to store daily stats (Sun, Mon, Tue, Wed, Thu, Fri, Sat)
        const dailyStats = [];
        
        for (let i = 0; i < 7; i++) {
            const dayStart = new Date(thisWeekSunday);
            dayStart.setDate(thisWeekSunday.getDate() + i);
            
            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);
            
            // Mock database query using test sessions
            const daySessions = this.testSessions.filter(s => {
                const sessionDate = new Date(s.created_at);
                return sessionDate >= dayStart && sessionDate <= dayEnd;
            });
            
            const sessionCount = daySessions.length;
            const totalDuration = daySessions.reduce((sum, s) => sum + s.duration, 0);
            
            // Calculate achievement level (0-100)
            // Target: 30 minutes (1800 seconds) per day
            const targetDuration = 1800; // 30 minutes in seconds
            const achievementPercent = Math.min(100, Math.round((totalDuration / targetDuration) * 100));
            
            dailyStats.push({
                day: i, // 0 = Sunday, 1 = Monday, etc.
                date: dayStart,
                sessionCount,
                totalDuration, // in seconds
                achievementPercent
            });
        }
        
        return dailyStats;
    }
}

describe('Daily Statistics', () => {
    let model;
    let today;
    let thisWeekSunday;
    
    beforeEach(() => {
        model = new TestWalkingModel();
        today = new Date();
        const currentDayOfWeek = today.getDay();
        thisWeekSunday = new Date(today);
        thisWeekSunday.setDate(today.getDate() - currentDayOfWeek);
        thisWeekSunday.setHours(0, 0, 0, 0);
    });

    describe('getDailyStats - Basic Functionality', () => {
        test('空のセッションデータで7日分の統計を返す', async () => {
            model.setTestSessions([]);
            
            const dailyStats = await model.getDailyStats();
            
            expect(dailyStats).toHaveLength(7);
            expect(dailyStats[0].day).toBe(0); // Sunday
            expect(dailyStats[6].day).toBe(6); // Saturday
            
            // All days should have zero stats
            dailyStats.forEach(stat => {
                expect(stat.sessionCount).toBe(0);
                expect(stat.totalDuration).toBe(0);
                expect(stat.achievementPercent).toBe(0);
                expect(stat.date).toBeInstanceOf(Date);
            });
        });

        test('今週の各曜日の日付が正しく設定される', async () => {
            model.setTestSessions([]);
            
            const dailyStats = await model.getDailyStats();
            
            dailyStats.forEach((stat, index) => {
                const expectedDate = new Date(thisWeekSunday);
                expectedDate.setDate(thisWeekSunday.getDate() + index);
                expectedDate.setHours(0, 0, 0, 0);
                
                expect(stat.date.getTime()).toBe(expectedDate.getTime());
                expect(stat.day).toBe(index);
            });
        });
    });

    describe('Session Count and Duration Calculation', () => {
        test('今週の各日のセッション数をカウントする', async () => {
            // Create test sessions for different days of the week
            const monday = new Date(thisWeekSunday);
            monday.setDate(thisWeekSunday.getDate() + 1); // Monday
            
            const wednesday = new Date(thisWeekSunday);
            wednesday.setDate(thisWeekSunday.getDate() + 3); // Wednesday
            
            const testSessions = [
                { duration: 1800, created_at: monday.toISOString() }, // Monday: 30 minutes
                { duration: 900, created_at: monday.toISOString() },  // Monday: 15 minutes
                { duration: 1800, created_at: wednesday.toISOString() } // Wednesday: 30 minutes
            ];
            
            model.setTestSessions(testSessions);
            
            const dailyStats = await model.getDailyStats();
            
            expect(dailyStats[0].sessionCount).toBe(0); // Sunday
            expect(dailyStats[1].sessionCount).toBe(2); // Monday
            expect(dailyStats[2].sessionCount).toBe(0); // Tuesday
            expect(dailyStats[3].sessionCount).toBe(1); // Wednesday
            expect(dailyStats[4].sessionCount).toBe(0); // Thursday
            expect(dailyStats[5].sessionCount).toBe(0); // Friday
            expect(dailyStats[6].sessionCount).toBe(0); // Saturday
        });

        test('各日の総運動時間を正しく計算する', async () => {
            const monday = new Date(thisWeekSunday);
            monday.setDate(thisWeekSunday.getDate() + 1);
            
            const testSessions = [
                { duration: 1800, created_at: monday.toISOString() }, // 30 minutes
                { duration: 900, created_at: monday.toISOString() }   // 15 minutes
            ];
            
            model.setTestSessions(testSessions);
            
            const dailyStats = await model.getDailyStats();
            
            expect(dailyStats[1].totalDuration).toBe(2700); // 45 minutes total
        });
    });

    describe('Achievement Percentage Calculation', () => {
        test('目標達成率を正しく計算する（30分 = 100%）', async () => {
            const monday = new Date(thisWeekSunday);
            monday.setDate(thisWeekSunday.getDate() + 1);
            
            const testCases = [
                { duration: 0, expectedPercent: 0 },      // 0% 
                { duration: 900, expectedPercent: 50 },   // 50% (15 minutes)
                { duration: 1800, expectedPercent: 100 }, // 100% (30 minutes)
                { duration: 2700, expectedPercent: 100 }, // 100% (45 minutes, capped at 100%)
                { duration: 3600, expectedPercent: 100 }  // 100% (60 minutes, capped at 100%)
            ];
            
            for (const testCase of testCases) {
                const testSessions = [
                    { duration: testCase.duration, created_at: monday.toISOString() }
                ];
                
                model.setTestSessions(testSessions);
                const dailyStats = await model.getDailyStats();
                
                expect(dailyStats[1].achievementPercent).toBe(testCase.expectedPercent);
            }
        });

        test('小数点以下は四捨五入される', async () => {
            const monday = new Date(thisWeekSunday);
            monday.setDate(thisWeekSunday.getDate() + 1);
            
            // 25 minutes = 1500 seconds = 83.33% -> should round to 83%
            const testSessions = [
                { duration: 1500, created_at: monday.toISOString() }
            ];
            
            model.setTestSessions(testSessions);
            const dailyStats = await model.getDailyStats();
            
            expect(dailyStats[1].achievementPercent).toBe(83);
        });
    });

    describe('Edge Cases', () => {
        test('先週や来週のセッションは除外される', async () => {
            const lastWeek = new Date(thisWeekSunday);
            lastWeek.setDate(thisWeekSunday.getDate() - 7);
            
            const nextWeek = new Date(thisWeekSunday);
            nextWeek.setDate(thisWeekSunday.getDate() + 7);
            
            const testSessions = [
                { duration: 1800, created_at: lastWeek.toISOString() },
                { duration: 1800, created_at: nextWeek.toISOString() }
            ];
            
            model.setTestSessions(testSessions);
            const dailyStats = await model.getDailyStats();
            
            // All days should have zero stats
            dailyStats.forEach(stat => {
                expect(stat.sessionCount).toBe(0);
                expect(stat.totalDuration).toBe(0);
                expect(stat.achievementPercent).toBe(0);
            });
        });

        test('日付境界での正確な判定', async () => {
            const monday = new Date(thisWeekSunday);
            monday.setDate(thisWeekSunday.getDate() + 1);
            monday.setHours(23, 59, 59, 999); // Monday 23:59:59
            
            const tuesday = new Date(thisWeekSunday);
            tuesday.setDate(thisWeekSunday.getDate() + 2);
            tuesday.setHours(0, 0, 0, 0); // Tuesday 00:00:00
            
            const testSessions = [
                { duration: 1800, created_at: monday.toISOString() },
                { duration: 1800, created_at: tuesday.toISOString() }
            ];
            
            model.setTestSessions(testSessions);
            const dailyStats = await model.getDailyStats();
            
            expect(dailyStats[1].sessionCount).toBe(1); // Monday
            expect(dailyStats[2].sessionCount).toBe(1); // Tuesday
        });

        test('複数セッションの累積計算', async () => {
            const friday = new Date(thisWeekSunday);
            friday.setDate(thisWeekSunday.getDate() + 5);
            
            // Multiple sessions on the same day
            const testSessions = [
                { duration: 600, created_at: friday.toISOString() },  // 10 minutes
                { duration: 900, created_at: friday.toISOString() },  // 15 minutes
                { duration: 300, created_at: friday.toISOString() }   // 5 minutes
            ];
            
            model.setTestSessions(testSessions);
            const dailyStats = await model.getDailyStats();
            
            expect(dailyStats[5].sessionCount).toBe(3);
            expect(dailyStats[5].totalDuration).toBe(1800); // 30 minutes total
            expect(dailyStats[5].achievementPercent).toBe(100); // 100% achievement
        });
    });
});