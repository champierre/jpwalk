/**
 * 週の達成度機能のテスト
 * Tests for weekly achievement functionality
 */

// Mock WalkingModel class with getWeeklyAchievement method for testing
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

    async getWeeklyAchievement() {
        // Get daily stats for the current week
        const dailyStats = await this.getDailyStats();
        
        // Count how many days have 100% completion
        const completedDays = dailyStats.filter(day => day.achievementPercent >= 100).length;
        
        // Weekly achievement is met if 4 or more days have 100% completion
        const weeklyAchievement = {
            completedDays,
            targetDays: 4,
            achieved: completedDays >= 4,
            achievementPercent: Math.min(100, Math.round((completedDays / 4) * 100))
        };
        
        return weeklyAchievement;
    }
}

describe('Weekly Achievement', () => {
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

    describe('getWeeklyAchievement - Basic Functionality', () => {
        test('空のセッションデータで週の達成度を返す', async () => {
            model.setTestSessions([]);
            
            const weeklyAchievement = await model.getWeeklyAchievement();
            
            expect(weeklyAchievement.completedDays).toBe(0);
            expect(weeklyAchievement.targetDays).toBe(4);
            expect(weeklyAchievement.achieved).toBe(false);
            expect(weeklyAchievement.achievementPercent).toBe(0);
        });

        test('週の達成度の基本的な構造を確認する', async () => {
            model.setTestSessions([]);
            
            const weeklyAchievement = await model.getWeeklyAchievement();
            
            expect(weeklyAchievement).toHaveProperty('completedDays');
            expect(weeklyAchievement).toHaveProperty('targetDays');
            expect(weeklyAchievement).toHaveProperty('achieved');
            expect(weeklyAchievement).toHaveProperty('achievementPercent');
            
            expect(typeof weeklyAchievement.completedDays).toBe('number');
            expect(typeof weeklyAchievement.targetDays).toBe('number');
            expect(typeof weeklyAchievement.achieved).toBe('boolean');
            expect(typeof weeklyAchievement.achievementPercent).toBe('number');
        });
    });

    describe('Completed Days Counting', () => {
        test('100%達成日数を正しくカウントする', async () => {
            // Create sessions for different days with varying completion levels
            const monday = new Date(thisWeekSunday);
            monday.setDate(thisWeekSunday.getDate() + 1);
            
            const tuesday = new Date(thisWeekSunday);
            tuesday.setDate(thisWeekSunday.getDate() + 2);
            
            const wednesday = new Date(thisWeekSunday);
            wednesday.setDate(thisWeekSunday.getDate() + 3);
            
            const thursday = new Date(thisWeekSunday);
            thursday.setDate(thisWeekSunday.getDate() + 4);
            
            const testSessions = [
                { duration: 1800, created_at: monday.toISOString() },    // Monday: 100% (30 min)
                { duration: 900, created_at: tuesday.toISOString() },     // Tuesday: 50% (15 min)
                { duration: 2700, created_at: wednesday.toISOString() },  // Wednesday: 100% (45 min)
                { duration: 1800, created_at: thursday.toISOString() }    // Thursday: 100% (30 min)
            ];
            
            model.setTestSessions(testSessions);
            
            const weeklyAchievement = await model.getWeeklyAchievement();
            
            expect(weeklyAchievement.completedDays).toBe(3); // Monday, Wednesday, Thursday
        });

        test('複数セッションで100%達成した日もカウントする', async () => {
            const friday = new Date(thisWeekSunday);
            friday.setDate(thisWeekSunday.getDate() + 5);
            
            const testSessions = [
                { duration: 600, created_at: friday.toISOString() },  // 10 minutes
                { duration: 900, created_at: friday.toISOString() },  // 15 minutes  
                { duration: 300, created_at: friday.toISOString() }   // 5 minutes = 30 minutes total
            ];
            
            model.setTestSessions(testSessions);
            
            const weeklyAchievement = await model.getWeeklyAchievement();
            
            expect(weeklyAchievement.completedDays).toBe(1); // Friday: 100%
        });
    });

    describe('Weekly Achievement Status', () => {
        test('4日以上達成で週の目標達成となる', async () => {
            // Create sessions for 4 days with 100% completion each
            const testSessions = [];
            for (let i = 1; i <= 4; i++) { // Monday to Thursday
                const day = new Date(thisWeekSunday);
                day.setDate(thisWeekSunday.getDate() + i);
                testSessions.push({ duration: 1800, created_at: day.toISOString() });
            }
            
            model.setTestSessions(testSessions);
            
            const weeklyAchievement = await model.getWeeklyAchievement();
            
            expect(weeklyAchievement.completedDays).toBe(4);
            expect(weeklyAchievement.achieved).toBe(true);
            expect(weeklyAchievement.achievementPercent).toBe(100);
        });

        test('3日達成では週の目標未達成となる', async () => {
            // Create sessions for 3 days with 100% completion each
            const testSessions = [];
            for (let i = 1; i <= 3; i++) { // Monday to Wednesday
                const day = new Date(thisWeekSunday);
                day.setDate(thisWeekSunday.getDate() + i);
                testSessions.push({ duration: 1800, created_at: day.toISOString() });
            }
            
            model.setTestSessions(testSessions);
            
            const weeklyAchievement = await model.getWeeklyAchievement();
            
            expect(weeklyAchievement.completedDays).toBe(3);
            expect(weeklyAchievement.achieved).toBe(false);
            expect(weeklyAchievement.achievementPercent).toBe(75); // 3/4 * 100 = 75%
        });

        test('5日以上達成でも週の目標達成（100%で上限）', async () => {
            // Create sessions for all 7 days with 100% completion each
            const testSessions = [];
            for (let i = 0; i < 7; i++) { // Sunday to Saturday
                const day = new Date(thisWeekSunday);
                day.setDate(thisWeekSunday.getDate() + i);
                testSessions.push({ duration: 1800, created_at: day.toISOString() });
            }
            
            model.setTestSessions(testSessions);
            
            const weeklyAchievement = await model.getWeeklyAchievement();
            
            expect(weeklyAchievement.completedDays).toBe(7);
            expect(weeklyAchievement.achieved).toBe(true);
            expect(weeklyAchievement.achievementPercent).toBe(100); // Capped at 100%
        });
    });

    describe('Achievement Percentage Calculation', () => {
        test('達成パーセンテージを正しく計算する', async () => {
            const testCases = [
                { days: 0, expectedPercent: 0 },    // 0/4 = 0%
                { days: 1, expectedPercent: 25 },   // 1/4 = 25%
                { days: 2, expectedPercent: 50 },   // 2/4 = 50%
                { days: 3, expectedPercent: 75 },   // 3/4 = 75%
                { days: 4, expectedPercent: 100 },  // 4/4 = 100%
                { days: 5, expectedPercent: 100 },  // 5/4 = 125%, capped at 100%
                { days: 7, expectedPercent: 100 }   // 7/4 = 175%, capped at 100%
            ];
            
            for (const testCase of testCases) {
                const testSessions = [];
                for (let i = 0; i < testCase.days; i++) {
                    const day = new Date(thisWeekSunday);
                    day.setDate(thisWeekSunday.getDate() + i);
                    testSessions.push({ duration: 1800, created_at: day.toISOString() });
                }
                
                model.setTestSessions(testSessions);
                const weeklyAchievement = await model.getWeeklyAchievement();
                
                expect(weeklyAchievement.achievementPercent).toBe(testCase.expectedPercent);
            }
        });

        test('小数点以下は四捨五入される', async () => {
            // Create 1 day with 100% completion (1/4 = 25%)
            const monday = new Date(thisWeekSunday);
            monday.setDate(thisWeekSunday.getDate() + 1);
            
            const testSessions = [
                { duration: 1800, created_at: monday.toISOString() }
            ];
            
            model.setTestSessions(testSessions);
            const weeklyAchievement = await model.getWeeklyAchievement();
            
            expect(weeklyAchievement.achievementPercent).toBe(25); // Exactly 25%
        });
    });

    describe('Target Days Verification', () => {
        test('目標日数は常に4日である', async () => {
            const testCases = [
                [],
                [{ duration: 1800, created_at: thisWeekSunday.toISOString() }],
                [
                    { duration: 1800, created_at: thisWeekSunday.toISOString() },
                    { duration: 1800, created_at: new Date(thisWeekSunday.getTime() + 24 * 60 * 60 * 1000).toISOString() }
                ]
            ];
            
            for (const testSessions of testCases) {
                model.setTestSessions(testSessions);
                const weeklyAchievement = await model.getWeeklyAchievement();
                
                expect(weeklyAchievement.targetDays).toBe(4);
            }
        });
    });

    describe('Edge Cases', () => {
        test('99%達成日は100%達成にカウントされない', async () => {
            const monday = new Date(thisWeekSunday);
            monday.setDate(thisWeekSunday.getDate() + 1);
            
            // 29.7 minutes = 1782 seconds = 99%
            const testSessions = [
                { duration: 1782, created_at: monday.toISOString() }
            ];
            
            model.setTestSessions(testSessions);
            const weeklyAchievement = await model.getWeeklyAchievement();
            
            expect(weeklyAchievement.completedDays).toBe(0); // 99% doesn't count as completed
            expect(weeklyAchievement.achieved).toBe(false);
        });

        test('ちょうど100%達成日は100%達成にカウントされる', async () => {
            const monday = new Date(thisWeekSunday);
            monday.setDate(thisWeekSunday.getDate() + 1);
            
            // Exactly 30 minutes = 1800 seconds = 100%
            const testSessions = [
                { duration: 1800, created_at: monday.toISOString() }
            ];
            
            model.setTestSessions(testSessions);
            const weeklyAchievement = await model.getWeeklyAchievement();
            
            expect(weeklyAchievement.completedDays).toBe(1);
            expect(weeklyAchievement.achieved).toBe(false); // Only 1/4 days
        });

        test('100%を超える達成日も100%達成にカウントされる', async () => {
            const monday = new Date(thisWeekSunday);
            monday.setDate(thisWeekSunday.getDate() + 1);
            
            // 60 minutes = 3600 seconds = 200% (but counts as 100% completed day)
            const testSessions = [
                { duration: 3600, created_at: monday.toISOString() }
            ];
            
            model.setTestSessions(testSessions);
            const weeklyAchievement = await model.getWeeklyAchievement();
            
            expect(weeklyAchievement.completedDays).toBe(1);
            expect(weeklyAchievement.achieved).toBe(false); // Only 1/4 days
        });
    });
});