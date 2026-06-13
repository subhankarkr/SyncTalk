export const useIndexedDB = () => {
  const initDb = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("SyncTalkDB", 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("history")) {
          db.createObjectStore("history", { keyPath: "id", autoIncrement: true });
        }
      };
      request.onsuccess = (e) => {
        resolve(e.target.result);
      };
      request.onerror = (e) => {
        console.error("IndexedDB opening failed:", e.target.error);
        reject(e.target.error);
      };
    });
  };

  const addHistoryItem = (db, item) => {
    if (!db) return Promise.resolve();
    return new Promise((resolve) => {
      const tx = db.transaction("history", "readwrite");
      const store = tx.objectStore("history");

      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const val = cursor.value;
          if (
            val.type === item.type &&
            (val.content === item.content || val.fileName === item.fileName) &&
            Math.abs(val.timestamp - item.timestamp) < 5000
          ) {
            resolve(); // Duplicate detected
            return;
          }
          cursor.continue();
        } else {
          store.add(item);
          resolve();
        }
      };
    });
  };

  const loadLocalHistory = (db) => {
    if (!db) return Promise.resolve([]);
    return new Promise((resolve) => {
      const tx = db.transaction("history", "readwrite");
      const store = tx.objectStore("history");
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result;
        const now = Date.now();
        const cutoff = now - 24 * 60 * 60 * 1000;

        const validItems = [];
        for (const item of items) {
          if (item.timestamp < cutoff) {
            store.delete(item.id);
          } else {
            validItems.push(item);
          }
        }
        validItems.sort((a, b) => a.timestamp - b.timestamp);
        resolve(validItems);
      };
    });
  };

  const clearHistory = (db) => {
    if (!db) return Promise.resolve();
    return new Promise((resolve) => {
      const tx = db.transaction("history", "readwrite");
      tx.objectStore("history").clear();
      tx.oncomplete = () => {
        resolve();
      };
    });
  };

  return {
    initDb,
    addHistoryItem,
    loadLocalHistory,
    clearHistory
  };
};
