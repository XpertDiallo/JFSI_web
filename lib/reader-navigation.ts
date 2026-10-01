export type PageDirection = -1 | 1;
export type SwipePoint = { x: number; y: number; time: number };

// Short, predominantly horizontal gestures turn pages; slow drags and scrolling do not.
export function swipeDirection(start: SwipePoint, end: SwipePoint): PageDirection | 0 {
  const dx = end.x - start.x, dy = end.y - start.y, duration = end.time - start.time;
  if (duration < 0 || duration > 850 || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6) return 0;
  return dx < 0 ? 1 : -1;
}

export function resolvePageTurn(page: number, total: number, direction: PageDirection, adjacent = false): number | 'previous-section' | 'next-section' | null {
  if (!Number.isInteger(page) || !Number.isInteger(total) || total < 1 || page < 1 || page > total) return null;
  const next = page + direction;
  if (next >= 1 && next <= total) return next;
  return adjacent ? direction === -1 ? 'previous-section' : 'next-section' : null;
}
