import { amplifyDataClient } from "@/amplifyDataClient";

export type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Server-side Gemini + live Business table snapshot (see `chatWithAssistant` in amplify/data).
 * Tries userPool → iam → apiKey so Discover works signed-in or as guest.
 */
export async function sendChatWithAssistantMessage(
  message: string,
  history: ChatTurn[],
): Promise<string> {
  const authModes = ["userPool", "iam", "apiKey"] as const;
  let lastError: unknown;

  for (const authMode of authModes) {
    try {
      const { data, errors } = await amplifyDataClient.mutations.chatWithAssistant(
        {
          message,
          history: history.map((h) => ({ role: h.role, content: h.content })),
        },
        { authMode },
      );

      if (errors?.length) {
        throw new Error(errors.map((e) => e.message).join(", "));
      }
      const reply = data?.reply?.trim();
      if (reply) {
        return reply;
      }
      throw new Error("Empty reply from assistant.");
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
