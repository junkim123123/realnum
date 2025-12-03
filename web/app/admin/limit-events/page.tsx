import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';

const ADMIN_EMAIL = process.env.ALPHA_ADMIN_EMAIL;

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function truncateText(text: string | null | undefined, maxLength: number = 50): string {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export default async function LimitEventsPage() {
  // Check authentication
  const session = await getServerSession();
  const userEmail = session?.user?.email;

  // Simple admin check
  if (!userEmail || (ADMIN_EMAIL && userEmail !== ADMIN_EMAIL)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 max-w-md">
          <h1 className="text-2xl font-bold mb-4">Not Authorized</h1>
          <p className="text-muted-foreground">
            This page is only accessible to authorized administrators.
          </p>
        </Card>
      </div>
    );
  }

  // Fetch limit events
  let events = [];
  if (prisma) {
    try {
      events = await prisma.limitEvent.findMany({
        take: 200,
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error: any) {
      console.error('[LimitEventsPage] Failed to fetch events:', error);
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Alpha Limit Events / Lead Console</h1>
          <p className="text-muted-foreground">
            Track who hit limits and what products they tried to analyze. Total: {events.length} events
          </p>
        </div>

        {!prisma ? (
          <Card className="p-6">
            <p className="text-destructive">Database connection unavailable.</p>
          </Card>
        ) : events.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">No limit events found yet.</p>
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface border-b border-subtle-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Date/Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      User Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Product Input
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle-border">
                  {events.map((event) => (
                    <tr
                      key={event.id}
                      className="hover:bg-surface/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                        {formatDate(event.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            event.userType === 'user'
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {event.userType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {event.userId || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-surface border border-subtle-border">
                          {event.reason}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            event.action === 'limit_hit'
                              ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                              : event.action === 'cta_primary_click'
                              ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                              : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {event.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground max-w-md">
                        <div className="truncate" title={event.input || ''}>
                          {truncateText(event.input, 60)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <div className="mt-6 text-sm text-muted-foreground">
          <p>
            💡 <strong>Usage Tips:</strong>
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Check for users who hit limits and clicked CTAs - these are hot leads</li>
            <li>Match product inputs with alpha signup forms or booking calendars</li>
            <li>Prioritize users who analyzed multiple products before hitting the limit</li>
            <li>Follow up with personalized outreach based on their product interests</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

