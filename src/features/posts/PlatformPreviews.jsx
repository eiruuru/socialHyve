export function FacebookPreview({ caption, mediaUrl }) {
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-blue-600" />
          <div>
            <p className="text-sm font-semibold">Your Page</p>
            <p className="text-xs text-gray-500">Just now</p>
          </div>
        </div>
      </div>
      {caption && <p className="px-4 py-3 text-sm whitespace-pre-wrap">{caption}</p>}
      {mediaUrl && (
        <img src={mediaUrl} alt="Preview" className="w-full object-cover" />
      )}
    </div>
  );
}

export function InstagramPreview({ caption, mediaUrl }) {
  return (
    <div className="mx-auto max-w-[320px] rounded-lg border bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
        <p className="text-sm font-semibold">your_account</p>
      </div>
      <div className="aspect-square bg-gray-100">
        {mediaUrl ? (
          <img src={mediaUrl} alt="Preview" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Media required for Instagram
          </div>
        )}
      </div>
      {caption && (
        <div className="px-3 py-2">
          <p className="text-sm">
            <span className="font-semibold">your_account </span>
            {caption}
          </p>
        </div>
      )}
    </div>
  );
}
