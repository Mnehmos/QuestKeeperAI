// main.js
const {app, BrowserWindow, ipcMain, dialog} = require("electron");
const path = require("path");
const fs = require("fs").promises; // Import fs promises
const fetch = require("node-fetch");

let mainWindow;
let settingsWindow = null;
const pythonPort = 5001;

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 400,
    height: 200,
    title: "Settings",
    parent: mainWindow,
    modal: true,
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, "settings_preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: "#f4f1e7",
  });

  settingsWindow.loadFile(path.join(__dirname, "settings.html"));

  settingsWindow.once("ready-to-show", () => {
    settingsWindow.show();
  });

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

function createWindow() {
  console.log("[createWindow] Attempting to create main window...");
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: "hidden",
    trafficLightPosition: {x: 15, y: 15},
    minWidth: 1000,
    minHeight: 700,
    title: "QuestKeeperAI",
    backgroundColor: "#0a0a0f",
    icon: path.join(
      __dirname,
      "assets",
      app.isPackaged ? "icon.png" : "icon.png"
    ),
  });
  console.log("[createWindow] BrowserWindow created.");

  // Load React app from webpack build
  const indexPath = path.join(__dirname, "dist", "index.html");
  console.log(`[createWindow] Attempting to load file: ${indexPath}`);
  mainWindow
    .loadFile(indexPath)
    .then(() => {
      console.log("[createWindow] React app loaded successfully.");
    })
    .catch((err) => {
      console.error("[createWindow] Error loading React app:", err);
      dialog.showErrorBox(
        "Loading Error",
        `Failed to load QuestKeeperAI: ${err.message}\n\nMake sure to run 'npm run build' first.`
      );
    });

  // Only open DevTools if not packaged
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    console.log("[createWindow] Main window closed.");
    mainWindow = null;
    if (settingsWindow) {
      settingsWindow.close();
    }
  });

  mainWindow.on("ready-to-show", () => {
    console.log("[createWindow] Main window ready-to-show.");
    mainWindow.show();
    console.log("[createWindow] mainWindow.show() called after ready-to-show.");
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription, validatedURL) => {
      console.error(
        `[createWindow] Failed to load URL: ${validatedURL}, Error Code: ${errorCode}, Description: ${errorDescription}`
      );
      dialog.showErrorBox(
        "Load Failed",
        `Failed to load content: ${errorDescription}`
      );
    }
  );
}

app.whenReady().then(() => {
  console.log("[app.whenReady] App ready. Calling createWindow...");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("quit", () => {
  console.log("[app.quit] App quitting.");
});

ipcMain.handle("get-python-port", async () => {
  return pythonPort;
});

ipcMain.handle("show-open-dialog", async (event, options) => {
  // Default options if none provided (for backward compatibility or other uses)
  const defaultOptions = {
    properties: ["openFile"],
    filters: [{ name: 'Python Scripts', extensions: ['py'] }]
  };
  const dialogOptions = options || defaultOptions;

  // Ensure mainWindow is used if available
  const window = mainWindow || BrowserWindow.getFocusedWindow();
  if (!window) {
      console.error("show-open-dialog: No window available to show dialog.");
      return []; // Return empty array or handle error as appropriate
  }

  const result = await dialog.showOpenDialog(window, dialogOptions);
  return result.filePaths;
});

ipcMain.handle("open-settings-dialog", () => {
  createSettingsWindow();
});

ipcMain.on("close-settings-dialog", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.close();
  }
});

// Handler to read file content
ipcMain.handle("read-file-content", async (event, filePath) => {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error("Invalid file path provided.");
  }
  try {
    // Basic security check: Ensure the path is within expected directories if needed
    // For simplicity now, we just read the path given. Add validation if required.
    console.log(`[read-file-content] Reading file: ${filePath}`);
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    console.error(`[read-file-content] Error reading file ${filePath}:`, error);
    throw new Error(`Failed to read file: ${error.message}`);
  }
});

// --- Model Switching IPC Handlers ---

ipcMain.handle("list-models", async () => {
  console.log("[ipcMain] Handling list-models request");
  try {
    const response = await fetch(`http://127.0.0.1:${pythonPort}/list-models`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    console.log("[ipcMain] list-models response:", data);
    return data.models; // Assuming backend returns { status: 'success', models: [...] }
  } catch (error) {
    console.error("[ipcMain] Error listing models:", error);
    throw error; // Re-throw to be caught in renderer
  }
});

ipcMain.handle("get-model", async () => {
  console.log("[ipcMain] Handling get-model request");
  try {
    const response = await fetch(`http://127.0.0.1:${pythonPort}/get-model`);
    const data = await response.json();
     if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    console.log("[ipcMain] get-model response:", data);
    return data.model; // Assuming backend returns { status: 'success', model: '...' }
  } catch (error) {
    console.error("[ipcMain] Error getting current model:", error);
    throw error;
  }
});

ipcMain.handle("set-model", async (event, modelName) => {
  console.log(`[ipcMain] Handling set-model request for: ${modelName}`);
  try {
    const response = await fetch(`http://127.0.0.1:${pythonPort}/set-model`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelName }),
    });
    const data = await response.json();
     if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    console.log("[ipcMain] set-model response:", data);
    // Optionally notify main window or handle success/error feedback
    if (mainWindow) {
        mainWindow.webContents.send("model-update-status", { success: true, message: data.message, model: modelName });
    }
    return { success: true, message: data.message }; // Return success status to settings window
  } catch (error) {
    console.error(`[ipcMain] Error setting model to ${modelName}:`, error);
     if (mainWindow) {
        mainWindow.webContents.send("model-update-status", { success: false, message: error.message, model: modelName });
    }
    throw error; // Re-throw for settings window
  }
});

// --- End Model Switching IPC Handlers ---

ipcMain.on("save-api-key", async (event, apiKey) => {
  console.log("[save-api-key] Received API key from settings dialog.");
  let result;
  try {
    const response = await fetch(`http://127.0.0.1:${pythonPort}/set-api-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({apiKey: apiKey}),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    console.log("[save-api-key] Backend responded:", data);
    result = {success: true, message: data.message};
  } catch (error) {
    console.error("[save-api-key] Error setting API key via backend:", error);
    result = {success: false, message: error.message};
  }
  if (mainWindow) {
    mainWindow.webContents.send("api-key-update-status", result);
  }
});
