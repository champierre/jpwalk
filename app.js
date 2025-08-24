let worker;
let requestId = 0;
const pendingRequests = new Map();

const log = (msg, isError = false) => {
    const status = document.getElementById('status');
    status.textContent = msg;
    status.className = isError ? 'status error' : 'status success';
    console.log(msg);
};

const initSQLite = async () => {
    try {
        log('SQLite WASMを初期化中...');
        
        if (!window.crossOriginIsolated) {
            log('⚠️ Cross-Origin Isolationが有効ではありません。ページをリロードしてください。');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            return;
        }
        
        worker = new Worker('sqlite-worker.js');
        
        worker.onmessage = (event) => {
            const { type, data, id } = event.data;
            
            switch (type) {
                case 'log':
                    console.log(data);
                    break;
                case 'error':
                    console.error(data);
                    break;
                case 'initialized':
                    if (data.useOPFS) {
                        log('✅ SQLite WASM + OPFS の初期化完了');
                    } else {
                        log('⚠️ OPFSが利用できません。メモリデータベースを使用します。');
                    }
                    break;
                case 'dbReady':
                    log(`データベース準備完了。${data.taskCount}件のタスクが保存されています。`);
                    loadTasks();
                    break;
                case 'initError':
                    console.error('Worker initialization error:', data ? data.error : 'Unknown error');
                    log('❌ SQLiteの初期化に失敗しました。ローカルストレージを使用します。', true);
                    initLocalStorageFallback();
                    break;
                case 'execResult':
                case 'selectResult':
                case 'selectValueResult':
                case 'selectObjectResult':
                    if (pendingRequests.has(id)) {
                        pendingRequests.get(id).resolve(event.data.result);
                        pendingRequests.delete(id);
                    }
                    break;
                case 'execError':
                case 'selectError':
                case 'selectValueError':
                case 'selectObjectError':
                    if (pendingRequests.has(id)) {
                        pendingRequests.get(id).reject(new Error(event.data.error));
                        pendingRequests.delete(id);
                    }
                    break;
            }
        };
        
        worker.postMessage({ type: 'init' });
        
    } catch (error) {
        console.error('エラー:', error);
        log('❌ SQLiteの初期化に失敗しました。ローカルストレージを使用します。', true);
        initLocalStorageFallback();
    }
};

const execSQL = (sql, bind = []) => {
    return new Promise((resolve, reject) => {
        const id = requestId++;
        pendingRequests.set(id, { resolve, reject });
        worker.postMessage({ type: 'exec', data: { id, sql, bind } });
    });
};

const selectObjects = (sql, bind = []) => {
    return new Promise((resolve, reject) => {
        const id = requestId++;
        pendingRequests.set(id, { resolve, reject });
        worker.postMessage({ type: 'selectObjects', data: { id, sql, bind } });
    });
};

const selectValue = (sql, bind = []) => {
    return new Promise((resolve, reject) => {
        const id = requestId++;
        pendingRequests.set(id, { resolve, reject });
        worker.postMessage({ type: 'selectValue', data: { id, sql, bind } });
    });
};

const selectObject = (sql, bind = []) => {
    return new Promise((resolve, reject) => {
        const id = requestId++;
        pendingRequests.set(id, { resolve, reject });
        worker.postMessage({ type: 'selectObject', data: { id, sql, bind } });
    });
};

const loadTasks = async () => {
    if (!worker) {
        loadTasksFromLocalStorage();
        return;
    }
    
    try {
        const tasks = await selectObjects('SELECT * FROM tasks ORDER BY created_at DESC');
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

const addTask = async () => {
    const input = document.getElementById('taskInput');
    const title = input.value.trim();
    
    if (!title) return;
    
    if (!worker) {
        addTaskToLocalStorage(title);
        input.value = '';
        return;
    }
    
    try {
        await execSQL('INSERT INTO tasks (title) VALUES (?)', [title]);
        const newTask = await selectObject('SELECT * FROM tasks WHERE id = last_insert_rowid()');
        addTaskToDOM(newTask);
        input.value = '';
        log('タスクを追加しました');
    } catch (error) {
        console.error('Error adding task:', error);
        log('タスクの追加に失敗しました', true);
    }
};

const toggleTask = async (id, completed) => {
    if (!worker) {
        toggleTaskInLocalStorage(id, completed);
        return;
    }
    
    try {
        await execSQL('UPDATE tasks SET completed = ? WHERE id = ?', [completed ? 1 : 0, id]);
        const taskItem = document.querySelector(`.task-item[data-id="${id}"] span`);
        taskItem.classList.toggle('completed', completed);
    } catch (error) {
        console.error('Error toggling task:', error);
    }
};

const deleteTask = async (id) => {
    if (!worker) {
        deleteTaskFromLocalStorage(id);
        return;
    }
    
    try {
        await execSQL('DELETE FROM tasks WHERE id = ?', [id]);
        const taskItem = document.querySelector(`.task-item[data-id="${id}"]`);
        taskItem.remove();
        log('タスクを削除しました');
    } catch (error) {
        console.error('Error deleting task:', error);
        log('タスクの削除に失敗しました', true);
    }
};

const exportData = async () => {
    if (!worker) {
        exportLocalStorageData();
        return;
    }
    
    try {
        const tasks = await selectObjects('SELECT * FROM tasks');
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

const clearData = async () => {
    if (!confirm('すべてのデータを削除しますか？')) return;
    
    if (!worker) {
        localStorage.removeItem('tasks');
        loadTasksFromLocalStorage();
        log('すべてのデータを削除しました');
        return;
    }
    
    try {
        await execSQL('DELETE FROM tasks');
        loadTasks();
        log('すべてのデータを削除しました');
    } catch (error) {
        console.error('Error clearing data:', error);
        log('データの削除に失敗しました', true);
    }
};

const showStats = async () => {
    if (!worker) {
        showLocalStorageStats();
        return;
    }
    
    try {
        const stats = {
            total: await selectValue('SELECT COUNT(*) FROM tasks'),
            completed: await selectValue('SELECT COUNT(*) FROM tasks WHERE completed = 1'),
            pending: await selectValue('SELECT COUNT(*) FROM tasks WHERE completed = 0')
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

const executeSQL = async () => {
    if (!worker) {
        log('SQLiteが初期化されていません', true);
        return;
    }
    
    const sqlInput = document.getElementById('sqlInput');
    const sql = sqlInput.value.trim();
    
    if (!sql) return;
    
    try {
        const isSelect = sql.toLowerCase().startsWith('select');
        const result = isSelect ? await selectObjects(sql) : await execSQL(sql);
        
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