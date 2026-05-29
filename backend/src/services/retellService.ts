// retellService.ts
// -----------------------------------------------------------------------------
// Thin wrapper around the Retell AI REST API.
//
// We deliberately call the HTTPS endpoints directly (instead of pulling in
// `retell-sdk`) so we don't add a heavy dependency for what is, in practice,
// 4 endpoints: create web call, create phone call, get call, list call
// transcript.
//
// Behaviour:
//   • If RETELL_API_KEY is set → real Retell calls.
//   • If RETELL_API_KEY is unset → `isVoiceAvailable()` returns false and
//     every helper returns a "demo mode" payload so the interview still
//     works as a text-only Gemini session. This lets the feature ship before
//     the user signs up for Retell.
//
// The Retell agent must already exist in the user's Retell dashboard and
// its ID supplied via env (RETELL_AGENT_ID). We update its system prompt
// dynamically per call via the `retell_llm_dynamic_variables` field so the
// SAME agent can run any of our 100+ candidate × type combinations.
// -----------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface VoiceStatus {
  available: boolean;
  hasApiKey: boolean;
  hasAgentId: boolean;
  phoneNumber: string | null;
  interviewerName: string;
}

export interface WebCallResult {
  provider: "retell-web" | "demo";
  call_id: string | null;
  access_token: string | null;
  agent_id?: string;
}

export interface PhoneCallResult {
  provider: "retell-phone" | "demo";
  call_id: string | null;
}

/** Raw turn shape inside a Retell transcript object. */
interface RetellTranscriptTurn {
  role: string;
  content?: string;
  words?: Array<{ word: string }>;
  start_time_ms?: number | null;
}

/** Raw call object returned by Retell's GET /v2/get-call/:id endpoint. */
export interface RetellCall {
  call_id?: string;
  transcript_object?: RetellTranscriptTurn[];
  transcript?: RetellTranscriptTurn[];
  [key: string]: unknown;
}

/** Normalised turn used by the rest of the application. */
export interface NormalisedTurn {
  role: "ai" | "candidate";
  text: string;
  ts: number | null;
}

/** Q/A pair produced by pairTranscriptToTurns. */
export interface TranscriptQAPair {
  question: string;
  answer: string | null;
}

/** Dynamic variables forwarded to the Retell agent. */
type DynamicVariables = Record<string, unknown>;

// Augmented Error with HTTP metadata
class RetellError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "RetellError";
    this.status = status;
    this.body = body;
  }
}

// ---------------------------------------------------------------------------
// Constants & internal helpers
// ---------------------------------------------------------------------------

const RETELL_BASE = "https://api.retellai.com";

function getKey(): string | null {
  return process.env.RETELL_API_KEY || null;
}

export function isVoiceAvailable(): boolean {
  return Boolean(getKey() && process.env.RETELL_AGENT_ID);
}

export function getVoiceStatus(): VoiceStatus {
  return {
    available: isVoiceAvailable(),
    hasApiKey: Boolean(getKey()),
    hasAgentId: Boolean(process.env.RETELL_AGENT_ID),
    phoneNumber: process.env.RETELL_PHONE_NUMBER || null,
    interviewerName: process.env.RETELL_AGENT_NAME || "Rexa",
  };
}

async function retellFetch(
  path: string,
  options: RequestInit = {}
): Promise<Record<string, unknown>> {
  const key = getKey();
  if (!key) throw new Error("RETELL_API_KEY not configured");

  const res = await fetch(`${RETELL_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    },
  });

  const text = await res.text();
  let body: Record<string, unknown>;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    const msg =
      (body?.error_message as string) ||
      (body?.message as string) ||
      `Retell ${res.status}`;
    throw new RetellError(msg, res.status, body);
  }

  return body;
}

// ---------------------------------------------------------------------------
// CREATE A WEB CALL
//
// Returns { call_id, access_token } — the frontend uses retell-client-js-sdk
// with that access_token to start an in-browser WebRTC voice session.
// ---------------------------------------------------------------------------

export async function createWebCall({
  systemPrompt,
  dynamicVariables,
}: {
  systemPrompt: string;
  dynamicVariables?: DynamicVariables;
}): Promise<WebCallResult> {
  if (!isVoiceAvailable()) {
    return { provider: "demo", call_id: null, access_token: null };
  }
  const body = await retellFetch("/v2/create-web-call", {
    method: "POST",
    body: JSON.stringify({
      agent_id: process.env.RETELL_AGENT_ID,
      retell_llm_dynamic_variables: dynamicVariables || {},
      metadata: { systemPrompt: truncate(systemPrompt, 6000) },
    }),
  });
  return {
    provider: "retell-web",
    call_id: body.call_id as string,
    access_token: body.access_token as string,
    agent_id: body.agent_id as string,
  };
}

// ---------------------------------------------------------------------------
// CREATE A PHONE CALL  (Phase 2-and-a-half — left wired but unused by the UI
// until the user provisions a Twilio number bound to their Retell agent.)
// ---------------------------------------------------------------------------

export async function createPhoneCall({
  toNumber,
  dynamicVariables,
}: {
  toNumber: string;
  dynamicVariables?: DynamicVariables;
}): Promise<PhoneCallResult> {
  if (!isVoiceAvailable() || !process.env.RETELL_PHONE_NUMBER) {
    return { provider: "demo", call_id: null };
  }
  const body = await retellFetch("/v2/create-phone-call", {
    method: "POST",
    body: JSON.stringify({
      from_number: process.env.RETELL_PHONE_NUMBER,
      to_number: toNumber,
      override_agent_id: process.env.RETELL_AGENT_ID,
      retell_llm_dynamic_variables: dynamicVariables || {},
    }),
  });
  return {
    provider: "retell-phone",
    call_id: body.call_id as string,
  };
}

// ---------------------------------------------------------------------------
// FETCH A FINISHED CALL
//
// Polled once on /finish to grab the full transcript + duration.
// Retell's transcript shape: an array of { role, content, words? } turns.
// ---------------------------------------------------------------------------

export async function getCall(callId: string): Promise<RetellCall | null> {
  if (!isVoiceAvailable()) return null;
  return retellFetch(`/v2/get-call/${callId}`, { method: "GET" }) as Promise<RetellCall>;
}

// Normalise Retell's transcript shape into our internal one.
//   { role: "ai" | "candidate", text, ts }
export function normaliseTranscript(retellCall: RetellCall | null): NormalisedTurn[] {
  if (!retellCall) return [];
  const turns: RetellTranscriptTurn[] =
    retellCall.transcript_object || retellCall.transcript || [];
  return turns
    .map((t) => {
      const role: "ai" | "candidate" =
        t.role === "agent" || t.role === "assistant" || t.role === "ai"
          ? "ai"
          : "candidate";
      const text =
        t.content ||
        (Array.isArray(t.words) ? t.words.map((w) => w.word).join(" ") : "");
      return { role, text: text?.trim() || "", ts: t.start_time_ms ?? null };
    })
    .filter((t) => t.text);
}

// Group a flat transcript back into Q/A pairs (ai-turn + the candidate's
// next reply) so we can run the same evaluation pipeline we use for text.
export function pairTranscriptToTurns(
  transcript: NormalisedTurn[]
): TranscriptQAPair[] {
  const turns: TranscriptQAPair[] = [];
  let currentQ: string | null = null;

  for (const t of transcript) {
    if (t.role === "ai") {
      if (currentQ) turns.push({ question: currentQ, answer: null });
      currentQ = t.text;
    } else if (t.role === "candidate") {
      if (currentQ) {
        turns.push({ question: currentQ, answer: t.text });
        currentQ = null;
      } else {
        // Candidate spoke first — rare, but capture it.
        turns.push({ question: "(candidate spoke first)", answer: t.text });
      }
    }
  }

  if (currentQ) turns.push({ question: currentQ, answer: null });
  return turns;
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function truncate(s: string | undefined | null, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) : s;
}