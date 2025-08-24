// Show More Sessions Button Test
// This test verifies the "Show more" button logic for session lists

import { WalkingController } from '../js/controller.js';
import { WalkingModel } from '../js/model.js';
import { WalkingView } from '../js/view.js';

// Mock the modules
jest.mock('../js/model.js');
jest.mock('../js/view.js');

describe('Show More Sessions Button Logic', () => {
    let controller;
    let mockModel;
    let mockView;

    beforeEach(() => {
        // Setup DOM elements required for the controller
        document.body.innerHTML = `
            <div id="startWalkBtn"></div>
            <div id="pauseBtn"></div>
            <div id="stopBtn"></div>
            <div id="backBtn"></div>
            <div id="backToMainBtn"></div>
            <div id="deleteBtn"></div>
            <div id="cancelBtn"></div>
            <div id="confirmDeleteBtn"></div>
            <div id="prevPageBtn"></div>
            <div id="nextPageBtn"></div>
            <div id="sessionList"></div>
            <div id="allSessionsList"></div>
        `;

        // Create fresh mock instances
        mockModel = new WalkingModel();
        mockView = new WalkingView();
        
        // Reset all mocks
        jest.clearAllMocks();
        
        // Setup default mock returns
        mockModel.initSQLite = jest.fn().mockResolvedValue();
        mockModel.getRecentSessions = jest.fn();
        mockModel.getAllSessions = jest.fn();
        mockView.clearSessionLists = jest.fn();
        mockView.addSessionToDOM = jest.fn().mockReturnValue(document.createElement('div'));
        mockView.showMoreSessionsButton = jest.fn();

        // Create controller instance
        controller = new WalkingController();
        controller.model = mockModel;
        controller.view = mockView;
    });

    describe('loadSessions method - Show More Button Logic', () => {
        test('should show "もっと見る" button when total count > 3', async () => {
            // Setup: 3 recent sessions, but 5 total sessions
            const mockRecentSessions = [
                { id: 1, created_at: '2024-01-01', duration: 1800000 },
                { id: 2, created_at: '2024-01-02', duration: 1800000 },
                { id: 3, created_at: '2024-01-03', duration: 1800000 }
            ];

            mockModel.getRecentSessions.mockResolvedValue(mockRecentSessions);
            mockModel.getAllSessions.mockResolvedValue({ 
                sessions: [{ id: 1 }], 
                totalCount: 5  // More than 3, should show button
            });

            await controller.loadSessions();

            expect(mockModel.getRecentSessions).toHaveBeenCalledWith(3);
            expect(mockModel.getAllSessions).toHaveBeenCalledWith(1, 1);
            expect(mockView.showMoreSessionsButton).toHaveBeenCalled();
        });

        test('should NOT show "もっと見る" button when total count = 3', async () => {
            // Setup: exactly 3 sessions total
            const mockRecentSessions = [
                { id: 1, created_at: '2024-01-01', duration: 1800000 },
                { id: 2, created_at: '2024-01-02', duration: 1800000 },
                { id: 3, created_at: '2024-01-03', duration: 1800000 }
            ];

            mockModel.getRecentSessions.mockResolvedValue(mockRecentSessions);
            mockModel.getAllSessions.mockResolvedValue({ 
                sessions: mockRecentSessions, 
                totalCount: 3  // Exactly 3, should NOT show button
            });

            await controller.loadSessions();

            expect(mockModel.getRecentSessions).toHaveBeenCalledWith(3);
            expect(mockModel.getAllSessions).toHaveBeenCalledWith(1, 1);
            expect(mockView.showMoreSessionsButton).not.toHaveBeenCalled();
        });

        test('should NOT show "もっと見る" button when total count < 3', async () => {
            // Setup: only 2 sessions total
            const mockRecentSessions = [
                { id: 1, created_at: '2024-01-01', duration: 1800000 },
                { id: 2, created_at: '2024-01-02', duration: 1800000 }
            ];

            mockModel.getRecentSessions.mockResolvedValue(mockRecentSessions);
            mockModel.getAllSessions.mockResolvedValue({ 
                sessions: mockRecentSessions, 
                totalCount: 2  // Less than 3, should NOT show button
            });

            await controller.loadSessions();

            expect(mockModel.getRecentSessions).toHaveBeenCalledWith(3);
            expect(mockModel.getAllSessions).toHaveBeenCalledWith(1, 1);
            expect(mockView.showMoreSessionsButton).not.toHaveBeenCalled();
        });

        test('should NOT show "もっと見る" button when total count = 0', async () => {
            // Setup: no sessions
            mockModel.getRecentSessions.mockResolvedValue([]);
            mockModel.getAllSessions.mockResolvedValue({ 
                sessions: [], 
                totalCount: 0  // No sessions, should NOT show button
            });

            await controller.loadSessions();

            expect(mockModel.getRecentSessions).toHaveBeenCalledWith(3);
            expect(mockModel.getAllSessions).toHaveBeenCalledWith(1, 1);
            expect(mockView.showMoreSessionsButton).not.toHaveBeenCalled();
        });

        test('should handle database errors gracefully and not show button', async () => {
            // Setup: getRecentSessions succeeds but getAllSessions fails
            const mockRecentSessions = [
                { id: 1, created_at: '2024-01-01', duration: 1800000 }
            ];

            mockModel.getRecentSessions.mockResolvedValue(mockRecentSessions);
            mockModel.getAllSessions.mockRejectedValue(new Error('Database error'));

            // Should not throw error
            await controller.loadSessions();

            expect(mockModel.getRecentSessions).toHaveBeenCalledWith(3);
            expect(mockModel.getAllSessions).toHaveBeenCalledWith(1, 1);
            // Button should not be shown when database error occurs
            expect(mockView.showMoreSessionsButton).not.toHaveBeenCalled();
        });

        test('should call clearSessionLists and display sessions correctly', async () => {
            const mockRecentSessions = [
                { id: 1, created_at: '2024-01-01', duration: 1800000 },
                { id: 2, created_at: '2024-01-02', duration: 1800000 }
            ];

            mockModel.getRecentSessions.mockResolvedValue(mockRecentSessions);
            mockModel.getAllSessions.mockResolvedValue({ 
                sessions: mockRecentSessions, 
                totalCount: 4 
            });

            await controller.loadSessions();

            expect(mockView.clearSessionLists).toHaveBeenCalled();
            expect(mockView.addSessionToDOM).toHaveBeenCalledTimes(2);
            expect(mockView.addSessionToDOM).toHaveBeenNthCalledWith(1, mockRecentSessions[0]);
            expect(mockView.addSessionToDOM).toHaveBeenNthCalledWith(2, mockRecentSessions[1]);
        });

        test('should display "まだセッションがありません" message when no sessions', async () => {
            mockModel.getRecentSessions.mockResolvedValue([]);
            mockModel.getAllSessions.mockResolvedValue({ 
                sessions: [], 
                totalCount: 0 
            });

            await controller.loadSessions();

            const sessionList = document.getElementById('sessionList');
            expect(sessionList.innerHTML).toBe('<p class="text-gray-500 text-sm">まだセッションがありません</p>');
            expect(mockView.showMoreSessionsButton).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases and Boundary Testing', () => {
        test('should handle exactly 4 sessions (boundary case)', async () => {
            // Setup: exactly 4 sessions total (boundary case)
            const mockRecentSessions = [
                { id: 1, created_at: '2024-01-01', duration: 1800000 },
                { id: 2, created_at: '2024-01-02', duration: 1800000 },
                { id: 3, created_at: '2024-01-03', duration: 1800000 }
            ];

            mockModel.getRecentSessions.mockResolvedValue(mockRecentSessions);
            mockModel.getAllSessions.mockResolvedValue({ 
                sessions: [{ id: 1 }], 
                totalCount: 4  // Exactly 4, should show button
            });

            await controller.loadSessions();

            expect(mockView.showMoreSessionsButton).toHaveBeenCalled();
        });

        test('should handle large number of sessions', async () => {
            // Setup: many sessions
            const mockRecentSessions = [
                { id: 1, created_at: '2024-01-01', duration: 1800000 },
                { id: 2, created_at: '2024-01-02', duration: 1800000 },
                { id: 3, created_at: '2024-01-03', duration: 1800000 }
            ];

            mockModel.getRecentSessions.mockResolvedValue(mockRecentSessions);
            mockModel.getAllSessions.mockResolvedValue({ 
                sessions: [{ id: 1 }], 
                totalCount: 100  // Many sessions, should show button
            });

            await controller.loadSessions();

            expect(mockView.showMoreSessionsButton).toHaveBeenCalled();
        });

        test('should handle invalid totalCount values gracefully', async () => {
            const mockRecentSessions = [
                { id: 1, created_at: '2024-01-01', duration: 1800000 }
            ];

            mockModel.getRecentSessions.mockResolvedValue(mockRecentSessions);
            
            // Test with null totalCount
            mockModel.getAllSessions.mockResolvedValue({ 
                sessions: mockRecentSessions, 
                totalCount: null 
            });

            await controller.loadSessions();
            expect(mockView.showMoreSessionsButton).not.toHaveBeenCalled();

            // Reset and test with undefined totalCount
            jest.clearAllMocks();
            mockModel.getAllSessions.mockResolvedValue({ 
                sessions: mockRecentSessions, 
                totalCount: undefined 
            });

            await controller.loadSessions();
            expect(mockView.showMoreSessionsButton).not.toHaveBeenCalled();
        });
    });

    describe('Integration with View Layer', () => {
        test('should properly integrate with showMoreSessionsButton view method', async () => {
            // This test ensures the controller calls the view method correctly
            const mockRecentSessions = [
                { id: 1, created_at: '2024-01-01', duration: 1800000 }
            ];

            mockModel.getRecentSessions.mockResolvedValue(mockRecentSessions);
            mockModel.getAllSessions.mockResolvedValue({ 
                sessions: mockRecentSessions, 
                totalCount: 5 
            });

            await controller.loadSessions();

            // Verify the view method is called exactly once
            expect(mockView.showMoreSessionsButton).toHaveBeenCalledTimes(1);
            expect(mockView.showMoreSessionsButton).toHaveBeenCalledWith();
        });
    });
});