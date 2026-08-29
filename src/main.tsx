import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { WheelWindow } from "./windows/WheelWindow";

// Orbit runs two windows off this same bundle: the hidden settings
// window (default, no hash) and the transparent wheel overlay window
// (index.html#/wheel — see src-tauri/tauri.conf.json). Picking the root
// component off the hash avoids needing a second Vite entry point.
const isWheelWindow = window.location.hash.startsWith("#/wheel");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isWheelWindow ? <WheelWindow /> : <App />}
  </React.StrictMode>,
);