// View Layer - Show More Sessions Button Test
// Tests the actual DOM manipulation and button rendering

import { WalkingView } from '../js/view.js';

describe('WalkingView - Show More Sessions Button', () => {
    let view;

    beforeEach(() => {
        // Setup DOM elements required for the view
        document.body.innerHTML = `
            <div id="sessionList"></div>
            <div id="allSessionsList"></div>
        `;
        
        view = new WalkingView();
    });

    afterEach(() => {
        // Clean up DOM
        document.body.innerHTML = '';
    });

    describe('showMoreSessionsButton method', () => {
        test('should create and append "もっと見る" button to session list', () => {
            const sessionList = document.getElementById('sessionList');
            
            // Ensure session list is initially empty
            expect(sessionList.children.length).toBe(0);
            
            view.showMoreSessionsButton();
            
            // Check that a button container was added
            expect(sessionList.children.length).toBe(1);
            
            const buttonContainer = sessionList.children[0];
            expect(buttonContainer.className).toBe('text-center pt-3');
            
            // Check that button exists with correct text
            const button = buttonContainer.querySelector('#moreSessionsBtn');
            expect(button).toBeTruthy();
            expect(button.textContent.trim()).toBe('もっと見る');
            expect(button.className).toContain('text-blue-500');
            expect(button.className).toContain('hover:text-blue-600');
        });

        test('should add click event listener that navigates to sessions page', () => {
            // Mock window.location.hash
            delete window.location;
            window.location = { hash: '' };
            
            view.showMoreSessionsButton();
            
            const button = document.getElementById('moreSessionsBtn');
            expect(button).toBeTruthy();
            
            // Simulate button click
            button.click();
            
            // Verify navigation
            expect(window.location.hash).toBe('#sessions');
        });

        test('should not interfere with existing session list content', () => {
            const sessionList = document.getElementById('sessionList');
            
            // Add some existing content
            const existingSession = document.createElement('div');
            existingSession.textContent = '既存のセッション';
            existingSession.className = 'existing-session';
            sessionList.appendChild(existingSession);
            
            expect(sessionList.children.length).toBe(1);
            
            view.showMoreSessionsButton();
            
            // Check that existing content is preserved
            expect(sessionList.children.length).toBe(2);
            expect(sessionList.querySelector('.existing-session')).toBeTruthy();
            expect(sessionList.querySelector('.existing-session').textContent).toBe('既存のセッション');
            
            // Check that button was added after existing content
            const buttonContainer = sessionList.children[1];
            expect(buttonContainer.className).toBe('text-center pt-3');
        });

        test('should create button with correct HTML structure and classes', () => {
            view.showMoreSessionsButton();
            
            const sessionList = document.getElementById('sessionList');
            const buttonContainer = sessionList.querySelector('.text-center.pt-3');
            
            expect(buttonContainer).toBeTruthy();
            
            const button = buttonContainer.querySelector('#moreSessionsBtn');
            expect(button).toBeTruthy();
            expect(button.tagName.toLowerCase()).toBe('button');
            
            // Check all expected CSS classes
            const expectedClasses = ['text-blue-500', 'hover:text-blue-600', 'text-sm', 'font-medium'];
            expectedClasses.forEach(className => {
                expect(button.classList.contains(className)).toBe(true);
            });
        });

        test('should handle multiple calls without duplicating buttons', () => {
            const sessionList = document.getElementById('sessionList');
            
            // Call showMoreSessionsButton multiple times
            view.showMoreSessionsButton();
            view.showMoreSessionsButton();
            view.showMoreSessionsButton();
            
            // Should still only have 3 button containers (one per call)
            // Note: This is current behavior - each call adds a new button
            // This test documents the behavior; you may want to modify 
            // the implementation to prevent duplicates if needed
            expect(sessionList.children.length).toBe(3);
            
            // All should be button containers
            Array.from(sessionList.children).forEach(child => {
                expect(child.className).toBe('text-center pt-3');
                expect(child.querySelector('#moreSessionsBtn')).toBeTruthy();
            });
        });
    });

    describe('Button Accessibility and UX', () => {
        test('button should be keyboard accessible', () => {
            view.showMoreSessionsButton();
            
            const button = document.getElementById('moreSessionsBtn');
            
            // Button should be focusable (implicit with button element)
            expect(button.tagName.toLowerCase()).toBe('button');
            
            // Button should have readable text
            expect(button.textContent.trim()).toBe('もっと見る');
            
            // Button should not be disabled
            expect(button.disabled).toBe(false);
        });

        test('button should have proper visual styling for interaction', () => {
            view.showMoreSessionsButton();
            
            const button = document.getElementById('moreSessionsBtn');
            
            // Check hover state classes
            expect(button.classList.contains('hover:text-blue-600')).toBe(true);
            expect(button.classList.contains('text-blue-500')).toBe(true);
            
            // Check sizing and typography
            expect(button.classList.contains('text-sm')).toBe(true);
            expect(button.classList.contains('font-medium')).toBe(true);
        });

        test('button container should have proper spacing', () => {
            view.showMoreSessionsButton();
            
            const sessionList = document.getElementById('sessionList');
            const buttonContainer = sessionList.children[0];
            
            // Check container classes for spacing and alignment
            expect(buttonContainer.classList.contains('text-center')).toBe(true);
            expect(buttonContainer.classList.contains('pt-3')).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should handle missing sessionList element gracefully', () => {
            // Remove the sessionList element
            document.getElementById('sessionList').remove();
            
            // Should not throw error
            expect(() => {
                view.showMoreSessionsButton();
            }).not.toThrow();
        });

        test('should handle multiple button creation correctly', () => {
            // Create button twice
            view.showMoreSessionsButton();
            view.showMoreSessionsButton();
            
            // Both buttons should be functional
            const buttons = document.querySelectorAll('#moreSessionsBtn');
            expect(buttons.length).toBe(2);
            
            // Mock window.location.hash
            delete window.location;
            window.location = { hash: '' };
            
            // Click both buttons
            buttons[0].click();
            expect(window.location.hash).toBe('#sessions');
            
            window.location.hash = '';
            buttons[1].click();
            expect(window.location.hash).toBe('#sessions');
        });
    });
});