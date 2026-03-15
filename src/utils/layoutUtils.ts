import { OrganizerFolderLayout } from '@/types';

export const FIXED_FOLDERS = [
    { code: 'A', name: 'Form of Agreement & its Annexes' },
    { code: 'B', name: 'Signed Letter of Acceptance' },
    { code: 'C', name: 'Conditions of Contract & its Appendices' },
    { code: 'D', name: 'Issued Tender & Post Tender Addenda' },
    { code: 'E', name: 'Soil Investigation Report' },
    { code: 'F', name: 'Contract Drawings' },
    { code: 'G', name: 'Specifications' },
    { code: 'H', name: 'Cut Sheets & Finish Schedule' },
    { code: 'I', name: 'Priced Bills of Quantities and Method of Measurement' },
    { code: 'J', name: 'Non-Priced Bill of Quantities' },
    { code: 'K', name: 'Emaar Minimum Construction Health & Safety Standards' },
    { code: 'L', name: 'Indicative Control Forms' },
    { code: 'M', name: 'Hoarding Requirements' },
    { code: 'N', name: 'Automation Application User Manual Guide' },
    { code: 'O', name: 'Confidentiality Undertaking' },
    { code: 'P', name: 'Instruction to Tenderers and its appendices' },
    { code: 'AI', name: 'AI Analysis Library' },
    { code: 'DATA', name: 'AI Knowledge Base' }
];

export function buildDefaultLayout(): OrganizerFolderLayout[] {
    return FIXED_FOLDERS.map((f, index) => ({
        code: f.code,
        isVisible: true,
        order: index
    }));
}

export function reorderLayout(layout: OrganizerFolderLayout[], fromIndex: number, toIndex: number): OrganizerFolderLayout[] {
    const result = Array.from(layout);
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);

    // Update the 'order' field to match their new positions in the array
    return result.map((item, idx) => ({ ...item, order: idx }));
}

export function toggleFolderVisibility(layout: OrganizerFolderLayout[], code: string): OrganizerFolderLayout[] {
    const visibleCount = layout.filter(f => f.isVisible).length;
    
    return layout.map(item => {
        if (item.code === code) {
            // Guard: don't allow hiding the last visible folder
            if (item.isVisible && visibleCount <= 1) return item;
            return { ...item, isVisible: !item.isVisible };
        }
        return item;
    });
}
