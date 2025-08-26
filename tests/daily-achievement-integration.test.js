/**
 * 日次達成度機能の統合テスト
 * Integration tests for daily achievement functionality
 */

// Mock the controller integration for daily achievement features
class TestDailyAchievementController {
    constructor() {
        this.model = {
            worker: null,
            testSessions: [],
            
            setTestSessions: function(sessions) {
                this.testSessions = sessions;
            },
            
            async getDailyStats() {
                const today = new Date();
                const currentDayOfWeek = today.getDay();
                const thisWeekSunday = new Date(today);
                thisWeekSunday.setDate(today.getDate() - currentDayOfWeek);
                thisWeekSunday.setHours(0, 0, 0, 0);
                
                const dailyStats = [];
                
                for (let i = 0; i < 7; i++) {
                    const dayStart = new Date(thisWeekSunday);
                    dayStart.setDate(thisWeekSunday.getDate() + i);
                    
                    const dayEnd = new Date(dayStart);
                    dayEnd.setHours(23, 59, 59, 999);
                    
                    const daySessions = this.testSessions.filter(s => {
                        const sessionDate = new Date(s.created_at);
                        return sessionDate >= dayStart && sessionDate <= dayEnd;
                    });
                    
                    const sessionCount = daySessions.length;
                    const totalDuration = daySessions.reduce((sum, s) => sum + s.duration, 0);
                    const targetDuration = 1800; // 30 minutes
                    const achievementPercent = Math.min(100, Math.round((totalDuration / targetDuration) * 100));
                    
                    dailyStats.push({
                        day: i,
                        date: dayStart,
                        sessionCount,
                        totalDuration,
                        achievementPercent
                    });
                }
                
                return dailyStats;
            }
        };
        
        this.view = {
            graphUpdateCalled: false,
            lastStatsReceived: null,
            
            updateDailyGraph: function(dailyStats) {
                this.graphUpdateCalled = true;
                this.lastStatsReceived = dailyStats;
                
                // Validate the stats structure
                if (!Array.isArray(dailyStats) || dailyStats.length !== 7) {
                    throw new Error('Invalid daily stats format');
                }
                
                dailyStats.forEach((stat, index) => {
                    if (typeof stat.day !== 'number' || stat.day !== index) {
                        throw new Error(`Invalid day value at index ${index}`);
                    }
                    if (!(stat.date instanceof Date)) {
                        throw new Error(`Invalid date at index ${index}`);
                    }
                    if (typeof stat.sessionCount !== 'number' || stat.sessionCount < 0) {
                        throw new Error(`Invalid session count at index ${index}`);
                    }
                    if (typeof stat.totalDuration !== 'number' || stat.totalDuration < 0) {
                        throw new Error(`Invalid total duration at index ${index}`);
                    }
                    if (typeof stat.achievementPercent !== 'number' || stat.achievementPercent < 0) {
                        throw new Error(`Invalid achievement percent at index ${index}`);
                    }
                });
                
                return true;
            }
        };
    }
    
    // Main method that integrates model and view
    async updateDailyAchievementDisplay() {
        try {
            const dailyStats = await this.model.getDailyStats();
            this.view.updateDailyGraph(dailyStats);
            return { success: true, stats: dailyStats };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Helper method to simulate database session creation
    async simulateWalkingSession(date, durationMinutes) {
        const sessionData = {
            duration: durationMinutes * 60, // Convert to seconds
            created_at: date.toISOString()
        };
        
        this.model.testSessions.push(sessionData);
        return sessionData;
    }
}

describe('Daily Achievement Integration', () => {
    let controller;
    let today;
    let thisWeekSunday;
    
    beforeEach(() => {
        controller = new TestDailyAchievementController();
        today = new Date();
        const currentDayOfWeek = today.getDay();
        thisWeekSunday = new Date(today);
        thisWeekSunday.setDate(today.getDate() - currentDayOfWeek);
        thisWeekSunday.setHours(0, 0, 0, 0);
    });

    describe('Model-View Integration', () => {
        test('モデルからビューへの正常なデータフロー', async () => {
            // Set up test data
            const monday = new Date(thisWeekSunday);
            monday.setDate(thisWeekSunday.getDate() + 1);
            
            await controller.simulateWalkingSession(monday, 30); // 30 minutes
            
            const result = await controller.updateDailyAchievementDisplay();
            
            expect(result.success).toBe(true);
            expect(controller.view.graphUpdateCalled).toBe(true);
            expect(controller.view.lastStatsReceived).toHaveLength(7);
            expect(controller.view.lastStatsReceived[1].sessionCount).toBe(1);
            expect(controller.view.lastStatsReceived[1].achievementPercent).toBe(100);
        });

        test('複数セッションの統合処理', async () => {
            const tuesday = new Date(thisWeekSunday);
            tuesday.setDate(thisWeekSunday.getDate() + 2);
            
            const friday = new Date(thisWeekSunday);
            friday.setDate(thisWeekSunday.getDate() + 5);
            
            // Create multiple sessions across different days
            await controller.simulateWalkingSession(tuesday, 15); // 15 minutes
            await controller.simulateWalkingSession(tuesday, 20); // 20 minutes
            await controller.simulateWalkingSession(friday, 45);  // 45 minutes
            
            const result = await controller.updateDailyAchievementDisplay();
            
            expect(result.success).toBe(true);
            
            // Tuesday: 35 minutes total = 116% achievement (capped at 100%)
            expect(result.stats[2].sessionCount).toBe(2);
            expect(result.stats[2].totalDuration).toBe(2100); // 35 minutes in seconds
            expect(result.stats[2].achievementPercent).toBe(100);
            
            // Friday: 45 minutes = 150% achievement (capped at 100%)
            expect(result.stats[5].sessionCount).toBe(1);
            expect(result.stats[5].totalDuration).toBe(2700); // 45 minutes in seconds
            expect(result.stats[5].achievementPercent).toBe(100);
        });

        test('データが空の場合の統合処理', async () => {
            const result = await controller.updateDailyAchievementDisplay();
            
            expect(result.success).toBe(true);
            expect(controller.view.graphUpdateCalled).toBe(true);
            
            // All days should have zero values
            result.stats.forEach((stat, index) => {
                expect(stat.day).toBe(index);
                expect(stat.sessionCount).toBe(0);
                expect(stat.totalDuration).toBe(0);
                expect(stat.achievementPercent).toBe(0);
                expect(stat.date).toBeInstanceOf(Date);
            });
        });
    });

    describe('Real-world Usage Patterns', () => {
        test('平日ワークアウトパターン', async () => {
            // Simulate a typical weekday workout pattern
            const workDays = [1, 2, 3, 4, 5]; // Monday to Friday
            
            for (const day of workDays) {
                const workDay = new Date(thisWeekSunday);
                workDay.setDate(thisWeekSunday.getDate() + day);
                workDay.setHours(7, 30, 0, 0); // Morning workout
                
                await controller.simulateWalkingSession(workDay, 30);
            }
            
            const result = await controller.updateDailyAchievementDisplay();
            
            expect(result.success).toBe(true);
            
            // Weekend days should be empty
            expect(result.stats[0].sessionCount).toBe(0); // Sunday
            expect(result.stats[6].sessionCount).toBe(0); // Saturday
            
            // Weekdays should have 100% achievement
            for (let i = 1; i <= 5; i++) {
                expect(result.stats[i].sessionCount).toBe(1);
                expect(result.stats[i].achievementPercent).toBe(100);
            }
        });

        test('不規則なワークアウトパターン', async () => {
            // Simulate irregular workout pattern
            const sunday = new Date(thisWeekSunday);
            const wednesday = new Date(thisWeekSunday);
            wednesday.setDate(thisWeekSunday.getDate() + 3);
            const saturday = new Date(thisWeekSunday);
            saturday.setDate(thisWeekSunday.getDate() + 6);
            
            // Short session on Sunday
            await controller.simulateWalkingSession(sunday, 10);
            
            // Double session on Wednesday
            await controller.simulateWalkingSession(wednesday, 20);
            await controller.simulateWalkingSession(wednesday, 25);
            
            // Long session on Saturday
            await controller.simulateWalkingSession(saturday, 60);
            
            const result = await controller.updateDailyAchievementDisplay();
            
            expect(result.success).toBe(true);
            
            // Sunday: 10 minutes = 33% achievement
            expect(result.stats[0].achievementPercent).toBe(33);
            
            // Wednesday: 45 minutes = 100% achievement (capped)
            expect(result.stats[3].sessionCount).toBe(2);
            expect(result.stats[3].achievementPercent).toBe(100);
            
            // Saturday: 60 minutes = 100% achievement (capped)
            expect(result.stats[6].achievementPercent).toBe(100);
            
            // Other days should be 0%
            [1, 2, 4, 5].forEach(day => {
                expect(result.stats[day].achievementPercent).toBe(0);
            });
        });
    });

    describe('Data Validation and Error Handling', () => {
        test('モデルからの無効なデータの処理', async () => {
            // Mock getDailyStats to return invalid data
            controller.model.getDailyStats = async () => {
                return []; // Invalid: should have 7 items
            };
            
            const result = await controller.updateDailyAchievementDisplay();
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid daily stats format');
        });

        test('日付境界値の正確性', async () => {
            // Test exactly at day boundaries
            const mondayEnd = new Date(thisWeekSunday);
            mondayEnd.setDate(thisWeekSunday.getDate() + 1);
            mondayEnd.setHours(23, 59, 59, 999);
            
            const tuesdayStart = new Date(thisWeekSunday);
            tuesdayStart.setDate(thisWeekSunday.getDate() + 2);
            tuesdayStart.setHours(0, 0, 0, 0);
            
            await controller.simulateWalkingSession(mondayEnd, 20);
            await controller.simulateWalkingSession(tuesdayStart, 25);
            
            const result = await controller.updateDailyAchievementDisplay();
            
            expect(result.success).toBe(true);
            expect(result.stats[1].sessionCount).toBe(1); // Monday
            expect(result.stats[2].sessionCount).toBe(1); // Tuesday
        });

        test('異なる週のセッション除外', async () => {
            const lastWeek = new Date(thisWeekSunday);
            lastWeek.setDate(thisWeekSunday.getDate() - 7);
            
            const nextWeek = new Date(thisWeekSunday);
            nextWeek.setDate(thisWeekSunday.getDate() + 7);
            
            const thisWeekWednesday = new Date(thisWeekSunday);
            thisWeekWednesday.setDate(thisWeekSunday.getDate() + 3);
            
            // Add sessions from different weeks
            await controller.simulateWalkingSession(lastWeek, 30);
            await controller.simulateWalkingSession(thisWeekWednesday, 30);
            await controller.simulateWalkingSession(nextWeek, 30);
            
            const result = await controller.updateDailyAchievementDisplay();
            
            expect(result.success).toBe(true);
            
            // Only this week's session should be counted
            expect(result.stats[3].sessionCount).toBe(1); // Wednesday
            expect(result.stats[3].achievementPercent).toBe(100);
            
            // Other days should be empty
            [0, 1, 2, 4, 5, 6].forEach(day => {
                expect(result.stats[day].sessionCount).toBe(0);
            });
        });
    });

    describe('Performance and Edge Cases', () => {
        test('大量セッションデータの処理', async () => {
            const wednesday = new Date(thisWeekSunday);
            wednesday.setDate(thisWeekSunday.getDate() + 3);
            
            // Create many short sessions on the same day
            for (let i = 0; i < 50; i++) {
                const sessionTime = new Date(wednesday);
                sessionTime.setMinutes(sessionTime.getMinutes() + (i * 2));
                await controller.simulateWalkingSession(sessionTime, 1); // 1 minute each
            }
            
            const result = await controller.updateDailyAchievementDisplay();
            
            expect(result.success).toBe(true);
            expect(result.stats[3].sessionCount).toBe(50);
            expect(result.stats[3].totalDuration).toBe(3000); // 50 minutes in seconds
            expect(result.stats[3].achievementPercent).toBe(100); // Capped at 100%
        });

        test('小数点を含む時間の四捨五入', async () => {
            const thursday = new Date(thisWeekSunday);
            thursday.setDate(thisWeekSunday.getDate() + 4);
            
            // Session that results in non-integer percentage
            // 25 minutes = 1500 seconds = 83.33% -> should round to 83%
            controller.model.testSessions = [{
                duration: 1500,
                created_at: thursday.toISOString()
            }];
            
            const result = await controller.updateDailyAchievementDisplay();
            
            expect(result.success).toBe(true);
            expect(result.stats[4].achievementPercent).toBe(83);
        });
    });
});