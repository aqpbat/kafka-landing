/**
 * Lead submission to the kafka-bot service (forwards leads to the sales
 * Telegram chat). API contract: docs/LEADS-INTEGRATION.md.
 *
 * Artboards call it through `DCLogic.sendLead()` (see dc/runtime.ts); on the
 * design canvas that method does not exist and nothing is sent.
 */

export const LEAD_API: string =
  import.meta.env.PUBLIC_LEAD_API || 'https://kafka-bot-production.up.railway.app/lead';

export type LeadForm = 'demo' | 'pricing' | 'partner';

/** Fields the artboard collects; `page`, `utm` and `elapsed` are added here. */
export interface LeadFields {
  form: LeadForm;
  name: string;
  phone: string;
  venue?: string;
  points?: string;
  modules?: string[];
  comment?: string;
  /** Honeypot value, sent as is. */
  website?: string;
}

export type LeadResult = 'sent' | 'invalid_phone' | 'invalid_name' | 'rate_limited' | 'failed';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const UTM_STORE = 'kafka_utm';

/** Remember UTM tags of the first entry for the whole session. Call on page load. */
export function captureUtm(): void {
  try {
    if (sessionStorage.getItem(UTM_STORE)) return;
    const q = new URLSearchParams(location.search);
    const utm: Record<string, string> = {};
    for (const k of UTM_KEYS) {
      const v = q.get(k);
      if (v) utm[k] = v.slice(0, 200);
    }
    if (Object.keys(utm).length) sessionStorage.setItem(UTM_STORE, JSON.stringify(utm));
  } catch {
    /* storage unavailable — no UTM */
  }
}

function readUtm(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(UTM_STORE) || '{}');
  } catch {
    return {};
  }
}

/**
 * POST the lead. `shownAt` is the `performance.now()` moment the form was
 * first shown; `elapsed` must be a number or the server silently drops it.
 */
export async function sendLead(fields: LeadFields, shownAt: number): Promise<LeadResult> {
  const body = {
    form: fields.form,
    name: fields.name.slice(0, 100),
    phone: fields.phone,
    venue: (fields.venue ?? '').slice(0, 150),
    points: fields.points ?? '',
    modules: (fields.modules ?? []).slice(0, 20),
    comment: (fields.comment ?? '').slice(0, 1000),
    page: location.pathname,
    utm: readUtm(),
    website: fields.website ?? '',
    elapsed: Math.max(0, Math.round(performance.now() - shownAt)),
  };
  try {
    const res = await fetch(LEAD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return 'sent';
    if (res.status === 429) return 'rate_limited';
    if (res.status === 422) {
      const data = await res.json().catch(() => ({}));
      if (data?.error === 'invalid_phone') return 'invalid_phone';
      if (data?.error === 'invalid_name') return 'invalid_name';
    }
    return 'failed';
  } catch {
    return 'failed';
  }
}
