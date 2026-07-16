import { useCallback, useEffect, useState } from 'react';

const KEY = 'galaxypick.saved';

const read = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Lets separate mounts of this hook (product page, cards, chat sidebar) stay in
// sync — a storage event only fires in *other* tabs, so we notify this one too.
const listeners = new Set();
const broadcast = (ids) => listeners.forEach(fn => fn(ids));

export function useSaved() {
  const [ids, setIds] = useState(read);

  useEffect(() => {
    const onChange = (next) => setIds(next);
    listeners.add(onChange);
    const onStorage = (e) => { if (e.key === KEY) setIds(read()); };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const persist = useCallback((next) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode / quota — keep the in-memory state working anyway */
    }
    broadcast(next);
  }, []);

  const toggle = useCallback((id) => {
    const next = read().includes(id) ? read().filter(x => x !== id) : [...read(), id];
    persist(next);
    return next.includes(id);
  }, [persist]);

  const isSaved = useCallback((id) => ids.includes(id), [ids]);

  return { saved: ids, toggle, isSaved };
}
