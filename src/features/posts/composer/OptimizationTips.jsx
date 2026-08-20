const IG_CAPTION_LIMIT = 2200;

export function OptimizationTips({
  caption,
  media,
  publishInstagram,
  scheduledAt,
  requireInstagramMedia = false,
}) {
  const tips = [];

  if (publishInstagram && caption.length > IG_CAPTION_LIMIT * 0.9) {
    tips.push('Caption is nearing Instagram\'s 2,200 character limit.');
  }
  if (requireInstagramMedia && publishInstagram && media.length === 0) {
    tips.push('Add at least one image or video for Instagram.');
  }
  if (scheduledAt) {
    const scheduleDate = new Date(scheduledAt);
    if (scheduleDate.getTime() < Date.now()) {
      tips.push('Schedule time is in the past — pick a future date.');
    }
  } else {
    tips.push('Set a schedule time before publishing or submitting for review.');
  }
  if (media.length >= 10) {
    tips.push('Carousel is at the maximum of 10 items.');
  }
  if (caption.length > 0 && !caption.includes('#')) {
    tips.push('Consider adding hashtags to improve discoverability.');
  }

  if (tips.length === 0) return null;

  return (
    <ul className="space-y-1 text-xs text-muted-foreground">
      {tips.map((tip) => (
        <li key={tip}>• {tip}</li>
      ))}
    </ul>
  );
}
