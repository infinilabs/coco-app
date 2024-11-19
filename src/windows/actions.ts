import { emit } from "@tauri-apps/api/event";

export async function createWin(args: any) {
  await emit("win-create", args);
}

export async function mainWin() {
  await createWin({
    label: "main",
    title: "Coco",
    url: "/",
    width: 800,
    height: 600,
    minWidth: 500,
    minHeight: 360,
  });
}

export async function chatWindow() {
  await createWin({
    label: "chat",
    title: "Chat",
    dragDropEnabled: true,
    center: true,
    width: 900,
    height: 700,
    alwaysOnTop: true,
    skipTaskbar: true,
    decorations: true,
    closable: true,
    url: "/gpt",
  });
}

export async function loginWin() {
  await createWin({
    label: "login",
    title: "登录",
    url: "/login",
    width: 400,
    height: 320,
    resizable: false,
    alwaysOnTop: true,
  });
}
