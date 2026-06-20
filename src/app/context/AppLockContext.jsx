import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPinCredential, verifyPinCredential } from "../security/pinCrypto";

// ─────────────────────────────────────────────────────────────────────────────
// App Lock — khóa ứng dụng bằng PIN (client-only, không đụng backend).
//
// - hasPin       : đã thiết lập PIN chưa
// - isLocked     : đang bị khóa (cần nhập PIN để vào)
// - aesKey       : khóa AES-GCM giữ trong RAM sau khi mở khóa (dùng cho offline)
// - autoLockMins : số phút không hoạt động thì tự khóa (0 = chỉ khóa khi ẩn tab)
//
// Tự khóa khi: tab bị ẩn (visibilitychange) hoặc quá thời gian không hoạt động.
// Mặc định khi tải lại trang mà đã có PIN → ở trạng thái khóa.
// ─────────────────────────────────────────────────────────────────────────────

const CRED_KEY = "app_pin_cred";
const TIMEOUT_KEY = "app_lock_timeout"; // phút
const DEFAULT_TIMEOUT_MINS = 5;

const AppLockContext = createContext(null);

const readCred = () => {
  try {
    const raw = localStorage.getItem(CRED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function AppLockProvider({ children }) {
  const [cred, setCred] = useState(readCred);
  const [isLocked, setIsLocked] = useState(() => !!readCred());
  const [aesKey, setAesKey] = useState(null);
  const [autoLockMins, setAutoLockMins] = useState(() => {
    const v = Number(localStorage.getItem(TIMEOUT_KEY));
    return Number.isFinite(v) && v >= 0 ? v : DEFAULT_TIMEOUT_MINS;
  });

  const hasPin = !!cred;
  const inactivityTimer = useRef(null);

  const lock = useCallback(() => {
    if (!readCred()) return; // không có PIN thì không có gì để khóa
    setAesKey(null);
    setIsLocked(true);
  }, []);

  const unlock = useCallback(async (pin) => {
    const current = readCred();
    if (!current) return { ok: false, reason: "no-pin" };
    const { ok, key } = await verifyPinCredential(pin, current);
    if (!ok) return { ok: false, reason: "wrong-pin" };
    setAesKey(key);
    setIsLocked(false);
    window.dispatchEvent(new Event("applock:unlocked"));
    return { ok: true };
  }, []);

  const setupPin = useCallback(async (pin) => {
    const { cred: newCred, key } = await createPinCredential(pin);
    localStorage.setItem(CRED_KEY, JSON.stringify(newCred));
    setCred(newCred);
    setAesKey(key);
    setIsLocked(false);
    return { ok: true };
  }, []);

  const changePin = useCallback(async (oldPin, newPin) => {
    const current = readCred();
    if (!current) return { ok: false, reason: "no-pin" };
    const { ok } = await verifyPinCredential(oldPin, current);
    if (!ok) return { ok: false, reason: "wrong-pin" };
    return setupPin(newPin);
  }, [setupPin]);

  const disablePin = useCallback(async (pin) => {
    const current = readCred();
    if (!current) return { ok: true };
    const { ok } = await verifyPinCredential(pin, current);
    if (!ok) return { ok: false, reason: "wrong-pin" };
    localStorage.removeItem(CRED_KEY);
    setCred(null);
    setAesKey(null);
    setIsLocked(false);
    return { ok: true };
  }, []);

  const setAutoLockMinutes = useCallback((mins) => {
    const v = Number(mins);
    const safe = Number.isFinite(v) && v >= 0 ? v : DEFAULT_TIMEOUT_MINS;
    setAutoLockMins(safe);
    localStorage.setItem(TIMEOUT_KEY, String(safe));
  }, []);

  // ── Tự khóa khi tab bị ẩn ────────────────────────────────────────────────
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") lock();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [lock]);

  // ── Tự khóa theo thời gian không hoạt động ────────────────────────────────
  useEffect(() => {
    if (!hasPin || isLocked || autoLockMins <= 0) return;

    const reset = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(lock, autoLockMins * 60_000);
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [hasPin, isLocked, autoLockMins, lock]);

  return (
    <AppLockContext.Provider
      value={{
        hasPin,
        isLocked,
        aesKey,
        autoLockMins,
        setupPin,
        unlock,
        lock,
        changePin,
        disablePin,
        setAutoLockMinutes,
      }}
    >
      {children}
    </AppLockContext.Provider>
  );
}

export const useAppLock = () => {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error("useAppLock must be used within AppLockProvider");
  return ctx;
};
