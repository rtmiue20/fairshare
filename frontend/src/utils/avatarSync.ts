/**
 * Đồng bộ ảnh đại diện theo thời gian thực giữa trang Profile và các trang khác
 * (cùng tab: CustomEvent; khác tab: BroadcastChannel + storage event).
 */
export interface AvatarUpdate {
  userId: number;
  avatarUrl: string | null;
}

const EVENT_NAME = 'fairshare-avatar-updated';
const CHANNEL_NAME = 'fairshare-avatar';
const STORAGE_KEY = 'fairshare_avatar_updated';

/** /uploads/... đi qua proxy; nếu API là URL tuyệt đối thì ghép origin tương ứng. */
export function resolveAvatarUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (base && /^https?:\/\//i.test(base)) {
    try {
      return new URL(base).origin + (url.startsWith('/') ? url : `/${url}`);
    } catch {
      return url;
    }
  }
  return url;
}

export function broadcastAvatarUpdate(update: AvatarUpdate): void {
  window.dispatchEvent(new CustomEvent<AvatarUpdate>(EVENT_NAME, { detail: update }));
  try {
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.postMessage(update);
    ch.close();
  } catch {
    /* BroadcastChannel không khả dụng */
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...update, t: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function subscribeAvatarUpdates(cb: (u: AvatarUpdate) => void): () => void {
  const onCustom = (e: Event) => cb((e as CustomEvent<AvatarUpdate>).detail);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      cb(JSON.parse(e.newValue) as AvatarUpdate);
    } catch {
      /* ignore */
    }
  };
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (e: MessageEvent<AvatarUpdate>) => cb(e.data);
  } catch {
    channel = null;
  }
  window.addEventListener(EVENT_NAME, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, onCustom);
    window.removeEventListener('storage', onStorage);
    channel?.close();
  };
}
