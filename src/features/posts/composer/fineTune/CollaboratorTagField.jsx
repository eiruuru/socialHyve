import { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function normalizeUsername(value) {
  return value.replace(/^@/, '').trim().toLowerCase();
}

export function CollaboratorTagField({ value = [], onChange, className }) {
  const [input, setInput] = useState('');
  const tags = Array.isArray(value) ? value : (value ? String(value).split(',').map((v) => v.trim()).filter(Boolean) : []);

  const addTag = (raw) => {
    const username = normalizeUsername(raw);
    if (!username || !/^[a-z0-9._]+$/.test(username)) return;
    if (tags.includes(username)) return;
    onChange([...tags, username]);
    setInput('');
  };

  const removeTag = (username) => {
    onChange(tags.filter((tag) => tag !== username));
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(input);
    } else if (event.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-xs font-medium">Collaborators</label>
      <div className="rounded-md border border-neutral-200 px-2 py-2">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs">
              @{tag}
              <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => input && addTag(input)}
            placeholder={tags.length ? 'Add another…' : '@username'}
            className="h-7 min-w-[120px] flex-1 border-0 px-1 shadow-none focus-visible:ring-0"
          />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Press Enter or comma to add Instagram usernames.</p>
    </div>
  );
}
