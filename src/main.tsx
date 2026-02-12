import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

// Import the Provider
import { Authenticator } from '@aws-amplify/ui-react';

Amplify.configure(outputs);

createRoot(document.getElementById("root")!).render(
  <Authenticator.Provider>
    <App />
  </Authenticator.Provider>
);