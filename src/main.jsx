import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { TranslationProvider } from "./hooks/useTranslations.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <TranslationProvider>
      <App />
    </TranslationProvider>
  </StrictMode>
);
