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
├── app.js                  # Walking session tracking and timer logic
├── sqlite-worker.js        # Web Worker for SQL.js operations
├── styles.css              # Legacy CSS (replaced by Tailwind)
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
2. Add corresponding event handlers in `app.js`
3. Update database schema in `sqlite-worker.js` if needed
4. Test both SQLite and LocalStorage fallback modes

### Debugging
- Check browser console for Worker messages and timer events
- Use browser DevTools to inspect IndexedDB walking_sessions table
- Test walking timer functionality in different browser states
- Verify phase transitions and progress calculations
- Test with Network tab disabled to verify offline functionality