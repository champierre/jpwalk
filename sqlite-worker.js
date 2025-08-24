// Use CDN version instead of local files to avoid path issues
importScripts('https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.45.1-build1/sqlite-wasm/jswasm/sqlite3.js');

let sqlite3;
let db;

const initializeSQLite = async () => {
    try {
        sqlite3 = await sqlite3InitModule({
            print: (...args) => postMessage({ type: 'log', data: args.join(' ') }),
            printErr: (...args) => postMessage({ type: 'error', data: args.join(' ') })
        });
        
        if (sqlite3.capi.sqlite3_vfs_find('opfs')) {
            // Use absolute path for OPFS (required by the VFS)
            db = new sqlite3.oo1.OpfsDb('/mydb.sqlite3');
            postMessage({ type: 'initialized', useOPFS: true });
        } else {
            db = new sqlite3.oo1.DB();
            postMessage({ type: 'initialized', useOPFS: false });
        }
        
        // Initialize database schema
        db.exec(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                completed BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        const count = db.selectValue('SELECT COUNT(*) FROM tasks');
        postMessage({ type: 'dbReady', taskCount: count });
        
    } catch (error) {
        postMessage({ type: 'initError', error: error.message });
    }
};

self.onmessage = async (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'init':
            await initializeSQLite();
            break;
            
        case 'exec':
            try {
                const result = db.exec(data.sql, data.bind || []);
                postMessage({ type: 'execResult', id: data.id, result });
            } catch (error) {
                postMessage({ type: 'execError', id: data.id, error: error.message });
            }
            break;
            
        case 'selectObjects':
            try {
                const result = db.selectObjects(data.sql, data.bind || []);
                postMessage({ type: 'selectResult', id: data.id, result });
            } catch (error) {
                postMessage({ type: 'selectError', id: data.id, error: error.message });
            }
            break;
            
        case 'selectValue':
            try {
                const result = db.selectValue(data.sql, data.bind || []);
                postMessage({ type: 'selectValueResult', id: data.id, result });
            } catch (error) {
                postMessage({ type: 'selectValueError', id: data.id, error: error.message });
            }
            break;
            
        case 'selectObject':
            try {
                const result = db.selectObject(data.sql, data.bind || []);
                postMessage({ type: 'selectObjectResult', id: data.id, result });
            } catch (error) {
                postMessage({ type: 'selectObjectError', id: data.id, error: error.message });
            }
            break;
    }
};