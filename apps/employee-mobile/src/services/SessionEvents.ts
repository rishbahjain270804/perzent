/**
 * Process-wide hook so any API layer (attendance, waypoint queue, native flags)
 * can force the app back to the Login screen when the session is no longer valid.
 */
type UnauthorizedHandler = () => void;

let handler: UnauthorizedHandler | null = null;
let firing = false;

export const SessionEvents = {
  setUnauthorizedHandler(next: UnauthorizedHandler | null) {
    handler = next;
  },

  /** Idempotent within a short window so parallel 401s only log out once. */
  emitUnauthorized() {
    if (firing) return;
    firing = true;
    try {
      handler?.();
    } finally {
      setTimeout(() => {
        firing = false;
      }, 2000);
    }
  },
};
