type ChangeListener = (changes: Record<string, any>, area: string) => void;
type MessageListener = (message: unknown) => void;

/**
 * Install a minimal in-memory `chrome` global: storage.sync (firing onChanged
 * like Chrome does), runtime.onMessage and mockable tabs.
 */
export const installChromeStub = () => {
  const store: Record<string, unknown> = {};
  const changeListeners: ChangeListener[] = [];
  const messageListeners: MessageListener[] = [];

  const emitChange: ChangeListener = (changes, area) =>
    changeListeners.forEach((listener) => listener(changes, area));

  const chrome = {
    storage: {
      sync: {
        get: (key: string, cb: (items: Record<string, unknown>) => void) =>
          cb({ [key]: store[key] }),
        set: (items: Record<string, unknown>, cb: () => void) => {
          Object.assign(store, items);
          const changes: Record<string, any> = {};
          Object.entries(items).forEach(
            ([key, newValue]) => (changes[key] = { newValue })
          );
          emitChange(changes, "sync");
          cb();
        },
      },
      onChanged: {
        addListener: (cb: ChangeListener) => changeListeners.push(cb),
      },
    },
    runtime: {
      onMessage: {
        addListener: (cb: MessageListener) => messageListeners.push(cb),
      },
    },
    tabs: {
      query: jest.fn(),
      sendMessage: jest.fn(),
    },
  };
  (global as any).chrome = chrome;

  return {
    store,
    chrome,
    emitChange,
    sendMessage: (message: unknown) =>
      messageListeners.forEach((listener) => listener(message)),
  };
};

export const flushPromises = () =>
  new Promise((resolve) => setTimeout(resolve, 0));
