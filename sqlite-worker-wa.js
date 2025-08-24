// Worker using wa-sqlite instead of official SQLite WASM
importScripts('https://cdn.jsdelivr.net/npm/wa-sqlite@0.9.9/dist/wa-sqlite-async.js');

let sqlite3;
let db;

const initializeSQLite = async () => {
    try {
        // Load wa-sqlite module
        const waModule = await WaSqliteAsync({
            wasmUrl: 'https://cdn.jsdelivr.net/npm/wa-sqlite@0.9.9/dist/wa-sqlite-async.wasm'
        });
        
        sqlite3 = waModule.sqlite3;
        
        // Check if OPFS is available
        if (typeof navigator !== 'undefined' && 'storage' in navigator && 'getDirectory' in navigator.storage) {
            try {
                // Try to use OPFS VFS
                const { OPFSCoopSyncVFS } = await import('https://cdn.jsdelivr.net/npm/wa-sqlite@0.9.9/src/examples/OPFSCoopSyncVFS.js');
                const vfs = new OPFSCoopSyncVFS('opfs');
                sqlite3.vfs_register(vfs, true);
                
                db = await sqlite3.open_v2('mydb.sqlite3', sqlite3.SQLITE_OPEN_READWRITE | sqlite3.SQLITE_OPEN_CREATE, 'opfs');
                postMessage({ type: 'initialized', useOPFS: true });
            } catch (opfsError) {
                // Fallback to memory database
                db = await sqlite3.open_v2(':memory:');
                postMessage({ type: 'initialized', useOPFS: false });
            }
        } else {
            // Fallback to memory database
            db = await sqlite3.open_v2(':memory:');
            postMessage({ type: 'initialized', useOPFS: false });
        }
        
        // Initialize database schema
        await sqlite3.exec(db, `
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                completed BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        const countResult = await sqlite3.exec(db, 'SELECT COUNT(*) as count FROM tasks');
        const count = countResult[0]?.count || 0;
        postMessage({ type: 'dbReady', taskCount: count });
        
    } catch (error) {
        postMessage({ type: 'initError', error: error.message });
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
                    await sqlite3.exec(db, data.sql, { bind: data.bind });
                    postMessage({ type: 'execResult', id: data.id, result: 'OK' });
                } catch (error) {
                    postMessage({ type: 'execError', id: data.id, error: error.message });
                }
                break;
                
            case 'selectObjects':
                try {
                    const result = await sqlite3.exec(db, data.sql, { bind: data.bind, returnValue: 'resultRows' });
                    postMessage({ type: 'selectResult', id: data.id, result });
                } catch (error) {
                    postMessage({ type: 'selectError', id: data.id, error: error.message });
                }
                break;
                
            case 'selectValue':
                try {
                    const result = await sqlite3.exec(db, data.sql, { bind: data.bind, returnValue: 'resultRows' });
                    const value = result[0] ? Object.values(result[0])[0] : null;
                    postMessage({ type: 'selectValueResult', id: data.id, result: value });
                } catch (error) {
                    postMessage({ type: 'selectValueError', id: data.id, error: error.message });
                }
                break;
                
            case 'selectObject':
                try {
                    const result = await sqlite3.exec(db, data.sql, { bind: data.bind, returnValue: 'resultRows' });
                    postMessage({ type: 'selectObjectResult', id: data.id, result: result[0] || null });
                } catch (error) {
                    postMessage({ type: 'selectObjectError', id: data.id, error: error.message });
                }
                break;
        }
    } catch (error) {
        postMessage({ type: 'error', data: error.message });
    }
};