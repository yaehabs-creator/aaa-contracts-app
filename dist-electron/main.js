import { app as l, BrowserWindow as r, Menu as n, shell as c } from "electron";
import o from "node:path";
import { fileURLToPath as d } from "node:url";
const s = o.dirname(d(import.meta.url));
process.env.APP_ROOT = o.join(s, "..");
const t = process.env.VITE_DEV_SERVER_URL, _ = o.join(process.env.APP_ROOT, "dist"), i = o.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = t ? o.join(process.env.APP_ROOT, "public") : i;
let e;
function a() {
  e = new r({
    icon: o.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: o.join(s, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    },
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "default"
    // Standard title bar for stability as requested
  }), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), t ? e.loadURL(t) : e.loadFile(o.join(i, "index.html"));
  const p = n.buildFromTemplate([
    {
      label: "File",
      submenu: [
        { role: "quit" }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Learn More",
          click: async () => {
            await c.openExternal("https://electronjs.org");
          }
        }
      ]
    }
  ]);
  n.setApplicationMenu(p);
}
l.on("window-all-closed", () => {
  process.platform !== "darwin" && (l.quit(), e = null);
});
l.on("activate", () => {
  r.getAllWindows().length === 0 && a();
});
l.whenReady().then(a);
export {
  _ as MAIN_DIST,
  i as RENDERER_DIST,
  t as VITE_DEV_SERVER_URL
};
