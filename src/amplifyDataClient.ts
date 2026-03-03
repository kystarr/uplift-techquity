import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";

/**
 * Shared Amplify Data client for the Uplift app.
 *
 * Amplify is configured once in src/main.tsx using amplify_outputs.json.
 * This client reuses that configuration to talk to the Gen 2 Data backend.
 */
export const amplifyDataClient = generateClient<Schema>();

