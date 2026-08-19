import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMembership } from '@/lib/membershipContext';

export function UpgradeToProBanner({ feature = 'This feature' }) {
  const { isPro, isOwnerOrAdmin } = useMembership();

  if (isPro || !isOwnerOrAdmin) return null;

  return (
    <div className="rounded-hyve-md border border-honey/30 bg-honey-light/20 p-4">
      <p className="text-sm text-ink">
        <span className="font-medium">{feature}</span> is available on the Pro plan.
      </p>
      <Button size="sm" className="mt-3 gap-1.5" asChild>
        <Link to="/app/settings/account?tab=billing&plan=pro">
          Upgrade to Pro
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
