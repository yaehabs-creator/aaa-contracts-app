
import { StateCreator } from 'zustand';
import { 
    ContractSubfolder, 
    FolderSchemaField, 
    ExtractedData, 
    OrganizerFolderLayout 
} from '@/types';

export interface OrganizerSlice {
    organizerSubfolders: ContractSubfolder[];
    organizerSchemas: Record<string, FolderSchemaField[]>;
    organizerExtractedData: ExtractedData[];
    organizerLayout: OrganizerFolderLayout[];
    pendingLayout: OrganizerFolderLayout[] | null;

    setOrganizerSubfolders: (subfolders: ContractSubfolder[]) => void;
    setOrganizerSchemas: (schemas: Record<string, FolderSchemaField[]>) => void;
    setOrganizerExtractedData: (data: ExtractedData[]) => void;
    setOrganizerLayout: (layout: OrganizerFolderLayout[]) => void;
    setPendingLayout: (layout: OrganizerFolderLayout[] | null) => void;
}

import { AppState } from '../useAppStore';

export const createOrganizerSlice: StateCreator<AppState, [], [], OrganizerSlice> = (set) => ({
    organizerSubfolders: [],
    organizerSchemas: {},
    organizerExtractedData: [],
    organizerLayout: [],
    pendingLayout: null,

    setOrganizerSubfolders: (organizerSubfolders) => set({ organizerSubfolders }),
    setOrganizerSchemas: (organizerSchemas) => set({ organizerSchemas }),
    setOrganizerExtractedData: (organizerExtractedData) => set({ organizerExtractedData }),
    setOrganizerLayout: (organizerLayout) => set({ organizerLayout }),
    setPendingLayout: (pendingLayout) => set({ pendingLayout }),
});
