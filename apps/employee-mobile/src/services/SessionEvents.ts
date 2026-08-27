/**
 * Process-wide hooks so any API layer (attendance, waypoint queue, native flags) can force the app
 * back to the Login screen when the session is no longer valid, or into maintenance mode when the
 * server says so.
 */
type UnauthorizedHandler = () => void;
type MaintenanceHandler = (payload: any) => void;

let handler: UnauthorizedHandler | null = null;
let maintenanceHandler: MaintenanceHandler | null = null;
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

  setMaintenanceHandler(next: MaintenanceHandler | null) {
    maintenanceHandler = next;
  },

  /** Called with the `{ error, code: 'MAINTENANCE', maintenance }` payload of a 503 response. */
  emitMaintenance(payload: any) {
    maintenanceHandler?.(payload);
  },
};
