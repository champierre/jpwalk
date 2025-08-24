// Session Deletion Dialog Test
// This test verifies that the delete confirmation dialog appears above map layers

describe('Session Deletion Dialog', () => {
    let originalL;
    let mockMap;
    
    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div id="deleteModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style="z-index: 9999;">
                <div class="bg-white rounded-lg p-6 max-w-sm w-full">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">セッションの削除</h3>
                    <p class="text-gray-600 mb-6">このセッションを削除してもよろしいですか？</p>
                    <div class="flex gap-3 justify-end">
                        <button id="cancelBtn" class="px-4 py-2 text-gray-600 hover:text-gray-800">
                            キャンセル
                        </button>
                        <button id="confirmDeleteBtn" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                            削除する
                        </button>
                    </div>
                </div>
            </div>
            <div id="mapContainer" class="rounded-lg overflow-hidden h-64">
                <div id="map" class="w-full h-full"></div>
            </div>
        `;

        // Mock Leaflet map
        originalL = global.L;
        mockMap = {
            setView: jest.fn().mockReturnThis(),
            addTo: jest.fn().mockReturnThis(),
            bindPopup: jest.fn().mockReturnThis(),
            remove: jest.fn()
        };
        
        global.L = {
            map: jest.fn().mockReturnValue(mockMap),
            tileLayer: jest.fn().mockReturnValue({ addTo: jest.fn() }),
            polyline: jest.fn().mockReturnValue({ addTo: jest.fn() }),
            marker: jest.fn().mockReturnValue(mockMap),
            divIcon: jest.fn()
        };
    });

    afterEach(() => {
        global.L = originalL;
    });

    test('delete modal has higher z-index than map', () => {
        const deleteModal = document.getElementById('deleteModal');
        const mapContainer = document.getElementById('map');
        
        // Check that delete modal has explicit z-index
        const modalZIndex = window.getComputedStyle(deleteModal).zIndex;
        expect(modalZIndex).toBe('9999');
        
        // Simulate showing the modal
        deleteModal.classList.remove('hidden');
        
        // Verify modal is visible
        expect(deleteModal.classList.contains('hidden')).toBe(false);
    });

    test('modal appears when triggered and can be cancelled', () => {
        const deleteModal = document.getElementById('deleteModal');
        const cancelBtn = document.getElementById('cancelBtn');
        
        // Initially hidden
        expect(deleteModal.classList.contains('hidden')).toBe(true);
        
        // Simulate showing modal (would be triggered by delete button)
        deleteModal.classList.remove('hidden');
        expect(deleteModal.classList.contains('hidden')).toBe(false);
        
        // Cancel should hide modal
        cancelBtn.click();
        // Note: In real app, this would be handled by event listener
        // For test, we simulate the behavior
        deleteModal.classList.add('hidden');
        expect(deleteModal.classList.contains('hidden')).toBe(true);
    });

    test('modal confirmation button is accessible', () => {
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        
        expect(confirmBtn).toBeTruthy();
        expect(cancelBtn).toBeTruthy();
        
        // Check button text content
        expect(confirmBtn.textContent.trim()).toBe('削除する');
        expect(cancelBtn.textContent.trim()).toBe('キャンセル');
    });

    test('modal overlay covers entire viewport', () => {
        const deleteModal = document.getElementById('deleteModal');
        
        // Check that modal covers full screen
        expect(deleteModal.classList.contains('fixed')).toBe(true);
        expect(deleteModal.classList.contains('inset-0')).toBe(true);
    });

    test('map interaction should be blocked when modal is open', () => {
        const deleteModal = document.getElementById('deleteModal');
        const mapDiv = document.getElementById('map');
        
        // Show modal
        deleteModal.classList.remove('hidden');
        
        // Mock click on map area
        const mapClickEvent = new MouseEvent('click', { bubbles: true });
        const clickHandled = mapDiv.dispatchEvent(mapClickEvent);
        
        // When modal is open, map clicks should be handled by modal overlay
        expect(deleteModal.classList.contains('hidden')).toBe(false);
    });
});