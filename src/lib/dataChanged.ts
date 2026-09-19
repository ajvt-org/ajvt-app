const CHANNEL = "ajvt-data-changed";

const listeners = new Set<() => void>();

let channel: BroadcastChannel | null = null;

function broadcast(): BroadcastChannel | null {
  if (channel) return channel;
  if (typeof BroadcastChannel === "undefined") return null;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = () => tell();
  return channel;
}

function tell() {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (err) {
      console.error(err);
    }
  }
}

export function announceChange() {
  tell();
  broadcast()?.postMessage(1);
}

export function onDataChange(listener: () => void): () => void {
  listeners.add(listener);
  broadcast();
  return () => {
    listeners.delete(listener);
  };
}

export function forgetDataListeners() {
  listeners.clear();
  channel?.close();
  channel = null;
}
