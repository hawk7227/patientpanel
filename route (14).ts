// Alias for /api/check-user-exists — the appointment page calls /api/check-email
// but the actual route is /api/check-user-exists. This re-exports the same handler.
export { POST } from "../check-user-exists/route";
