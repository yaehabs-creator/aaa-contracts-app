import { SavedContract, LegacyContract, ContractSection, SectionItem, SectionType, ItemType, Clause } from '../types';

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
    chapter: clause.chapter
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
    chapter: item.chapter
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
          sectionType: SectionType.GENERAL,
          title: 'General Conditions',
          items: []
        },
        {
          sectionType: SectionType.PARTICULAR,
          title: 'Particular Conditions',
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
    if (clause.condition_type === 'General') {
      generalClauses.push(clause);
    } else if (clause.condition_type === 'Particular') {
      particularClauses.push(clause);
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
      sectionType: SectionType.GENERAL,
      title: 'General Conditions',
      items: generalItems
    },
    {
      sectionType: SectionType.PARTICULAR,
      title: 'Particular Conditions',
      items: particularItems
    }
  ];

  return {
    ...contract,
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
  
  // If sections exist, ensure all 4 sections are present
  if (contract.sections && contract.sections.length > 0) {
    const sectionTypes = contract.sections.map(s => s.sectionType);
    const requiredTypes = [SectionType.AGREEMENT, SectionType.LOA, SectionType.GENERAL, SectionType.PARTICULAR];
    
    const missingTypes = requiredTypes.filter(type => !sectionTypes.includes(type));
    
    if (missingTypes.length > 0) {
      const newSections = [...contract.sections];
      
      missingTypes.forEach(type => {
        let title = '';
        if (type === SectionType.AGREEMENT) title = 'Form of Agreement';
        else if (type === SectionType.LOA) title = 'Letter of Acceptance';
        else if (type === SectionType.GENERAL) title = 'General Conditions';
        else if (type === SectionType.PARTICULAR) title = 'Particular Conditions';
        
        newSections.push({
          sectionType: type,
          title,
          items: []
        });
      });
      
      // Sort sections to maintain order: AGREEMENT, LOA, GENERAL, PARTICULAR
      newSections.sort((a, b) => {
        const order = [SectionType.AGREEMENT, SectionType.LOA, SectionType.GENERAL, SectionType.PARTICULAR];
        return order.indexOf(a.sectionType) - order.indexOf(b.sectionType);
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
 */
export function getAllClausesFromContract(contract: SavedContract | LegacyContract): Clause[] {
  if (contract.clauses && contract.clauses.length > 0) {
    return contract.clauses;
  }
  
  if (contract.sections) {
    const clauses: Clause[] = [];
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
    return clauses;
  }
  
  return [];
}
