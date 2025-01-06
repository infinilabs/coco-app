export const clientEnv = {
  VITE_SERVER_URL: import.meta.env.VITE_SERVER_URL ?? "https://coco.infini.cloud",
  VITE_WEBSOCKET_URL: import.meta.env.VITE_WEBSOCKET_URL ?? "wss://coco.infini.cloud/ws",
};

// http://localhost:2900
// ws://localhost:2900/ws
