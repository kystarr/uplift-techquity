import { amplifyDataClient } from "@/amplifyDataClient";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type AssistantBusinessCard = {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  city?: string | null;
  state?: string | null;
  imageUrl?: string | null;
};

export type ChatAssistantResult = {
  reply: string;
  referencedBusinesses: AssistantBusinessCard[];
};

export type SendChatOptions = {
  latitude?: number;
  longitude?: number;
};

/**
 * Server-side Gemini + live Business table snapshot (`chatWithAssistant`).
 * Tries userPool → identityPool (guest) → apiKey.
 */
export async function sendChatWithAssistantMessage(
  message: string,
  history: ChatTurn[],
  options?: SendChatOptions,
): Promise<ChatAssistantResult> {
  const chatWithAssistant = amplifyDataClient.mutations.chatWithAssistant;
  if (typeof chatWithAssistant !== "function") {
    throw new Error(
      "Chat assistant is not available in the Data client. Ensure amplify_outputs.json includes the chatWithAssistant mutation (run ampx sandbox or ampx generate outputs), then restart the dev server.",
    );
  }

  const authModes = ["userPool", "identityPool", "apiKey"] as const;
  let lastError: unknown;

  const payload: {
    message: string;
    history: { role: string; content: string }[];
    latitude?: number;
    longitude?: number;
  } = {
    message,
    history: history.map((h) => ({ role: h.role, content: h.content })),
  };

  if (
    options?.latitude !== undefined &&
    options?.longitude !== undefined &&
    !Number.isNaN(options.latitude) &&
    !Number.isNaN(options.longitude)
  ) {
    payload.latitude = options.latitude;
    payload.longitude = options.longitude;
  }

  for (const authMode of authModes) {
    try {
      const { data, errors } = await chatWithAssistant(payload, { authMode });

      if (errors?.length) {
        throw new Error(errors.map((e) => e.message).join(", "));
      }
      const reply = data?.reply?.trim();
      if (reply) {
        const raw = data?.referencedBusinesses;
        const referencedBusinesses: AssistantBusinessCard[] = Array.isArray(raw)
          ? raw.map((row) => ({
              id: String(row?.id ?? ""),
              name: String(row?.name ?? ""),
              category: String(row?.category ?? ""),
              rating: typeof row?.rating === "number" ? row.rating : 0,
              reviewCount: typeof row?.reviewCount === "number" ? row.reviewCount : 0,
              verified: Boolean(row?.verified),
              city: row?.city ?? null,
              state: row?.state ?? null,
              imageUrl: row?.imageUrl ?? null,
            }))
          : [];
        return { reply, referencedBusinesses };
      }
      throw new Error("Empty reply from assistant.");
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
