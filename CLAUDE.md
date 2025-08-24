# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Interval Walking (インターバル速歩) web application that runs on GitHub Pages. It demonstrates persistent data storage in the browser using sql.js and IndexedDB for tracking walking sessions. The app implements a 30-minute structured walking program with alternating fast and slow walking phases.

## Development Setup

### Local Development
```bash
# Start a local server (required for CORS)
python -m http.server 8000
# or
npx http-server
```

### Testing
- Open `http://localhost:8000` in a browser
- Test walking session start/pause/stop functionality
- Verify interval timer with 3-minute phase alternation
- Test data persistence across browser sessions
- Verify weekly progress statistics

## Project Structure

```
jpwalk/
├── index.html              # Main HTML file with Tailwind CSS UI
├── js/                     # JavaScript modules (MVC architecture)
│   ├── app.js             # Application entry point
│   ├── controller.js      # Controller layer - business logic
│   ├── model.js           # Model layer - data management
│   └── view.js            # View layer - DOM manipulation
├── tests/                  # Jest test files
│   ├── setup.js           # Test environment configuration
│   └── *.test.js          # Test files for each module
├── sqlite-worker.js        # Web Worker for SQL.js operations
├── styles.css              # Legacy CSS (replaced by Tailwind)
├── package.json            # Node.js dependencies and scripts
├── README.md               # Project documentation
└── CLAUDE.md               # This file
```

## Architecture

- **Main Thread**: Handles UI interactions and DOM manipulation
- **Web Worker**: Runs sql.js for SQLite operations (avoids blocking UI)
- **IndexedDB**: Provides persistent storage for the SQLite database
- **Message Passing**: Communication between main thread and worker

## Key Implementation Details

### Walking Session Management
- 30-minute structured workout with 5 intervals
- Each interval: 3 minutes fast walking + 3 minutes slow walking
- Timer automatically switches between phases
- Pause/resume functionality with time tracking
- Session data stored persistently

### Database Operations
- All SQL operations are performed in the Web Worker
- Walking sessions table with duration, distance, timestamps
- Database is automatically saved to IndexedDB after modifications
- Uses prepared statements for parameterized queries

### Error Handling
- Worker initialization failures fall back to LocalStorage
- Database operation errors are properly caught and displayed
- User-friendly error messages for common issues

### Data Persistence
- Database is saved to IndexedDB after every modification
- Automatic loading of existing walking sessions on startup
- Weekly progress statistics calculated from stored sessions

## Common Tasks

### Adding New Features
1. Add UI elements to `index.html` using Tailwind CSS classes
2. Update the appropriate MVC layer:
   - **View**: DOM manipulation in `js/view.js`
   - **Controller**: Business logic in `js/controller.js`
   - **Model**: Data operations in `js/model.js`
3. **ALWAYS write tests** for new functionality (see Testing Guidelines below)
4. Update database schema in `sqlite-worker.js` if needed
5. Test both SQLite and LocalStorage fallback modes
6. Run tests: `npm test`

### Debugging
- Check browser console for Worker messages and timer events
- Use browser DevTools to inspect IndexedDB walking_sessions table
- Test walking timer functionality in different browser states
- Verify phase transitions and progress calculations
- Test with Network tab disabled to verify offline functionality
- **Run tests** to verify functionality: `npm test`
- **Run specific test files**: `npm test -- <filename>`

## Testing Guidelines

### Overview
This project uses **Jest** with **JSDOM** for comprehensive testing. All new features MUST include corresponding tests.

### Test Structure
```
tests/
├── setup.js                    # Test environment configuration
├── *.test.js                   # Feature-specific test files
└── [feature-name].test.js      # New test files for new features
```

### Testing Principles

#### 1. **Test Coverage Requirements**
- **Controller Layer**: Test business logic, data flow, and method calls
- **View Layer**: Test DOM manipulation, event handling, and UI rendering
- **Model Layer**: Test data operations, API calls, and persistence logic

#### 2. **Test File Naming Convention**
- Controller tests: `[feature-name].test.js`
- View tests: `view-[feature-name].test.js` 
- Model tests: `model-[feature-name].test.js`
- Integration tests: `[feature-name]-integration.test.js`

#### 3. **Test Categories**

**Unit Tests**: Test individual methods and functions
```javascript
test('should show button when totalCount > 3', async () => {
    // Test implementation
});
```

**Integration Tests**: Test component interactions
```javascript
test('should integrate controller and view correctly', async () => {
    // Test implementation  
});
```

**Edge Cases**: Test boundary conditions
```javascript
test('should handle exactly 3 sessions (boundary case)', async () => {
    // Test implementation
});
```

#### 4. **Mocking Guidelines**

**Mock External Dependencies**:
```javascript
jest.mock('../js/model.js');
jest.mock('../js/view.js');
```

**Mock Database Operations**:
```javascript
mockModel.getAllSessions = jest.fn().mockResolvedValue({
    sessions: mockData,
    totalCount: 5
});
```

**Mock DOM Elements**:
```javascript
document.body.innerHTML = `<div id="sessionList"></div>`;
```

#### 5. **Test Structure Template**

```javascript
describe('FeatureName', () => {
    let component;
    let mockDependencies;

    beforeEach(() => {
        // Setup test environment
        // Create mocks
        // Initialize component
    });

    afterEach(() => {
        // Cleanup
        jest.clearAllMocks();
    });

    describe('Primary Functionality', () => {
        test('should handle normal case', () => {
            // Test implementation
        });

        test('should handle error case', () => {
            // Test implementation
        });
    });

    describe('Edge Cases', () => {
        test('should handle boundary conditions', () => {
            // Test implementation
        });
    });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- show-more-sessions.test.js

# Run tests with coverage
npm test -- --coverage
```

### Test Writing Checklist

When adding a new feature, ensure you test:

- [ ] **Happy Path**: Normal functionality works
- [ ] **Error Cases**: Graceful error handling
- [ ] **Edge Cases**: Boundary conditions (0, 1, exact limits)
- [ ] **Integration**: Component interactions work correctly
- [ ] **Accessibility**: UI elements are properly structured
- [ ] **Data Consistency**: Input/output data integrity

### Example Test Coverage

**Show More Sessions Feature** (Example):
- ✅ Controller logic for showing/hiding button
- ✅ View rendering and DOM manipulation  
- ✅ Model data retrieval and pagination
- ✅ Edge cases (0, 3, 4+ sessions)
- ✅ Error handling for database failures
- ✅ Integration between all layers

### Mandatory Testing Policy

⚠️ **IMPORTANT**: All pull requests must include tests for new functionality. Code without tests will not be merged.

**Before submitting a PR:**
1. Write comprehensive tests covering your changes
2. Ensure all tests pass: `npm test`
3. Verify test coverage includes edge cases
4. Update documentation if testing patterns change