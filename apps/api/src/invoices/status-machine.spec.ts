import {
  STATUSES,
  TRANSITIONS,
  canTransition,
  isStatus,
} from './status-machine.js';

describe('status machine', () => {
  const allowed = new Set([
    'processing->needs_review',
    'needs_review->approved',
    'needs_review->rejected',
  ]);

  for (const from of STATUSES) {
    for (const to of STATUSES) {
      const key = `${from}->${to}`;
      it(`${allowed.has(key) ? 'allows' : 'refuses'} ${key}`, () => {
        expect(canTransition(from, to)).toBe(allowed.has(key));
      });
    }
  }

  it('treats approved and rejected as terminal', () => {
    expect(TRANSITIONS.approved).toEqual([]);
    expect(TRANSITIONS.rejected).toEqual([]);
  });

  it('recognises only the four statuses', () => {
    expect(STATUSES.every(isStatus)).toBe(true);
    expect(isStatus('paid')).toBe(false);
    expect(isStatus('APPROVED')).toBe(false);
  });
});
