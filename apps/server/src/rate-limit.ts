export class RateLimiter {
  private readonly lastActionAt = new Map<string, Map<string, number>>();

  canRun(subject: string, action: string, cooldownMs: number, now = Date.now()): boolean {
    const actions = this.lastActionAt.get(subject) ?? new Map<string, number>();
    const last = actions.get(action) ?? 0;
    if (now - last < cooldownMs) {
      return false;
    }
    actions.set(action, now);
    this.lastActionAt.set(subject, actions);
    return true;
  }

  clear(subject: string): void {
    this.lastActionAt.delete(subject);
  }
}
