const IG_CAPTION_LIMIT = 2200;
const FB_CAPTION_LIMIT = 63206;

export function OptimizationTips({
  caption,
  media,
  publishInstagram,
  publishFacebook,
  scheduledAt,
}) {
  const tips = [];

  if (!media?.length) {
    tips.push({ level: 'warn', text: 'Add at least one image or video for better engagement.' });
  }
  if (publishInstagram && caption.length > IG_CAPTION_LIMIT * 0.9) {
    tips.push({ level: 'warn', text: 'Caption is near Instagram\'s character limit.' });
  }
  if (publishInstagram && caption.length < 50 && media.length) {
    tips.push({ level: 'info', text: 'Consider a longer caption — IG posts with context often perform better.' });
  }
  if (scheduledAt) {
    const hour = new Date(scheduledAt).getHours();
    if (hour < 7 || hour > 21) {
      tips.push({ level: 'info', text: 'Posts scheduled outside 7 AM–9 PM may get lower initial reach.' });
    }
  } else {
    tips.push({ level: 'info', text: 'Set a schedule time to auto-publish at the right moment.' });
  }
  if (!caption.trim()) {
    tips.push({ level: 'warn', text: 'Caption is empty — add copy before publishing.' });
  }

  if (!tips.length) {
    return (
      <div className="rounded-hyve-md bg-[#DFF3E6] p-3 text-sm text-status-published">
        Looking good — ready to publish!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="font-mono text-xs font-semibold uppercase tracking-wider text-honey-dark">
        Optimization tips
      </p>
      <ul className="space-y-1.5">
        {tips.map((tip) => (
          <li
            key={tip.text}
            className={`rounded-hyve-sm px-3 py-2 text-xs ${
              tip.level === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-neutral-50 text-muted-foreground'
            }`}
          >
            {tip.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
