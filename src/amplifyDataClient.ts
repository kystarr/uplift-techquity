import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";

/**
 * Shared Amplify Data client for the Uplift app.
 *
 * Ensure Amplify is configured before generating the shared Data client.
 * This is safe to call multiple times and avoids startup race warnings.
 */
Amplify.configure(outputs);
export const amplifyDataClient = generateClient<Schema>();

