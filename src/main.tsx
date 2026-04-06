import { createRoot } from "react-dom/client";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import App from "./App.tsx";
import "./index.css";

try {
  Amplify.configure(outputs);
} catch (e) {
  console.error("Amplify configuration failed:", e);
}

createRoot(document.getElementById("root")!).render(<App />);