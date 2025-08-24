let sqlite3;
let db;

const log = (msg, isError = false) => {
    const status = document.getElementById('status');
    status.textContent = msg;
    status.className = isError ? 'status error' : 'status success';
    console.log(msg);
};

const initSQLite = async () => {
    try {
        log('SQLite WASMを読み込み中...');
        
        const sqliteWorker = await new Promise((resolve, reject) => {
            const worker = new Worker('https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.45.1-build1/sqlite-wasm/jswasm/sqlite3-worker1-promiser.js');
            
            worker.onmessage = (event) => {
                if (event.data && event.data.type === 'sqlite3-api') {
                    if (event.data.result) {
                        resolve(worker);
                    } else if (event.data.error) {
                        reject(new Error(event.data.error));
                    }
                }
            };
            
            worker.postMessage({
                type: 'open',
                args: {
                    filename: 'file:mydb.sqlite3?vfs=opfs',
                    vfs: 'opfs'
                }
            });
        });
        
        const sqlite3Module = await import('https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.45.1-build1/sqlite-wasm/jswasm/sqlite3.mjs');
        sqlite3 = await sqlite3Module.default();
        
        if ('opfs' in sqlite3) {
            log('OPFS VFSを使用して初期化中...');
            db = new sqlite3.oo1.OpfsDb('mydb.sqlite3');
            log('✅ SQLite WASM + OPFS の初期化完了');
        } else {
            log('OPFSが利用できません。メモリデータベースを使用します。');
            db = new sqlite3.oo1.DB();
        }
        
        initDatabase();
        loadTasks();
        
    } catch (error) {
        console.error('詳細なエラー:', error);
        
        try {
            log('代替方法でSQLite WASMを初期化中...');
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.45.1-build1/sqlite-wasm/jswasm/sqlite3.js';
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
            
            if (typeof sqlite3InitModule !== 'undefined') {
                sqlite3 = await sqlite3InitModule({
                    print: console.log,
                    printErr: console.error
                });
                
                if (sqlite3.capi.sqlite3_vfs_find('opfs')) {
                    db = new sqlite3.oo1.OpfsDb('mydb.sqlite3');
                    log('✅ SQLite WASM + OPFS の初期化完了（代替方法）');
                } else {
                    db = new sqlite3.oo1.DB();
                    log('⚠️ OPFSが利用できません。メモリデータベースを使用します。');
                }
                
                initDatabase();
                loadTasks();
            }
        } catch (fallbackError) {
            log('❌ SQLiteの初期化に失敗しました。ローカルストレージを使用します。', true);
            console.error('Fallback error:', fallbackError);
            initLocalStorageFallback();
        }
    }
};

const initDatabase = () => {
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                completed BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        const count = db.selectValue('SELECT COUNT(*) FROM tasks');
        log(`データベース準備完了。${count}件のタスクが保存されています。`);
    } catch (error) {
        console.error('Database initialization error:', error);
        log('データベースの初期化に失敗しました', true);
    }
};

const loadTasks = () => {
    if (!db) {
        loadTasksFromLocalStorage();
        return;
    }
    
    try {
        const tasks = db.selectObjects('SELECT * FROM tasks ORDER BY created_at DESC');
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '';
        
        tasks.forEach(task => {
            addTaskToDOM(task);
        });
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
};

const addTaskToDOM = (task) => {
    const taskList = document.getElementById('taskList');
    const taskItem = document.createElement('div');
    taskItem.className = 'task-item';
    taskItem.dataset.id = task.id;
    
    taskItem.innerHTML = `
        <input type="checkbox" ${task.completed ? 'checked' : ''}>
        <span class="${task.completed ? 'completed' : ''}">${task.title}</span>
        <button class="delete-btn" data-id="${task.id}">削除</button>
    `;
    
    const checkbox = taskItem.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => toggleTask(task.id, checkbox.checked));
    
    const deleteBtn = taskItem.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    
    taskList.appendChild(taskItem);
};

const addTask = () => {
    const input = document.getElementById('taskInput');
    const title = input.value.trim();
    
    if (!title) return;
    
    if (!db) {
        addTaskToLocalStorage(title);
        input.value = '';
        return;
    }
    
    try {
        db.exec({
            sql: 'INSERT INTO tasks (title) VALUES (?)',
            bind: [title]
        });
        
        const newTask = db.selectObject('SELECT * FROM tasks WHERE id = last_insert_rowid()');
        addTaskToDOM(newTask);
        input.value = '';
        log('タスクを追加しました');
    } catch (error) {
        console.error('Error adding task:', error);
        log('タスクの追加に失敗しました', true);
    }
};

const toggleTask = (id, completed) => {
    if (!db) {
        toggleTaskInLocalStorage(id, completed);
        return;
    }
    
    try {
        db.exec({
            sql: 'UPDATE tasks SET completed = ? WHERE id = ?',
            bind: [completed ? 1 : 0, id]
        });
        
        const taskItem = document.querySelector(`.task-item[data-id="${id}"] span`);
        taskItem.classList.toggle('completed', completed);
    } catch (error) {
        console.error('Error toggling task:', error);
    }
};

const deleteTask = (id) => {
    if (!db) {
        deleteTaskFromLocalStorage(id);
        return;
    }
    
    try {
        db.exec({
            sql: 'DELETE FROM tasks WHERE id = ?',
            bind: [id]
        });
        
        const taskItem = document.querySelector(`.task-item[data-id="${id}"]`);
        taskItem.remove();
        log('タスクを削除しました');
    } catch (error) {
        console.error('Error deleting task:', error);
        log('タスクの削除に失敗しました', true);
    }
};

const exportData = () => {
    if (!db) {
        exportLocalStorageData();
        return;
    }
    
    try {
        const tasks = db.selectObjects('SELECT * FROM tasks');
        const data = JSON.stringify(tasks, null, 2);
        const output = document.getElementById('output');
        output.textContent = data;
        
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tasks.json';
        a.click();
        URL.revokeObjectURL(url);
        
        log('データをエクスポートしました');
    } catch (error) {
        console.error('Error exporting data:', error);
        log('エクスポートに失敗しました', true);
    }
};

const clearData = () => {
    if (!confirm('すべてのデータを削除しますか？')) return;
    
    if (!db) {
        localStorage.removeItem('tasks');
        loadTasksFromLocalStorage();
        log('すべてのデータを削除しました');
        return;
    }
    
    try {
        db.exec('DELETE FROM tasks');
        loadTasks();
        log('すべてのデータを削除しました');
    } catch (error) {
        console.error('Error clearing data:', error);
        log('データの削除に失敗しました', true);
    }
};

const showStats = () => {
    if (!db) {
        showLocalStorageStats();
        return;
    }
    
    try {
        const stats = {
            total: db.selectValue('SELECT COUNT(*) FROM tasks'),
            completed: db.selectValue('SELECT COUNT(*) FROM tasks WHERE completed = 1'),
            pending: db.selectValue('SELECT COUNT(*) FROM tasks WHERE completed = 0')
        };
        
        const output = document.getElementById('output');
        output.textContent = `統計情報:
総タスク数: ${stats.total}
完了: ${stats.completed}
未完了: ${stats.pending}
完了率: ${stats.total > 0 ? Math.round(stats.completed / stats.total * 100) : 0}%`;
        
        log('統計情報を表示しました');
    } catch (error) {
        console.error('Error showing stats:', error);
        log('統計情報の取得に失敗しました', true);
    }
};

const executeSQL = () => {
    if (!db) {
        log('SQLiteが初期化されていません', true);
        return;
    }
    
    const sqlInput = document.getElementById('sqlInput');
    const sql = sqlInput.value.trim();
    
    if (!sql) return;
    
    try {
        const isSelect = sql.toLowerCase().startsWith('select');
        const result = isSelect ? db.selectObjects(sql) : db.exec(sql);
        
        const queryResult = document.getElementById('queryResult');
        if (isSelect) {
            queryResult.textContent = JSON.stringify(result, null, 2);
        } else {
            queryResult.textContent = 'クエリが実行されました';
            loadTasks();
        }
        
        log('SQLクエリを実行しました');
    } catch (error) {
        document.getElementById('queryResult').textContent = `エラー: ${error.message}`;
        log('SQLクエリの実行に失敗しました', true);
    }
};

let localStorageTaskId = 1;

const initLocalStorageFallback = () => {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    if (tasks.length > 0) {
        localStorageTaskId = Math.max(...tasks.map(t => t.id)) + 1;
    }
    loadTasksFromLocalStorage();
    log('⚠️ ローカルストレージモードで動作中（データは永続化されません）');
};

const loadTasksFromLocalStorage = () => {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = '';
    tasks.forEach(task => addTaskToDOM(task));
};

const addTaskToLocalStorage = (title) => {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const newTask = {
        id: localStorageTaskId++,
        title,
        completed: false,
        created_at: new Date().toISOString()
    };
    tasks.unshift(newTask);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    addTaskToDOM(newTask);
    log('タスクを追加しました（ローカルストレージ）');
};

const toggleTaskInLocalStorage = (id, completed) => {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const task = tasks.find(t => t.id === parseInt(id));
    if (task) {
        task.completed = completed;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        const taskItem = document.querySelector(`.task-item[data-id="${id}"] span`);
        taskItem.classList.toggle('completed', completed);
    }
};

const deleteTaskFromLocalStorage = (id) => {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const filtered = tasks.filter(t => t.id !== parseInt(id));
    localStorage.setItem('tasks', JSON.stringify(filtered));
    const taskItem = document.querySelector(`.task-item[data-id="${id}"]`);
    taskItem.remove();
    log('タスクを削除しました（ローカルストレージ）');
};

const exportLocalStorageData = () => {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const data = JSON.stringify(tasks, null, 2);
    const output = document.getElementById('output');
    output.textContent = data;
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.json';
    a.click();
    URL.revokeObjectURL(url);
    
    log('データをエクスポートしました（ローカルストレージ）');
};

const showLocalStorageStats = () => {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.completed).length,
        pending: tasks.filter(t => !t.completed).length
    };
    
    const output = document.getElementById('output');
    output.textContent = `統計情報（ローカルストレージ）:
総タスク数: ${stats.total}
完了: ${stats.completed}
未完了: ${stats.pending}
完了率: ${stats.total > 0 ? Math.round(stats.completed / stats.total * 100) : 0}%`;
    
    log('統計情報を表示しました（ローカルストレージ）');
};

document.addEventListener('DOMContentLoaded', () => {
    initSQLite();
    
    document.getElementById('addBtn').addEventListener('click', addTask);
    document.getElementById('taskInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
    
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('clearBtn').addEventListener('click', clearData);
    document.getElementById('statsBtn').addEventListener('click', showStats);
    document.getElementById('executeBtn').addEventListener('click', executeSQL);
});