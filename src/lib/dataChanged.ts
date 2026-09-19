const CHANNEL = "ajvt-data-changed";

type Listener = (fromAnotherTab: boolean) => void;

const listeners = new Set<Listener>();

let channel: BroadcastChannel | null = null;

function broadcast(): BroadcastChannel | null {
  if (channel) return channel;
  if (typeof BroadcastChannel === "undefined") return null;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = () => tell(true);
  return channel;
}

function tell(fromAnotherTab: boolean) {
  for (const listener of [...listeners]) {
    try {
      listener(fromAnotherTab);
    } catch (err) {
      console.error(err);
    }
  }
}

export function announceChange() {
  tell(false);
  broadcast()?.postMessage(1);
}

export function onDataChange(listener: Listener): () => void {
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
