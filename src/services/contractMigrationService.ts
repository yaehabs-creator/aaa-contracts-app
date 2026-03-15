import { SavedContract, LegacyContract, ContractSection, SectionItem, SectionType, ItemType, Clause } from '@/types';

/**
 * Check if a contract is in the legacy format (has clauses but no sections)
 */
export function isLegacyContract(contract: SavedContract | LegacyContract): contract is LegacyContract {
  return !contract.sections && !!contract.clauses && contract.clauses.length > 0;
}

/**
 * Convert a Clause to a SectionItem
 */
export function clauseToSectionItem(clause: Clause, orderIndex: number): SectionItem {
  return {
    itemType: ItemType.CLAUSE,
    orderIndex,
    // Clause-specific fields
    number: clause.clause_number,
    heading: clause.clause_title,
    text: clause.clause_text,
    clause_number: clause.clause_number,
    clause_title: clause.clause_title,
    condition_type: clause.condition_type,
    clause_text: clause.clause_text,
    general_condition: clause.general_condition,
    particular_condition: clause.particular_condition,
    comparison: clause.comparison,
    has_time_frame: clause.has_time_frame,
    time_frames: clause.time_frames,
    financial_assets: clause.financial_assets,
    category: clause.category,
    chapter: clause.chapter,
    gc_link_tokens: clause.gc_link_tokens,
    pc_link_tokens: clause.pc_link_tokens,
    isHidden: clause.isHidden
  };
}

/**
 * Convert SectionItem back to Clause (for backward compatibility)
 */
export function sectionItemToClause(item: SectionItem): Clause | null {
  if (item.itemType !== ItemType.CLAUSE) {
    return null;
  }

  return {
    clause_number: item.clause_number || item.number || '',
    clause_title: item.clause_title || item.heading || '',
    condition_type: item.condition_type || 'General',
    clause_text: item.clause_text || item.text || '',
    general_condition: item.general_condition,
    particular_condition: item.particular_condition,
    comparison: item.comparison || [],
    has_time_frame: item.has_time_frame,
    time_frames: item.time_frames,
    financial_assets: item.financial_assets,
    category: item.category,
    chapter: item.chapter,
    gc_link_tokens: item.gc_link_tokens,
    pc_link_tokens: item.pc_link_tokens,
    isHidden: item.isHidden
  };
}

/**
 * Migrate a legacy contract to the new sections format
 */
export function migrateContractToSections(contract: SavedContract | LegacyContract): SavedContract {
  // If already in new format, return as-is
  if (contract.sections && contract.sections.length > 0) {
    return contract as SavedContract;
  }

  // If no clauses, create empty sections structure
  if (!contract.clauses || contract.clauses.length === 0) {
    return {
      ...contract,
      title: (contract as any).title || (contract as any).name || "Untitled Contract",
      status: (contract as any).status || 'draft',
      version: (contract as any).version || 1,
      is_deleted: (contract as any).is_deleted || false,
      sections: [
        {
          sectionType: SectionType.AGREEMENT,
          title: 'Form of Agreement',
          items: []
        },
        {
          sectionType: SectionType.LOA,
          title: 'Letter of Acceptance',
          items: []
        },
        {
          sectionType: SectionType.CONDITIONS,
          title: 'Conditions of Contract',
          items: []
        },
        {
          sectionType: SectionType.TENDER,
          title: 'Tender Addenda',
          items: []
        },
        {
          sectionType: SectionType.REPORT,
          title: 'Investigation Report',
          items: []
        },
        {
          sectionType: SectionType.DRAWINGS,
          title: 'Drawings',
          items: []
        },
        {
          sectionType: SectionType.SPECIFICATION,
          title: 'Specifications',
          items: []
        },
        {
          sectionType: SectionType.SCHEDULE,
          title: 'Schedules',
          items: []
        },
        {
          sectionType: SectionType.BOQ,
          title: 'Bills of Quantities',
          items: []
        },
        {
          sectionType: SectionType.REQUIREMENTS,
          title: 'Requirements',
          items: []
        },
        {
          sectionType: SectionType.FORMS,
          title: 'Forms',
          items: []
        },
        {
          sectionType: SectionType.AUTOMATION,
          title: 'User Guide',
          items: []
        },
        {
          sectionType: SectionType.UNDERTAKING,
          title: 'Undertaking',
          items: []
        },
        {
          sectionType: SectionType.PROPOSAL,
          title: 'Proposal',
          items: []
        },
        {
          sectionType: SectionType.ADDENDUM,
          title: 'Addenda',
          items: []
        },
        {
          sectionType: SectionType.INSTRUCTION,
          title: 'Instruction to Tenderers',
          items: []
        },
        {
          sectionType: SectionType.ANNEX,
          title: 'Annexes',
          items: []
        },
        {
          sectionType: SectionType.EXTRAS,
          title: 'Extras',
          items: []
        }
      ],
      clauses: []  // Keep empty array for backward compatibility
    };
  }

  // Separate clauses by condition type
  const generalClauses: Clause[] = [];
  const particularClauses: Clause[] = [];

  contract.clauses.forEach(clause => {
    const type = (clause.condition_type || '').toLowerCase();

    if (type === 'particular' || type === 'particular conditions') {
      particularClauses.push(clause);
    } else {
      // Default to General for 'general', 'both', 'modified', or unknown types
      // This ensures we never drop extracted data during migration.
      generalClauses.push(clause);
    }
  });

  // Convert clauses to section items with proper ordering
  const generalItems: SectionItem[] = generalClauses.map((clause, index) =>
    clauseToSectionItem(clause, index)
  );

  const particularItems: SectionItem[] = particularClauses.map((clause, index) =>
    clauseToSectionItem(clause, index)
  );

  // Create sections array
  const sections: ContractSection[] = [
    {
      sectionType: SectionType.AGREEMENT,
      title: 'Form of Agreement',
      items: []
    },
    {
      sectionType: SectionType.LOA,
      title: 'Letter of Acceptance',
      items: []
    },
    {
      sectionType: SectionType.CONDITIONS,
      title: 'Conditions of Contract',
      items: [...particularItems, ...generalItems]
    },
    {
      sectionType: SectionType.TENDER,
      title: 'Tender Addenda',
      items: []
    },
    {
      sectionType: SectionType.REPORT,
      title: 'Investigation Report',
      items: []
    },
    {
      sectionType: SectionType.DRAWINGS,
      title: 'Drawings',
      items: []
    },
    {
      sectionType: SectionType.SPECIFICATION,
      title: 'Specifications',
      items: []
    },
    {
      sectionType: SectionType.SCHEDULE,
      title: 'Schedules',
      items: []
    },
    {
      sectionType: SectionType.BOQ,
      title: 'Bills of Quantities',
      items: []
    },
    {
      sectionType: SectionType.REQUIREMENTS,
      title: 'Requirements',
      items: []
    },
    {
      sectionType: SectionType.FORMS,
      title: 'Forms',
      items: []
    },
    {
      sectionType: SectionType.AUTOMATION,
      title: 'User Guide',
      items: []
    },
    {
      sectionType: SectionType.UNDERTAKING,
      title: 'Undertaking',
      items: []
    },
    {
      sectionType: SectionType.PROPOSAL,
      title: 'Proposal',
      items: []
    },
    {
      sectionType: SectionType.ADDENDUM,
      title: 'Addenda',
      items: []
    },
    {
      sectionType: SectionType.INSTRUCTION,
      title: 'Instruction to Tenderers',
      items: []
    },
    {
      sectionType: SectionType.ANNEX,
      title: 'Annexes',
      items: []
    },
    {
      sectionType: SectionType.EXTRAS,
      title: 'Extras',
      items: []
    }
  ];

  return {
    ...contract,
    title: (contract as any).title || (contract as any).name || "Untitled Contract",
    status: (contract as any).status || 'draft',
    version: (contract as any).version || 1,
    is_deleted: (contract as any).is_deleted || false,
    sections,
    clauses: contract.clauses  // Keep for backward compatibility
  };
}

/**
 * Ensure a contract has sections (migrate if needed)
 */
export function ensureContractHasSections(contract: SavedContract | LegacyContract): SavedContract {
  if (isLegacyContract(contract)) {
    return migrateContractToSections(contract);
  }

  // If sections exist, ensure all required sections are present
  if (contract.sections && contract.sections.length > 0) {
    const sectionTypes = contract.sections.map(s => s.sectionType);
    const requiredTypes = [
      SectionType.AGREEMENT,
      SectionType.LOA,
      SectionType.CONDITIONS,
      SectionType.TENDER,
      SectionType.REPORT,
      SectionType.DRAWINGS,
      SectionType.SPECIFICATION,
      SectionType.SCHEDULE,
      SectionType.BOQ,
      SectionType.REQUIREMENTS,
      SectionType.FORMS,
      SectionType.AUTOMATION,
      SectionType.UNDERTAKING,
      SectionType.PROPOSAL,
      SectionType.ADDENDUM,
      SectionType.INSTRUCTION,
      SectionType.ANNEX,
      SectionType.EXTRAS
    ];

    const missingTypes = requiredTypes.filter(type => !sectionTypes.includes(type));

    if (missingTypes.length > 0) {
      const newSections = [...contract.sections];

      missingTypes.forEach(type => {
        let title = '';
        if (type === SectionType.AGREEMENT) title = 'Form of Agreement';
        else if (type === SectionType.LOA) title = 'Letter of Acceptance';
        else if (type === SectionType.TENDER) title = 'Tender Addenda';
        else if (type === SectionType.CONDITIONS) title = 'Conditions of Contract';
        else if (type === SectionType.REPORT) title = 'Investigation Report';
        else if (type === SectionType.DRAWINGS) title = 'Drawings';
        else if (type === SectionType.SPECIFICATION) title = 'Specifications';
        else if (type === SectionType.SCHEDULE) title = 'Schedules';
        else if (type === SectionType.BOQ) title = 'Bills of Quantities';
        else if (type === SectionType.REQUIREMENTS) title = 'Requirements';
        else if (type === SectionType.FORMS) title = 'Forms';
        else if (type === SectionType.AUTOMATION) title = 'User Guide';
        else if (type === SectionType.UNDERTAKING) title = 'Undertaking';
        else if (type === SectionType.PROPOSAL) title = 'Proposal';
        else if (type === SectionType.ANNEX) title = 'Annexes';
        else if (type === SectionType.ADDENDUM) title = 'Addenda';
        else if (type === SectionType.INSTRUCTION) title = 'Instruction to Tenderers';
        else if (type === SectionType.EXTRAS) title = 'Extras';

        newSections.push({
          sectionType: type,
          title,
          items: []
        });
      });

      // Sort sections to maintain order
      newSections.sort((a, b) => {
        return requiredTypes.indexOf(a.sectionType) - requiredTypes.indexOf(b.sectionType);
      });

      return {
        ...contract,
        sections: newSections
      };
    }

    return contract as SavedContract;
  }

  // No sections, migrate
  return migrateContractToSections(contract);
}

/**
 * Get all clauses from a contract (works with both old and new format)
 * Tokens (gc_link_tokens, pc_link_tokens) are preserved from SectionItems for hyperlink rendering.
 */
export function getAllClausesFromContract(contract: SavedContract | LegacyContract): Clause[] {
  const clauses: Clause[] = [];

  if (contract.clauses && contract.clauses.length > 0) {
    return contract.clauses;
  }

  if (contract.sections) {
    contract.sections.forEach(section => {
      section.items.forEach(item => {
        if (item.itemType === ItemType.CLAUSE) {
          const clause = sectionItemToClause(item);
          if (clause) {
            clauses.push(clause);
          }
        }
      });
    });
  }

  return clauses;
}
