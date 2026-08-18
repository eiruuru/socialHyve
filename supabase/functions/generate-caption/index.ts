import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

const PLATFORM_GUIDANCE: Record<string, string> = {
  facebook: 'Write a concise Facebook post caption with a clear hook and optional call to action.',
  instagram: 'Write an Instagram caption with line breaks, emojis where natural, and 3-5 relevant hashtags at the end.',
};

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const platform = String(body.platform || 'instagram');
    const baseCaption = String(body.baseCaption || '').trim();
    const internalName = String(body.internalName || '').trim();
    const label = String(body.label || '').trim();
    const tone = String(body.tone || 'friendly and professional').trim();

    if (!OPENAI_API_KEY) {
      return jsonResponse({ error: 'OPENAI_API_KEY is not configured on the server.' }, 503);
    }

    const contextParts = [
      internalName && `Internal name: ${internalName}`,
      label && `Label: ${label}`,
      baseCaption && `Draft caption: ${baseCaption}`,
    ].filter(Boolean);

    const prompt = [
      PLATFORM_GUIDANCE[platform] || PLATFORM_GUIDANCE.instagram,
      `Tone: ${tone}.`,
      contextParts.length ? `Context:\n${contextParts.join('\n')}` : 'No draft yet — infer a useful caption from the context.',
      'Return only the caption text, no quotes or markdown.',
    ].join('\n\n');

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You write social media captions for marketing teams.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const message = data?.error?.message || 'OpenAI request failed';
      return jsonResponse({ error: message }, 502);
    }

    const caption = String(data?.choices?.[0]?.message?.content || '').trim();
    if (!caption) {
      return jsonResponse({ error: 'No caption returned from AI.' }, 502);
    }

    return jsonResponse({ caption });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
