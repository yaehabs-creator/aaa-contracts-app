
import { useEffect } from 'react';
import { supabase } from '@/supabase/config';
import { useAppStore } from '@/store/useAppStore';

/**
 * Hook to subscribe to real-time changes of the organizer layout for the active contract.
 * This ensures that when one user confirms a layout change, it is instantly reflected
 * on all other users' screens.
 */
export function useLayoutRealtime() {
    const { contract, setOrganizerLayout } = useAppStore();

    useEffect(() => {
        if (!contract?.id || !supabase) return;

        console.log(`[REALTIME] Subscribing to layout changes for contract: ${contract.id}`);

        const channel = supabase
            .channel(`layout-sync-${contract.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'organizer_layouts',
                    filter: `contract_id=eq.${contract.id}`
                },
                (payload) => {
                    console.log('[REALTIME] Layout update received:', payload);
                    
                    // On UPDATE or INSERT, sync the new layout data to the store
                    if (payload.new && (payload.new as any).layout) {
                        const newLayout = (payload.new as any).layout;
                        console.log('[REALTIME] Applying new layout to store:', newLayout.length, 'items');
                        setOrganizerLayout(newLayout);
                    }
                }
            )
            .subscribe((status) => {
                console.log(`[REALTIME] Subscription status for contract ${contract.id}:`, status);
            });

        return () => {
            console.log(`[REALTIME] Cleaning up subscription for contract: ${contract.id}`);
            supabase.removeChannel(channel);
        };
    }, [contract?.id, setOrganizerLayout]);
}
