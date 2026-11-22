import type { TourProgress } from '@flowdesk/shared';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { requestEvents, requests } from '../../db/schema.js';

export async function getTourProgress(
  db: Db,
  scopeId: string,
): Promise<TourProgress> {
  const rows = await db
    .select({ requestId: requests.id, eventType: requestEvents.type })
    .from(requests)
    .leftJoin(
      requestEvents,
      and(
        eq(requestEvents.demoSpaceId, requests.demoSpaceId),
        eq(requestEvents.requestId, requests.id),
      ),
    )
    .where(
      and(eq(requests.demoSpaceId, scopeId), eq(requests.isSample, false)),
    );
  return {
    created: rows.length > 0,
    decided: rows.some(
      (row) => row.eventType === 'approved' || row.eventType === 'rejected',
    ),
    assigned: rows.some((row) => row.eventType === 'assigned'),
    completed: rows.some((row) => row.eventType === 'completed'),
  };
}
