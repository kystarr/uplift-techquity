import type { AppSyncResolverEvent } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { GoogleGenerativeAI } from '@google/generative-ai';
import outputs from '../../../amplify_outputs.json';

Amplify.configure(outputs, { ssr: true });
const client = generateClient();

const MAX_HISTORY_TURNS = 24;
const MAX_BUSINESSES = 150;
const MAX_CARDS = 8;

const GEMINI_RETRY_ATTEMPTS = 4;
const GEMINI_RETRY_BASE_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 429/503/502 and overloaded-style errors from the Gemini API are often transient. */
function isRetryableGeminiError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /\[429 |\[[45]0[23] |UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand|try again later/i.test(msg);
}

async function sendMessageWithRetries<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < GEMINI_RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (!isRetryableGeminiError(e) || attempt === GEMINI_RETRY_ATTEMPTS - 1) {
        throw e;
      }
      const backoff = Math.min(8000, GEMINI_RETRY_BASE_MS * 2 ** attempt);
      const jitter = Math.floor(Math.random() * 250);
      await sleep(backoff + jitter);
    }
  }
  throw lastError;
}

type ChatTurn = { role: string; content: string };

type ResolverArgs = {
  message?: string | null;
  history?: ChatTurn[] | null;
  latitude?: number | null;
  longitude?: number | null;
};

const STATIC_SYSTEM = `You are the warm, upbeat in-app assistant for Uplift (discover businesses). Sound friendly and helpful—like a cheerful concierge, not stiff or robotic. You receive JSON: approvedBusinesses (real listings with "id") and optionally userLocation.

## Voice
- Stay concise: usually a few short sentences. Light filler is welcome ("Sure thing!", "Happy to help", "Here you go", "Totally—") as long as you still answer directly.
- Avoid long intros, lectures, or repeating their whole question back unless one short phrase helps clarity.

## Two response types (pick one per message)

**A) Discovery / recommendations** — Use ONLY when the user is clearly asking for business suggestions, comparisons, or "what should I try / where should I go" style discovery (including "near me", "best coffee", "highest rated food", category searches). Not for pure app help or generic directions.

- Write a VERY SHORT friendly lead-in (1–2 sentences max). Do NOT name businesses, bullet brands, or paste addresses/ratings in the text—cards show that.
- On a new line: BUSINESS_IDS: id1,id2,... (up to 8 ids from approvedBusinesses only, most relevant first). Never invent ids.
- If they want "nearby" but userLocation is null: one short warm sentence asking them to tap Share location or type city/ZIP, then BUSINESS_IDS: none (or include ids only if their message already specifies a place you can match).
- Ranking: prefer higher rating, then reviewCount; category/tags for food & coffee; with userLocation, JSON order is distance-sorted—prefer fitting + closer entries.

**B) Everything else** — Directions (driving/walking), how to use the app, what "verified" means, account/help, small talk, definitions, or any question that is NOT asking you to pick businesses from the directory.

- Answer ONLY what they asked. Be specific and practical. Keep it short (usually 1–4 sentences). A brief upbeat opener or sign-off is fine if it stays light.
- Driving/walking: you cannot give turn-by-turn; say that in one line and suggest they use Apple/Google Maps. In-app "how do I…" questions: give concrete steps (routes, button names).
- End with exactly: BUSINESS_IDS: none

## Always
- Ground business facts in approvedBusinesses only when listing ids in mode A.
- Medical/legal/financial: one sentence to see a qualified professional.
- Favorites: sign in → heart on card or business page → Profile → Favorites (/profile/favorites).
- "How can a business join Uplift?": say they should use "Register Your Business" on the landing page, and the team reviews submissions to confirm the business is legitimate.
- What powers you: Gemini + live approved listings loaded each request.`;

export const handler = async (event: AppSyncResolverEvent<ResolverArgs>) => {
  const fieldName = event.info?.fieldName;
  if (fieldName != null && fieldName !== 'chatWithAssistant') {
    throw new Error(`Unsupported field: ${String(fieldName)}`);
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Chat assistant is not configured (missing GEMINI_API_KEY secret).');
  }

  const modelId = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

  const message = String(event.arguments?.message ?? '').trim();
  if (!message) {
    throw new Error('Message is required.');
  }

  const rawLat = event.arguments?.latitude;
  const rawLng = event.arguments?.longitude;
  const userLat = typeof rawLat === 'number' && !Number.isNaN(rawLat) ? rawLat : undefined;
  const userLng = typeof rawLng === 'number' && !Number.isNaN(rawLng) ? rawLng : undefined;
  const hasUserLocation =
    userLat !== undefined && userLng !== undefined && userLat >= -90 && userLat <= 90 && userLng >= -180 && userLng <= 180;

  const rawHistory = event.arguments?.history;
  const history: ChatTurn[] = Array.isArray(rawHistory)
    ? rawHistory
        .filter((h) => h && typeof h.content === 'string')
        .slice(-MAX_HISTORY_TURNS)
        .map((h) => ({
          role: String(h.role ?? 'user'),
          content: String(h.content ?? ''),
        }))
    : [];

  let approvedBusinesses = await loadApprovedBusinessSnapshot();

  if (hasUserLocation) {
    approvedBusinesses = sortByDistance(approvedBusinesses, userLat!, userLng!).slice(0, MAX_BUSINESSES);
  } else {
    approvedBusinesses = approvedBusinesses.slice(0, MAX_BUSINESSES);
  }

  const dataPayload = JSON.stringify({
    approvedBusinesses,
    count: approvedBusinesses.length,
    userLocation: hasUserLocation ? { latitude: userLat, longitude: userLng } : null,
  });

  const systemInstruction = `${STATIC_SYSTEM}

Current data (JSON):
${dataPayload}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction,
  });

  const geminiHistory = history
    .filter((t) => t.content.trim().length > 0)
    .map((t) => ({
      role: roleToGemini(t.role),
      parts: [{ text: t.content }],
    }));

  const chat = model.startChat({
    history: geminiHistory,
  });

  const result = await sendMessageWithRetries(() => chat.sendMessage(message));
  const rawText = result.response.text();

  const { reply, ids } = parseBusinessIdsLine(rawText);
  const byId = new Map(approvedBusinesses.map((b) => [b.id, b]));
  const seen = new Set<string>();
  const matched: BusinessSnapshot[] = [];
  for (const id of ids) {
    const b = byId.get(id);
    if (b && !seen.has(b.id)) {
      seen.add(b.id);
      matched.push(b);
    }
  }

  const referencedBusinesses = matched.map((b) => ({
    id: b.id,
    name: b.name,
    category: b.category,
    rating: b.rating,
    reviewCount: b.reviewCount,
    verified: b.verified,
    city: b.city ?? undefined,
    state: b.state ?? undefined,
    imageUrl: b.imageUrl ?? undefined,
  }));

  return { reply, referencedBusinesses };
};

/**
 * Parses `BUSINESS_IDS: id1,id2` or `BUSINESS_IDS: none` (own line or end of paragraph). Strips all from visible reply.
 */
function parseBusinessIdsLine(raw: string): { reply: string; ids: string[] } {
  let ids: string[] = [];
  const re = /\bBUSINESS_IDS:\s*([^\n]*)/gi;
  for (const m of raw.matchAll(re)) {
    const rest = m[1].trim();
    if (rest && rest.toLowerCase() !== 'none') {
      ids = rest
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, MAX_CARDS);
    } else {
      ids = [];
    }
  }
  const reply = raw
    .replace(/\bBUSINESS_IDS:\s*[^\n]*/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
  return { reply, ids };
}

function roleToGemini(role: string): 'user' | 'model' {
  return role === 'assistant' || role === 'model' ? 'model' : 'user';
}

type BusinessSnapshot = {
  id: string;
  name: string;
  category: string;
  city?: string;
  state?: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  tags: string[];
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
};

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function sortByDistance(rows: BusinessSnapshot[], userLat: number, userLng: number): BusinessSnapshot[] {
  return [...rows].sort((a, b) => {
    const da =
      a.latitude != null && a.longitude != null
        ? haversineMiles(userLat, userLng, a.latitude, a.longitude)
        : Infinity;
    const db =
      b.latitude != null && b.longitude != null
        ? haversineMiles(userLat, userLng, b.latitude, b.longitude)
        : Infinity;
    return da - db;
  });
}

async function loadApprovedBusinessSnapshot(): Promise<BusinessSnapshot[]> {
  const res = await client.models.Business.list({ authMode: 'iam' });
  const errors = res.errors as Array<{ message?: string }> | undefined;
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message ?? 'Unknown').join('; '));
  }

  const rows = (res.data ?? []).filter((b) => b.verificationStatus === 'APPROVED');

  const mapped: BusinessSnapshot[] = rows.map((b) => {
    const imgs = b.images;
    const firstImg = Array.isArray(imgs) && imgs.length > 0 && typeof imgs[0] === 'string' ? imgs[0] : undefined;
    return {
      id: String(b.id ?? ''),
      name: String(b.businessName ?? 'Business'),
      category:
        (Array.isArray(b.categories) && b.categories[0]) || b.businessType || 'Business',
      city: b.city ?? undefined,
      state: b.state ?? undefined,
      rating: typeof b.averageRating === 'number' ? b.averageRating : 0,
      reviewCount: typeof b.reviewCount === 'number' ? b.reviewCount : 0,
      verified: b.verified ?? false,
      tags: b.tags ?? [],
      latitude: typeof b.latitude === 'number' ? b.latitude : undefined,
      longitude: typeof b.longitude === 'number' ? b.longitude : undefined,
      imageUrl: firstImg,
    };
  });

  mapped.sort((a, b) => a.name.localeCompare(b.name));
  return mapped;
}
