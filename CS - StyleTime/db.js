const DB_NAME = 'closetDB';
const DB_VERSION = 1;
const STORE_NAME = 'clothes';

let db;

function openDB() {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => reject(event.target.error);

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('category', 'category', { unique: false });
                store.createIndex('dateAdded', 'dateAdded', { unique: false });
            }
        };
    });
}

async function addClothingItem(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.add(item);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(request.error);
    });
}

async function getAllClothingItems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(request.error);
    });
}

async function deleteClothingItem(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = (event) => reject(request.error);
    });
}

async function getClothesByCategory(category) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('category');
        const request = index.getAll(category);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(request.error);
    });
}

async function exportDb() {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const allData = [];
    return new Promise((resolve, reject) => {
        const request = store.openCursor();
        request.onsuccess = event => {
            const cursor = event.target.result;
            if (cursor) {
                allData.push(cursor.value);
                cursor.continue();
            } else {
                resolve(allData);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

async function importDb(data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const clearReq = store.clear();

        clearReq.onsuccess = () => {
            let promises = data.map(item => {
                return new Promise((res, rej) => {
                    const req = store.put(item);
                    req.onsuccess = () => res();
                    req.onerror = () => rej(req.error);
                });
            });

            Promise.all(promises).then(() => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            }).catch(err => reject(err));
        };

        clearReq.onerror = () => reject(clearReq.error);
    });
}

export { importDb, exportDb, addClothingItem, getAllClothingItems, deleteClothingItem, openDB, getClothesByCategory };
