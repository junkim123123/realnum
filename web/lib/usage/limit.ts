// A simple in-memory rate limiter.
// NOTE: This is not suitable for production use at scale, as it's not shared across server instances.
// However, it's a good starting point for V1.

type UsageEntry = {
  count: number;
  // Use a numeric date (e.g., 20231225) to easily check if the entry is from a previous day.
  date: number;
};

const usage = new Map<string, UsageEntry>();

const ANONYMOUS_LIMIT = 1;
const AUTHENTICATED_LIMIT = 5;

function getCurrentDateAsNumber(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return parseInt(`${year}${month}${day}`, 10);
}

function getLimit(isAuthenticated: boolean): number {
    return isAuthenticated ? AUTHENTICATED_LIMIT : ANONYMOUS_LIMIT;
}

export function getUsage(identifier: string, isAuthenticated: boolean): { count: number; limit: number } {
  const limit = getLimit(isAuthenticated);
  const currentDate = getCurrentDateAsNumber();
  const entry = usage.get(identifier);

  if (!entry || entry.date !== currentDate) {
    return { count: 0, limit };
  }

  return { count: entry.count, limit };
}

export function incrementUsage(identifier: string, isAuthenticated: boolean): { count: number; limit: number } {
    const limit = getLimit(isAuthenticated);
    
    // For local development or alpha persona testing only.
    // This must never be enabled in production.
    if (process.env.NEXSUPPLY_DISABLE_USAGE_LIMITS === 'true') {
        return { count: 0, limit };
    }
    
    const currentDate = getCurrentDateAsNumber();
    const entry = usage.get(identifier);

    if (!entry || entry.date !== currentDate) {
        // First request of the day for this identifier.
        const newEntry = { count: 1, date: currentDate };
        usage.set(identifier, newEntry);
        return { count: newEntry.count, limit };
    }

    // Increment and allow.
    entry.count++;
    usage.set(identifier, entry);
    return { count: entry.count, limit };
}