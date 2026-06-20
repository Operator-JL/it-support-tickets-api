import { API_BASE_URL } from "./api.js";

const socketServerUrl = API_BASE_URL.replace(/\/$/, "");
const socketScriptId = "socket-io-client-script";
let socketPromise = null;
let socketInstance = null;

function loadSocketClient() {
  if (window.io) {
    return Promise.resolve();
  }

  const existingScript = document.getElementById(socketScriptId);
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = socketScriptId;
    script.async = true;
    script.src = `${socketServerUrl}/socket.io/socket.io.js`;
    script.onload = resolve;
    script.onerror = () => reject(new Error("No se pudo cargar Socket.IO."));
    document.body.appendChild(script);
  });
}

export async function getSocket() {
  if (socketInstance) {
    return socketInstance;
  }

  if (!socketPromise) {
    socketPromise = loadSocketClient()
      .then(() => {
        socketInstance = window.io(socketServerUrl, {
          transports: ["websocket", "polling"],
        });

        return socketInstance;
      })
      .catch((error) => {
        socketPromise = null;
        throw error;
      });
  }

  return socketPromise;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
  }

  socketInstance = null;
  socketPromise = null;
}
