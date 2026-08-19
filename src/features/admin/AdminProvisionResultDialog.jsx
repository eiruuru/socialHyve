import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showToast } from '@/lib/toast';

export function AdminProvisionResultDialog({ result, onDismiss }) {
  if (!result) return null;

  const copyCredentials = async () => {
    const text = `Email: ${result.email}\nPassword: ${result.tempPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast({ title: 'Copied to clipboard', variant: 'success' });
    } catch {
      showToast({ title: 'Could not copy', variant: 'error' });
    }
  };

  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardHeader>
        <CardTitle className="text-base text-amber-900">Temporary credentials (shown once)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-amber-950">
        <p>
          Email: <span className="font-mono font-medium">{result.email}</span>
        </p>
        <p>
          Password: <span className="font-mono font-medium">{result.tempPassword}</span>
        </p>
        {result.existingAccount ? (
          <p className="text-xs text-amber-800">Existing account — password was reset.</p>
        ) : null}
        <p className="text-xs text-amber-800">
          Share securely. The user signs in at /app/login and will be prompted to set a new password.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={copyCredentials}>
            <Copy className="mr-1 h-3.5 w-3.5" />
            Copy
          </Button>
          <Button size="sm" variant="outline" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
