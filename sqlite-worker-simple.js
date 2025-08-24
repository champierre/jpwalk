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
        db.run(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                completed BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Save to IndexedDB
        await saveToIndexedDB(db.export());
        
        const countResult = db.exec('SELECT COUNT(*) as count FROM tasks');
        const count = countResult[0]?.values[0][0] || 0;
        
        postMessage({ type: 'initialized', useOPFS: false, usePersistence: true });
        postMessage({ type: 'dbReady', taskCount: count });
        
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
                    if (data.bind) {
                        const stmt = db.prepare(data.sql);
                        stmt.run(data.bind);
                        stmt.free();
                    } else {
                        db.run(data.sql);
                    }
                    
                    // Save to IndexedDB after modification
                    await saveToIndexedDB(db.export());
                    
                    postMessage({ type: 'execResult', id: data.id, result: 'OK' });
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