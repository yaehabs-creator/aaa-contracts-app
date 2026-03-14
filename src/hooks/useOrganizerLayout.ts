import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
    OrganizerFolderLayout, 
} from '@/types';
import { 
    saveOrganizerLayout, 
    getOrganizerLayout 
} from '@/services/supabaseService';
import { 
    buildDefaultLayout, 
    reorderLayout, 
    toggleFolderVisibility 
} from '@/utils/layoutUtils';
import toast from 'react-hot-toast';

export function useOrganizerLayout() {
    const { 
        organizerLayout, 
        setOrganizerLayout, 
        pendingLayout, 
        setPendingLayout,
        contract
    } = useAppStore();

    const [isSaving, setIsSaving] = useState(false);

    const activeLayout = pendingLayout ?? (organizerLayout.length > 0 ? organizerLayout : buildDefaultLayout());

    const isEditing = pendingLayout !== null;
    const isDirty = JSON.stringify(pendingLayout) !== JSON.stringify(organizerLayout);

    const startEditing = useCallback(() => {
        setPendingLayout(organizerLayout.length > 0 ? organizerLayout : buildDefaultLayout());
    }, [organizerLayout, setPendingLayout]);

    const cancelEditing = useCallback(() => {
        setPendingLayout(null);
    }, [setPendingLayout]);

    const toggleFolder = useCallback((code: string) => {
        if (!pendingLayout) return;
        setPendingLayout(toggleFolderVisibility(pendingLayout, code));
    }, [pendingLayout, setPendingLayout]);

    const reorderFolders = useCallback((fromIndex: number, toIndex: number) => {
        if (!pendingLayout) return;
        if (fromIndex === toIndex) return;
        setPendingLayout(reorderLayout(pendingLayout, fromIndex, toIndex));
    }, [pendingLayout, setPendingLayout]);

    const confirmLayout = useCallback(async () => {
        if (!pendingLayout || !contract?.id) return;

        setIsSaving(true);
        const snapshot = [...organizerLayout];
        const newLayout = [...pendingLayout];

        try {
            // Optimistic update
            setOrganizerLayout(newLayout);
            setPendingLayout(null);

            await saveOrganizerLayout(contract.id, newLayout);
            toast.success('Organizer layout saved successfully');
        } catch (err: any) {
            console.error('Failed to save layout:', err);
            
            // Rollback
            setOrganizerLayout(snapshot);
            setPendingLayout(newLayout); // Re-open with the attempted changes
            toast.error(err.message || 'Failed to save layout changes');
        } finally {
            setIsSaving(false);
        }
    }, [pendingLayout, contract?.id, organizerLayout, setOrganizerLayout, setPendingLayout]);

    const fetchLayout = useCallback(async (contractId: string) => {
        try {
            const layout = await getOrganizerLayout(contractId);
            if (layout && layout.length > 0) {
                setOrganizerLayout(layout);
            } else {
                setOrganizerLayout(buildDefaultLayout());
            }
        } catch (err) {
            console.warn('Could not load layout, using default');
            setOrganizerLayout(buildDefaultLayout());
        }
    }, [setOrganizerLayout]);

    return {
        activeLayout,
        isEditing,
        isDirty,
        isSaving,
        startEditing,
        cancelEditing,
        toggleFolder,
        reorderFolders,
        confirmLayout,
        fetchLayout,
        contract
    };
}
