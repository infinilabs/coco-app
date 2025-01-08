/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly COCO_SERVER_URL: string;
  readonly COCO_WEBSOCKET_URL: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
