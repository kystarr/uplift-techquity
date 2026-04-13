import { GoogleGenerativeAI, type ChatSession } from "@google/generative-ai";

/** Grounds the model in Uplift’s product; avoids inventing live user or business data. */
export const UPLIFT_CHAT_SYSTEM_INSTRUCTION = `You are a helpful assistant embedded in Uplift, a web app that helps people discover and support minority-owned businesses. You are powered by Google's Gemini models via the app's integration—answer honestly if someone asks what you are or what powers you.

How to reply:
- Answer the user's actual question first, directly and literally. Do not ignore specific questions (e.g. "Are you using Gemini?") or replace them with a generic greeting or a vague "How can I help?" pitch.
- Stay concise. One short paragraph is often enough unless they ask for detail.
- Then, only if it fits, you may add one sentence tying back to Uplift.

You are strong on:
- How to use Discover / search, filters, favorites, business profiles, profile tabs, messaging (high level)
- What verified businesses mean on the platform
- How business owners can join / register (high level)
- Ideas for supporting minority-owned and local businesses

Rules:
- Do not invent specific business names, addresses, hours, or live user/account data—you cannot see their screen or database.
- If something needs their real data or the live catalog, say you cannot see it and name the screen to use (e.g. Discover, Profile).
- For medical, legal, or financial decisions, suggest a qualified professional.`;

export function isGeminiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GEMINI_API_KEY?.trim());
}

export function createUpliftChatSession(): ChatSession {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }
  const modelName = import.meta.env.VITE_GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: UPLIFT_CHAT_SYSTEM_INSTRUCTION,
  });
  return model.startChat({ history: [] });
}

export async function sendUpliftMessage(chat: ChatSession, text: string): Promise<string> {
  const result = await chat.sendMessage(text);
  return result.response.text();
}

/**
 * Local fallback so the assistant remains usable when no Gemini key is configured.
 */
export function getUpliftFallbackReply(text: string): string {
  const q = text.toLowerCase();

  if (q.includes("near me") || q.includes("nearby") || q.includes("find")) {
    return "Open Discover/Search, allow location access if prompted, then use category and tag filters to narrow nearby minority-owned businesses.";
  }

  if (q.includes("verified")) {
    return "Verified means the business has completed Uplift's verification flow. It helps signal trust, but you can still compare reviews, ratings, and profile details.";
  }

  if (q.includes("join") || q.includes("register") || q.includes("owner") || q.includes("business")) {
    return "Business owners can register from the Register flow, complete profile details, and submit verification. After approval, the profile becomes publicly visible.";
  }

  if (q.includes("message") || q.includes("chat")) {
    return "You can message from the Messages area or from a business profile via the Message action. Conversations are grouped per business.";
  }

  return "I can help with finding businesses, understanding verification, messaging, favorites, and business onboarding in Uplift. Ask a specific task and I will walk you through it.";
}
