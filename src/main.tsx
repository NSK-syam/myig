import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

if (rootElement.hasChildNodes()) {
  rootElement.innerHTML = "";
}

createRoot(rootElement).render(<App />);
