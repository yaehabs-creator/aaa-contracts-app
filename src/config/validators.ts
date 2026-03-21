
// Runtime configuration validators
// Helps detect missing critical configuration early at startup

export function getMissingConfig(): string[] {
  // All configuration is now managed locally or via the dev-server.
  // We no longer require Supabase URLs for the app to function.
  return [];
}
