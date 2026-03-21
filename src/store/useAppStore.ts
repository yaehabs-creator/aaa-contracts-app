
import { create } from 'zustand';
import { 
    ContractSlice, 
    createContractSlice 
} from './slices/contractSlice';
import { 
    ChatSlice, 
    createChatSlice 
} from './slices/chatSlice';
import { 
    UISlice, 
    createUISlice 
} from './slices/uiSlice';
import { 
    OrganizerSlice, 
    createOrganizerSlice 
} from './slices/organizerSlice';
import { 
    FileSlice, 
    createFileSlice 
} from './slices/fileSlice';

// Combined State Interface
export interface AppState extends 
    ContractSlice, 
    ChatSlice, 
    UISlice, 
    OrganizerSlice, 
    FileSlice {}

/**
 * Global App Store
 * Composed of domain-specific slices to improve maintainability and prevent re-render bloat.
 */
export const useAppStore = create<AppState>()((...a) => ({
    ...createContractSlice(...a),
    ...createChatSlice(...a),
    ...createUISlice(...a),
    ...createOrganizerSlice(...a),
    ...createFileSlice(...a),
}));
