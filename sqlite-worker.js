// Simple SQLite worker using sql.js with IndexedDB persistence
importScripts('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js');

let SQL;
let db;
const DB_NAME = 'jpwalk_db';
const DB_VERSION = 1;

// IndexedDB utilities
const openIndexedDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('database')) {
                db.createObjectStore('database', { keyPath: 'id' });
            }
        };
    });
};

const saveToIndexedDB = async (data) => {
    const idb = await openIndexedDB();
    const transaction = idb.transaction(['database'], 'readwrite');
    const store = transaction.objectStore('database');
    await new Promise((resolve, reject) => {
        const request = store.put({ id: 'main', data });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const loadFromIndexedDB = async () => {
    try {
        const idb = await openIndexedDB();
        const transaction = idb.transaction(['database'], 'readonly');
        const store = transaction.objectStore('database');
        
        return new Promise((resolve) => {
            const request = store.get('main');
            request.onsuccess = () => {
                resolve(request.result?.data || null);
            };
            request.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
};

const initializeSQLite = async () => {
    try {
        postMessage({ type: 'log', data: 'Initializing SQL.js...' });
        
        // Initialize SQL.js
        SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });
        
        // Try to load existing database from IndexedDB
        const savedData = await loadFromIndexedDB();
        
        if (savedData) {
            db = new SQL.Database(new Uint8Array(savedData));
            postMessage({ type: 'log', data: 'Loaded database from IndexedDB' });
        } else {
            db = new SQL.Database();
            postMessage({ type: 'log', data: 'Created new database' });
        }
        
        // Initialize database schema
        // Create walking_sessions table
        try {
            const tableInfo = db.exec("PRAGMA table_info(walking_sessions)");
            if (tableInfo.length > 0) {
                const columns = tableInfo[0].values.map(row => row[1]); // column names are at index 1
                if (!columns.includes('locations')) {
                    // Add locations column to existing table
                    db.run('ALTER TABLE walking_sessions ADD COLUMN locations TEXT');
                    postMessage({ type: 'log', data: 'Added locations column to existing table' });
                }
            } else {
                // Create new table
                db.run(`
                    CREATE TABLE walking_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        duration INTEGER NOT NULL,
                        distance REAL DEFAULT 0,
                        locations TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
            }
        } catch (error) {
            // If there's any error, try to create the table
            db.run(`
                CREATE TABLE IF NOT EXISTS walking_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    duration INTEGER NOT NULL,
                    distance REAL DEFAULT 0,
                    locations TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        }

        // Create walking_locations table
        try {
            db.run(`
                CREATE TABLE IF NOT EXISTS walking_locations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    timestamp INTEGER NOT NULL,
                    phase TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES walking_sessions (id)
                )
            `);
            postMessage({ type: 'log', data: 'Created walking_locations table' });
        } catch (error) {
            postMessage({ type: 'log', data: 'walking_locations table creation error: ' + error.message });
        }
        
        // Save to IndexedDB
        await saveToIndexedDB(db.export());
        
        const countResult = db.exec('SELECT COUNT(*) as count FROM walking_sessions');
        const count = countResult[0]?.values[0][0] || 0;
        
        postMessage({ type: 'initialized' });
        postMessage({ type: 'dbReady', sessionCount: count });
        
    } catch (error) {
        postMessage({ type: 'initError', data: { error: error.message } });
    }
};

self.onmessage = async (event) => {
    const { type, data } = event.data;
    
    try {
        switch (type) {
            case 'init':
                await initializeSQLite();
                break;
                
            case 'exec':
                try {
                    let lastInsertRowId = null;
                    
                    if (data.bind) {
                        const stmt = db.prepare(data.sql);
                        const info = stmt.run(data.bind);
                        // For INSERT statements, get the last inserted row ID
                        if (data.sql.trim().toLowerCase().startsWith('insert')) {
                            const result = db.exec('SELECT last_insert_rowid() as id');
                            lastInsertRowId = result[0]?.values[0]?.[0] || null;
                        }
                        stmt.free();
                    } else {
                        db.run(data.sql);
                        // For INSERT statements, get the last inserted row ID
                        if (data.sql.trim().toLowerCase().startsWith('insert')) {
                            const result = db.exec('SELECT last_insert_rowid() as id');
                            lastInsertRowId = result[0]?.values[0]?.[0] || null;
                        }
                    }
                    
                    // Save to IndexedDB after modification
                    await saveToIndexedDB(db.export());
                    
                    postMessage({ type: 'execResult', id: data.id, result: { lastInsertRowId } });
                } catch (error) {
                    postMessage({ type: 'execError', id: data.id, error: error.message });
                }
                break;
                
            case 'selectObjects':
                try {
                    let result;
                    if (data.bind) {
                        const stmt = db.prepare(data.sql);
                        const rows = [];
                        stmt.bind(data.bind);
                        while (stmt.step()) {
                            const row = stmt.getAsObject();
                            rows.push(row);
                        }
                        stmt.free();
                        result = rows;
                    } else {
                        const queryResult = db.exec(data.sql);
                        if (queryResult.length > 0) {
                            const { columns, values } = queryResult[0];
                            result = values.map(row => {
                                const obj = {};
                                columns.forEach((col, i) => {
                                    obj[col] = row[i];
                                });
                                return obj;
                            });
                        } else {
                            result = [];
                        }
                    }
                    
                    postMessage({ type: 'selectResult', id: data.id, result });
                } catch (error) {
                    postMessage({ type: 'selectError', id: data.id, error: error.message });
                }
                break;
                
            case 'selectValue':
                try {
                    let result;
                    if (data.bind) {
                        const stmt = db.prepare(data.sql);
                        stmt.bind(data.bind);
                        if (stmt.step()) {
                            const row = stmt.get();
                            result = row[0];
                        } else {
                            result = null;
                        }
                        stmt.free();
                    } else {
                        const queryResult = db.exec(data.sql);
                        result = queryResult[0]?.values[0]?.[0] || null;
                    }
                    
                    postMessage({ type: 'selectValueResult', id: data.id, result });
                } catch (error) {
                    postMessage({ type: 'selectValueError', id: data.id, error: error.message });
                }
                break;
                
            case 'selectObject':
                try {
                    let result;
                    if (data.bind) {
                        const stmt = db.prepare(data.sql);
                        stmt.bind(data.bind);
                        if (stmt.step()) {
                            result = stmt.getAsObject();
                        } else {
                            result = null;
                        }
                        stmt.free();
                    } else {
                        const queryResult = db.exec(data.sql);
                        if (queryResult.length > 0 && queryResult[0].values.length > 0) {
                            const { columns, values } = queryResult[0];
                            const row = values[0];
                            result = {};
                            columns.forEach((col, i) => {
                                result[col] = row[i];
                            });
                        } else {
                            result = null;
                        }
                    }
                    
                    postMessage({ type: 'selectObjectResult', id: data.id, result });
                } catch (error) {
                    postMessage({ type: 'selectObjectError', id: data.id, error: error.message });
                }
                break;
        }
    } catch (error) {
        postMessage({ type: 'error', data: error.message });
    }
};