import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css"; // This imports your Tailwind-enabled CSS
import App from "./App.jsx";
import { showToast } from "./utils/toast";

// Global fetch interceptor for API error reporting
const originalFetch = window.fetch;
window.fetch = async function () {
  try {
    const response = await originalFetch.apply(this, arguments);
    if (!response.ok) {
      showToast(`Server Error: ${response.status} ${response.statusText}`, "error");
    }
    return response;
  } catch (error) {
    showToast(`Network Error: ${error.message}`, "error");
    throw error;
  }
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
