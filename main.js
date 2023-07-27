const { app, BrowserWindow } = require("electron");
let config = require(__dirname + "/config.js");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const { dialog, ipcMain } = require("electron");
if (process.env.NODE_ENV === "development") {
  Object.defineProperty(app, "isPackaged", {
    get() {
      return true;
    }
  });
  autoUpdater.updateConfigPath = path.join(
    __dirname,
    "out/win-ia32-unpacked/resources/app-update.yml"
  );
  // mac的地址是'Contents/Resources/app-update.yml'
} else {
  autoUpdater.updateConfigPath = path.join(__dirname, "../app-update.yml");
  // 开发环境可重写url
  // config.url=''
}
const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: __dirname + "/jc.ico",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "/preload.js")
    }
  });
  ipcMain.on("set-title", (event, title) => {
    const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);
    win.setTitle(title);
  });
  win.loadURL(config.url);
};
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
function checkUpdate() {
  autoUpdater.autoDownload = false;
  //检测更新
  autoUpdater.checkForUpdatesAndNotify();

  //监听'error'事件
  autoUpdater.on("error", (err) => {
    console.log(err);
  });

  //监听'update-available'事件，发现有新版本时触发
  autoUpdater.on("update-available", (ev, info) => {
    // // 不可逆过程
    const options = {
      type: "info",
      buttons: ["确定", "取消"],
      title: "更新提示",
      // ${info.version} Cannot read property 'version' of undefined
      message: "发现有新版本，是否下载？",
      cancelId: 1
    };
    dialog.showMessageBox(options).then((res) => {
      if (res.response === 0) {
        autoUpdater.downloadUpdate();
      } else {
        return;
      }
    });
  });
  //默认会自动下载新版本，如果不想自动下载，设置autoUpdater.autoDownload = false
  //监听'update-downloaded'事件，新版本下载完成时触发
  autoUpdater.on("update-downloaded", () => {
    dialog
      .showMessageBox({
        type: "info",
        title: "应用更新",
        message: "新版本下载完成，是否更新？",
        buttons: ["是", "否"]
      })
      .then((buttonIndex) => {
        if (buttonIndex.response == 0) {
          //选择是，则退出程序，安装新版本
          autoUpdater.quitAndInstall();
          app.quit();
        }
      });
  });
}

app.on("ready", () => {
  //每次启动程序，就检查更新
  checkUpdate();
});
