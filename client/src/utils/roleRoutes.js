// Central role -> dashboard path resolver (frontend-only)
// Keeps navigation consistent and role-aware without touching backend logic.

export function dashboardPathFor(role) {
  const r = (role || '').toString().toLowerCase();
  switch (r) {
    case 'ngo':
      return '/dashboard/ngo';
    case 'volunteer':
      return '/dashboard/volunteer';
    case 'admin':
      return '/admin-dashboard';
    case 'user':
    case 'community':
      return '/dashboard/community';
    default:
      // Do not guess another role
      return '/login';
  }
}
