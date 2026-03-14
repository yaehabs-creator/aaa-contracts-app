import { describe, it, expect } from 'vitest';
import { 
    buildDefaultLayout, 
    reorderLayout, 
    toggleFolderVisibility 
} from '@/utils/layoutUtils';
import { OrganizerFolderLayout } from '@/types';

describe('Organizer Layout Utils', () => {
    describe('buildDefaultLayout', () => {
        it('should create a layout with all FIXED_FOLDERS visible and in order', () => {
            const layout = buildDefaultLayout();
            expect(layout.length).toBeGreaterThan(10);
            expect(layout.every(f => f.isVisible)).toBe(true);
            expect(layout[0].order).toBe(0);
            expect(layout[1].order).toBe(1);
        });
    });

    describe('reorderLayout', () => {
        it('should move an item from index 0 to 2 and update orders', () => {
            const initial: OrganizerFolderLayout[] = [
                { code: 'A', isVisible: true, order: 0 },
                { code: 'B', isVisible: true, order: 1 },
                { code: 'C', isVisible: true, order: 2 },
            ];
            const result = reorderLayout(initial, 0, 2);
            expect(result[0].code).toBe('B');
            expect(result[1].code).toBe('C');
            expect(result[2].code).toBe('A');
            expect(result[0].order).toBe(0);
            expect(result[1].order).toBe(1);
            expect(result[2].order).toBe(2);
        });
    });

    describe('toggleFolderVisibility', () => {
        it('should flip visibility of a folder', () => {
            const initial: OrganizerFolderLayout[] = [
                { code: 'A', isVisible: true, order: 0 },
                { code: 'B', isVisible: true, order: 1 },
            ];
            const result = toggleFolderVisibility(initial, 'A');
            expect(result.find(f => f.code === 'A')?.isVisible).toBe(false);
            
            const result2 = toggleFolderVisibility(result, 'A');
            expect(result2.find(f => f.code === 'A')?.isVisible).toBe(true);
        });

        it('should not allow hiding the last visible folder', () => {
            const initial: OrganizerFolderLayout[] = [
                { code: 'A', isVisible: true, order: 0 },
                { code: 'B', isVisible: false, order: 1 },
            ];
            const result = toggleFolderVisibility(initial, 'A');
            expect(result.find(f => f.code === 'A')?.isVisible).toBe(true); // Still true
        });
    });
});
