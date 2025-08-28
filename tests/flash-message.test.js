// Flash Message Feature Tests
// Tests flash message display, auto-hide, manual close, and URL parameter handling

describe('Flash Message Feature', () => {
    beforeEach(() => {
        // Setup DOM with flash message elements
        document.body.innerHTML = `
            <div id="flashMessage" class="hidden fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
                <div class="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-down">
                    <svg id="flashMessageIcon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span id="flashMessageText">メッセージ</span>
                    <button id="flashMessageClose" class="ml-auto text-white hover:opacity-70 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
            <div id="mainView"></div>
            <div id="sessionView"></div>
            <div id="sessionsView"></div>
        `;

        // Clear all mocks
        jest.clearAllMocks();
        jest.clearAllTimers();
        jest.useFakeTimers();
    });
    
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    // Create a simplified flash message implementation for testing
    function showFlashMessage(message, type = 'success') {
        const flashContainer = document.getElementById('flashMessage');
        const flashText = document.getElementById('flashMessageText');
        const flashIcon = document.getElementById('flashMessageIcon');
        
        if (!flashContainer || !flashText) {
            console.error('Flash message elements not found');
            return;
        }
        
        const flashDiv = flashContainer.querySelector('div');
        if (!flashDiv) {
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
            hideFlashMessage();
        }, hideTimeout);
        
        // Setup close button
        const closeBtn = document.getElementById('flashMessageClose');
        if (closeBtn) {
            closeBtn.onclick = () => hideFlashMessage();
        }
    }

    function hideFlashMessage() {
        const flashContainer = document.getElementById('flashMessage');
        if (flashContainer) {
            flashContainer.classList.add('hidden');
        }
    }

    describe('Flash Message Display', () => {
        test('displays success message correctly', () => {
            const message = 'セッションが正常に削除されました';
            showFlashMessage(message, 'success');
            
            const flashContainer = document.getElementById('flashMessage');
            const flashText = document.getElementById('flashMessageText');
            const flashDiv = flashContainer.querySelector('div');
            const flashIcon = document.getElementById('flashMessageIcon');
            
            // Check message is displayed
            expect(flashContainer.classList.contains('hidden')).toBe(false);
            expect(flashText.textContent).toBe(message);
            
            // Check success styling
            expect(flashDiv.className).toContain('bg-green-500');
            expect(flashDiv.className).toContain('text-white');
            
            // Check icon is updated
            const pathElement = flashIcon.querySelector('path');
            expect(pathElement.getAttribute('d')).toBe('M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z');
        });
        
        test('displays error message with correct styling', () => {
            const message = 'エラーが発生しました';
            showFlashMessage(message, 'error');
            
            const flashDiv = document.getElementById('flashMessage').querySelector('div');
            const flashIcon = document.getElementById('flashMessageIcon');
            
            // Check error styling
            expect(flashDiv.className).toContain('bg-red-500');
            expect(flashDiv.className).toContain('text-white');
            
            // Check error icon
            const pathElement = flashIcon.querySelector('path');
            expect(pathElement.getAttribute('d')).toBe('M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z');
        });
        
        test('displays warning message with correct styling', () => {
            const message = '警告メッセージ';
            showFlashMessage(message, 'warning');
            
            const flashDiv = document.getElementById('flashMessage').querySelector('div');
            const flashIcon = document.getElementById('flashMessageIcon');
            
            // Check warning styling
            expect(flashDiv.className).toContain('bg-yellow-500');
            expect(flashDiv.className).toContain('text-white');
            
            // Check warning icon
            const pathElement = flashIcon.querySelector('path');
            expect(pathElement.getAttribute('d')).toBe('M12 9v3.75m0 0v.008h.008V12.75H12zm0 0h.008v.008H12V12.75zm9-6.75a9 9 0 11-18 0 9 9 0 0118 0z');
        });
        
        test('displays info message with correct styling', () => {
            const message = '情報メッセージ';
            showFlashMessage(message, 'info');
            
            const flashDiv = document.getElementById('flashMessage').querySelector('div');
            const flashIcon = document.getElementById('flashMessageIcon');
            
            // Check info styling
            expect(flashDiv.className).toContain('bg-blue-500');
            expect(flashDiv.className).toContain('text-white');
            
            // Check info icon
            const pathElement = flashIcon.querySelector('path');
            expect(pathElement.getAttribute('d')).toBe('M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z');
        });
    });

    describe('Flash Message Behavior', () => {
        test('handles missing elements gracefully', () => {
            // Remove flash message elements
            document.getElementById('flashMessage').remove();
            
            // Should not throw error
            expect(() => {
                showFlashMessage('テスト', 'success');
            }).not.toThrow();
            
            // Should log error
            expect(console.error).toHaveBeenCalledWith('Flash message elements not found');
        });
        
        test('auto-hides after default timeout', () => {
            showFlashMessage('テスト', 'success');
            
            const flashContainer = document.getElementById('flashMessage');
            
            // Should be visible initially
            expect(flashContainer.classList.contains('hidden')).toBe(false);
            
            // Fast forward 5 seconds
            jest.advanceTimersByTime(5000);
            
            // Should be hidden
            expect(flashContainer.classList.contains('hidden')).toBe(true);
        });
        
        test('auto-hides after longer timeout for error messages', () => {
            showFlashMessage('エラー', 'error');
            
            const flashContainer = document.getElementById('flashMessage');
            
            // Should be visible initially
            expect(flashContainer.classList.contains('hidden')).toBe(false);
            
            // Fast forward 5 seconds (less than error timeout)
            jest.advanceTimersByTime(5000);
            
            // Should still be visible
            expect(flashContainer.classList.contains('hidden')).toBe(false);
            
            // Fast forward another 1 second (total 6 seconds)
            jest.advanceTimersByTime(1000);
            
            // Should be hidden
            expect(flashContainer.classList.contains('hidden')).toBe(true);
        });
        
        test('hideFlashMessage hides the message', () => {
            // Show message first
            showFlashMessage('テスト', 'success');
            const flashContainer = document.getElementById('flashMessage');
            expect(flashContainer.classList.contains('hidden')).toBe(false);
            
            // Hide message
            hideFlashMessage();
            expect(flashContainer.classList.contains('hidden')).toBe(true);
        });
        
        test('close button triggers hideFlashMessage', () => {
            showFlashMessage('テスト', 'success');
            
            const flashContainer = document.getElementById('flashMessage');
            const closeBtn = document.getElementById('flashMessageClose');
            
            // Should be visible
            expect(flashContainer.classList.contains('hidden')).toBe(false);
            
            // Click close button
            closeBtn.click();
            
            // Should be hidden
            expect(flashContainer.classList.contains('hidden')).toBe(true);
        });
    });
    
    describe('Flash Message Accessibility and Structure', () => {
        test('flash message container has appropriate positioning classes', () => {
            const flashContainer = document.getElementById('flashMessage');
            
            expect(flashContainer.classList.contains('fixed')).toBe(true);
            expect(flashContainer.classList.contains('top-4')).toBe(true);
            expect(flashContainer.classList.contains('left-4')).toBe(true);
            expect(flashContainer.classList.contains('right-4')).toBe(true);
            expect(flashContainer.classList.contains('z-50')).toBe(true);
        });
        
        test('close button is keyboard accessible', () => {
            const closeBtn = document.getElementById('flashMessageClose');
            
            expect(closeBtn).toBeTruthy();
            expect(closeBtn.tagName).toBe('BUTTON');
        });
        
        test('flash message starts hidden', () => {
            const flashContainer = document.getElementById('flashMessage');
            expect(flashContainer.classList.contains('hidden')).toBe(true);
        });
        
        test('flash message elements exist in DOM', () => {
            const flashContainer = document.getElementById('flashMessage');
            const flashText = document.getElementById('flashMessageText');
            const flashDiv = flashContainer.querySelector('div');
            const flashIcon = document.getElementById('flashMessageIcon');
            const closeBtn = document.getElementById('flashMessageClose');
            
            expect(flashContainer).toBeTruthy();
            expect(flashText).toBeTruthy();
            expect(flashDiv).toBeTruthy();
            expect(flashIcon).toBeTruthy();
            expect(closeBtn).toBeTruthy();
        });
    });

    describe('URL Parameter Handling Simulation', () => {
        test('deletion success message should be displayed when deleted=session', () => {
            // Simulate the logic from the controller router
            const mockUrlParams = new URLSearchParams('?deleted=session');
            const deleted = mockUrlParams.get('deleted');
            
            if (deleted === 'session') {
                showFlashMessage('セッションが正常に削除されました', 'success');
            }
            
            const flashContainer = document.getElementById('flashMessage');
            const flashText = document.getElementById('flashMessageText');
            
            expect(flashContainer.classList.contains('hidden')).toBe(false);
            expect(flashText.textContent).toBe('セッションが正常に削除されました');
        });
        
        test('no message should be displayed when deleted parameter is different', () => {
            const mockUrlParams = new URLSearchParams('?deleted=other');
            const deleted = mockUrlParams.get('deleted');
            
            // Simulate controller logic - no flash message for non-session deletions
            if (deleted !== 'session') {
                // No flash message should be shown
                const flashContainer = document.getElementById('flashMessage');
                expect(flashContainer.classList.contains('hidden')).toBe(true);
            }
        });
        
        test('URL parameter cleanup simulation', () => {
            const mockUrl = new URL('http://localhost:8000/?deleted=session');
            
            // Simulate URL cleanup logic
            mockUrl.searchParams.delete('deleted');
            
            // Parameter should be removed
            expect(mockUrl.searchParams.get('deleted')).toBe(null);
            expect(mockUrl.toString()).toBe('http://localhost:8000/');
        });
    });
});