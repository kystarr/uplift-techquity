import type { AppSyncResolverEvent } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { GoogleGenerativeAI } from '@google/generative-ai';
import outputs from '../../../amplify_outputs.json';

Amplify.configure(outputs, { ssr: true });
const client = generateClient();

const MAX_HISTORY_TURNS = 24;
const MAX_BUSINESSES = 150;

type ChatTurn = { role: string; content: string };

type ResolverArgs = {
  message?: string | null;
  history?: ChatTurn[] | null;
};

const STATIC_SYSTEM = `You are the in-app assistant for Uplift, a web app that helps people discover and support minority-owned businesses.

You will receive a JSON array called approvedBusinesses — these are real, APPROVED listings from the platform database (same source as Discover). When the user asks about businesses, locations, categories, or ratings, ground your answer ONLY in that JSON. If something is not in the data, say you do not see that listing and suggest they use Discover or search.

Rules:
- Answer the user's actual question first; be direct and concise.
- Prefer naming businesses exactly as in the JSON. Do not invent names, addresses, or ratings.
- For "near me" or distance questions: if coordinates are present you may explain generally; you do not have the user's live GPS in this chat unless the app sends it later—say that clearly.
- If asked what powers you, say you use Google's Gemini with live app data loaded on the server for each request.
- For medical, legal, or financial advice, suggest a qualified professional.`;

export const handler = async (event: AppSyncResolverEvent<ResolverArgs>) => {
  if (event.info?.fieldName !== 'chatWithAssistant') {
    throw new Error(`Unsupported field: ${String(event.info?.fieldName)}`);
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

  const approvedBusinesses = await loadApprovedBusinessSnapshot();

  const dataPayload = JSON.stringify({
    approvedBusinesses,
    count: approvedBusinesses.length,
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

  const result = await chat.sendMessage(message);
  const reply = result.response.text();

  return { reply };
};

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
};

async function loadApprovedBusinessSnapshot(): Promise<BusinessSnapshot[]> {
  const res = await client.models.Business.list({ authMode: 'iam' });
  const errors = res.errors as Array<{ message?: string }> | undefined;
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message ?? 'Unknown').join('; '));
  }

  const rows = (res.data ?? []).filter((b) => b.verificationStatus === 'APPROVED');

  const mapped: BusinessSnapshot[] = rows.map((b) => ({
    id: String(b.id ?? ''),
    name: String(b.businessName ?? 'Business'),
    category:
      (Array.isArray(b.categories) && b.categories[0]) ||
      b.businessType ||
      'Business',
    city: b.city ?? undefined,
    state: b.state ?? undefined,
    rating: typeof b.averageRating === 'number' ? b.averageRating : 0,
    reviewCount: typeof b.reviewCount === 'number' ? b.reviewCount : 0,
    verified: b.verified ?? false,
    tags: b.tags ?? [],
    latitude: typeof b.latitude === 'number' ? b.latitude : undefined,
    longitude: typeof b.longitude === 'number' ? b.longitude : undefined,
  }));

  mapped.sort((a, b) => a.name.localeCompare(b.name));
  return mapped.slice(0, MAX_BUSINESSES);
}
