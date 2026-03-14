import { OrganizerFolderLayout } from '@/types';

export const FIXED_FOLDERS = [
    { code: 'A', name: 'Form of Agreement & its Annexes' },
    { code: 'B', name: 'Signed Letter of Acceptance' },
    { code: 'T', name: 'Form of Tender' },
    { code: 'C', name: 'Conditions of Contract & its Appendices' },
    { code: 'R', name: 'Employer\'s Requirements' },
    { code: 'S', name: 'Specification' },
    { code: 'Q', name: 'Technical Proposal' },
    { code: 'E', name: 'Contract Drawings' },
    { code: 'I', name: 'Priced Bills of Quantities' },
    { code: 'J', name: 'Schedules' },
    { code: 'K', name: 'Annexes' },
    { code: 'D', name: 'Addendums & Post Tender Addendums' },
    { code: 'P', name: 'Instruction To Tenderers' },
    { code: 'N', name: 'Automation Application' },
    { code: 'O', name: 'Other Documents' },
    { code: 'AI', name: 'AI Analysis Library' },
    { code: 'DATA', name: 'AI Knowledge Base' }
] as const;

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
