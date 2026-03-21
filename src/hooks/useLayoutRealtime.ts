
import { useEffect } from 'react';

/**
 * Hook to subscribe to real-time changes of the organizer layout.
 * Supabase real-time has been disabled.
 */
export function useLayoutRealtime() {
    useEffect(() => {
        // Real-time synchronization is disabled in local-only mode.
        // All changes are persisted to the local file system.
    }, []);
}
