import { Input } from '@/components/ui/input';

export function CarouselLinkField({ value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium">Carousel destination URL</label>
      <Input
        type="url"
        placeholder="https://example.com/landing-page"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-[11px] text-muted-foreground">
        Required for Facebook carousel posts with multiple images.
      </p>
    </div>
  );
}
