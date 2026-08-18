import { useEffect, useRef, useState } from 'react';
import { Braces, Hash, Link2, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/IconTooltip';
import { cn } from '@/lib/utils';

const COMMON_EMOJIS = [
  '😀', '😂', '🥰', '😍', '🔥', '✨', '💯', '👏', '🙌', '💪',
  '🎉', '❤️', '💙', '💚', '⭐', '📸', '📍', '🌟', '☀️', '🌸',
  '🍕', '☕', '🎵', '📣', '✅', '👉', '👀', '💡', '🚀', '🎯',
  '🛍️', '💼', '📅', '🤝', '🙏', '💬', '📝', '🎁', '🏆', '🌈',
  '🇵🇭', '🇺🇸', '💐', '🍰', '🥳', '😊', '🤩', '😎', '🫶', '💫',
];

function insertAtCursor(textarea, insertValue) {
  if (!textarea) return insertValue;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const next = `${textarea.value.slice(0, start)}${insertValue}${textarea.value.slice(end)}`;
  const cursor = start + insertValue.length;
  return { next, cursor };
}

function EmojiPickerPopover({ onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <IconTooltip title="Emoji" description="Insert an emoji at the cursor">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen((v) => !v)}>
          <Smile className="h-4 w-4" />
        </Button>
      </IconTooltip>
      {open && (
        <div className="absolute bottom-full right-0 z-20 mb-2 grid w-[220px] grid-cols-8 gap-1 rounded-hyve-md border bg-white p-2 shadow-lg">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="rounded p-1 text-lg hover:bg-neutral-100"
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CaptionEditorToolbar({
  textareaRef,
  onChange,
  shortenUrls,
  onShortenUrlsChange,
  onShortenNow,
  clientName,
  postLabel,
  className,
}) {
  const [variablesOpen, setVariablesOpen] = useState(false);
  const variablesRef = useRef(null);

  useEffect(() => {
    if (!variablesOpen) return undefined;
    const handleClick = (event) => {
      if (variablesRef.current && !variablesRef.current.contains(event.target)) setVariablesOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [variablesOpen]);

  const applyInsert = (insertValue) => {
    const textarea = textareaRef.current;
    const result = insertAtCursor(textarea, insertValue);
    if (typeof result === 'string') {
      onChange(result);
      return;
    }
    onChange(result.next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.cursor, result.cursor);
    });
  };

  const handleLink = () => {
    const url = window.prompt('Enter URL');
    if (!url?.trim()) return;
    applyInsert(url.trim());
  };

  const variables = [
    { token: '{client_name}', label: 'Client name', value: clientName || 'Client' },
    { token: '{post_label}', label: 'Post label', value: postLabel || 'Post' },
  ];

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-2', className)}>
      <label className="flex items-center gap-2 text-xs text-ink">
        <input
          type="checkbox"
          checked={!!shortenUrls}
          onChange={(e) => {
            onShortenUrlsChange(e.target.checked);
            if (e.target.checked) onShortenNow?.();
          }}
        />
        Shorten URLs
      </label>
      <div className="flex items-center gap-0.5">
        <EmojiPickerPopover onSelect={applyInsert} />
        <IconTooltip title="Hashtag" description="Insert # at the cursor">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyInsert('#')}>
            <Hash className="h-4 w-4" />
          </Button>
        </IconTooltip>
        <div className="relative" ref={variablesRef}>
          <IconTooltip title="Variables" description="Insert dynamic placeholders">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setVariablesOpen((v) => !v)}>
              <Braces className="h-4 w-4" />
            </Button>
          </IconTooltip>
          {variablesOpen && (
            <div className="absolute bottom-full right-0 z-20 mb-2 min-w-[180px] rounded-hyve-md border bg-white p-1 shadow-lg">
              {variables.map((item) => (
                <button
                  key={item.token}
                  type="button"
                  className="flex w-full flex-col rounded px-3 py-2 text-left text-xs hover:bg-neutral-100"
                  onClick={() => {
                    applyInsert(item.token);
                    setVariablesOpen(false);
                  }}
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground">{item.token}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <IconTooltip title="Link" description="Insert a URL at the cursor">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleLink}>
            <Link2 className="h-4 w-4" />
          </Button>
        </IconTooltip>
      </div>
    </div>
  );
}
