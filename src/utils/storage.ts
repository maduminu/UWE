/**
 * Safe LocalStorage Utilities
 * Prevents unhandled JSON.parse syntax errors from crashing the React application
 */

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed !== null && parsed !== undefined ? (parsed as T) : fallback;
  } catch (error) {
    console.warn('[safeJsonParse] Corrupted localStorage data encountered, reverting to fallback:', error);
    return fallback;
  }
}

export function safeGetStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return safeJsonParse<T>(raw, fallback);
  } catch (error) {
    console.warn(`[safeGetStorage] Failed to read key "${key}":`, error);
    return fallback;
  }
}

export function safeSetStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[safeSetStorage] Failed to write key "${key}":`, error);
  }
}
