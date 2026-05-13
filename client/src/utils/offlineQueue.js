// Lightweight offline queue for SOS requests.
// NOTE: This is a simple localStorage-backed queue intended as a scaffold.
// For production, replace with IndexedDB (idb/localForage) and secure storage.

const QUEUE_KEY = 'lc_hc_offline_sos_queue_v1';

const readQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('offlineQueue: read error', e);
    return [];
  }
};

const writeQueue = (q) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch (e) {
    console.warn('offlineQueue: write error', e);
  }
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;

export const enqueueSOS = (payload) => {
  const q = readQueue();
  const item = {
    id: payload.id || makeId(),
    payload,
    attempts: 0,
    nextAttemptAt: Date.now()
  };
  q.push(item);
  writeQueue(q);
  return item.id;
};

export const removeItem = (id) => {
  const q = readQueue().filter(i => i.id !== id);
  writeQueue(q);
};

export const getQueue = () => readQueue();

// processFn should accept (item) and return a Promise that resolves on success
export const processQueue = async (processFn, options = {}) => {
  const q = readQueue();
  if (!q || q.length === 0) return;

  const now = Date.now();
  for (const item of q.slice()) {
    if ((item.nextAttemptAt || 0) > now) continue;
    try {
      await processFn(item.payload);
      // success -> remove
      removeItem(item.id);
    } catch (err) {
      // failure -> backoff
      item.attempts = (item.attempts || 0) + 1;
      const backoff = Math.min((options.backoffBase || 2000) * 2 ** (item.attempts - 1), (options.maxBackoff || 60000));
      item.nextAttemptAt = Date.now() + backoff;
      // update the queue
      const updated = readQueue().map(i => i.id === item.id ? item : i);
      writeQueue(updated);
    }
  }
};

let processorInterval = null;
let onlineListenerAdded = false;

export const startQueueProcessor = (processFn, opts = {}) => {
  // Run once immediately
  processQueue(processFn, opts).catch(() => {});

  // Periodic processor
  if (processorInterval) clearInterval(processorInterval);
  processorInterval = setInterval(() => {
    processQueue(processFn, opts).catch(() => {});
  }, opts.pollInterval || 30000);

  // Also process on online event
  if (!onlineListenerAdded) {
    window.addEventListener('online', () => {
      processQueue(processFn, opts).catch(() => {});
    });
    onlineListenerAdded = true;
  }
};

export const stopQueueProcessor = () => {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
  }
};

export default {
  enqueueSOS,
  removeItem,
  getQueue,
  processQueue,
  startQueueProcessor,
  stopQueueProcessor
};
