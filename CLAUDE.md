# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a SQLite + IndexedDB sample application that runs on GitHub Pages. It demonstrates persistent data storage in the browser using sql.js and IndexedDB for a task management application.

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
- Test task CRUD operations
- Verify data persistence across browser sessions
- Test SQL query execution

## Project Structure

```
jpwalk/
├── index.html              # Main HTML file with UI
├── app.js                  # Main application logic and UI handlers
├── sqlite-worker-simple.js # Web Worker for SQL.js operations
├── styles.css              # Application styling
├── README.md               # Project documentation
└── CLAUDE.md               # This file
```

## Architecture

- **Main Thread**: Handles UI interactions and DOM manipulation
- **Web Worker**: Runs sql.js for SQLite operations (avoids blocking UI)
- **IndexedDB**: Provides persistent storage for the SQLite database
- **Message Passing**: Communication between main thread and worker

## Key Implementation Details

### Database Operations
- All SQL operations are performed in the Web Worker
- Database is automatically saved to IndexedDB after modifications
- Uses prepared statements for parameterized queries

### Error Handling
- Worker initialization failures fall back to LocalStorage
- Database operation errors are properly caught and displayed
- User-friendly error messages for common issues

### Data Persistence
- Database is saved to IndexedDB after every modification
- Automatic loading of existing database on startup
- Export/import functionality via JSON

## Common Tasks

### Adding New Database Operations
1. Add method to `sqlite-worker-simple.js`
2. Add corresponding function in `app.js`
3. Update UI handlers as needed

### Debugging
- Check browser console for Worker messages
- Use browser DevTools to inspect IndexedDB
- Test with Network tab disabled to verify offline functionality