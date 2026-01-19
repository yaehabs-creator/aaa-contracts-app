import React from 'react';
import { Clause } from '../types';
import { ClauseCard } from './ClauseCard';

interface GroupedClauseCardProps {
  parentClause: Clause;
  subClauses: Clause[];
  onCompare?: (clause: Clause) => void;
  onEdit?: (clause: Clause) => void;
  searchKeywords?: string[];
}

// Helper to extract parent clause number (e.g., "1.6" from "1.6(a)" or "1.6")
const getParentClauseNumber = (clauseNumber: string): string => {
  // Remove sub-clause indicators like (a), (b), etc.
  return clauseNumber.replace(/\s*\([a-z0-9]+\)\s*$/i, '').trim();
};

export const GroupedClauseCard: React.FC<GroupedClauseCardProps> = ({
  parentClause,
  subClauses,
  onCompare,
  onEdit,
  searchKeywords = []
}) => {

  return (
    <div id={`clause-${parentClause.clause_number.replace(/\s+/g, '').replace(/[()]/g, '')}`}>
      {/* Parent Clause - Full Card with sub-clauses embedded in text */}
      <ClauseCard 
        clause={parentClause} 
        onCompare={onCompare}
        onEdit={onEdit}
        searchKeywords={searchKeywords}
      />
    </div>
  );
};

// Helper function to group clauses by parent
export const groupClausesByParent = (clauses: Clause[]): Map<string, { parent: Clause; subClauses: Clause[] }> => {
  const groups = new Map<string, { parent: Clause; subClauses: Clause[] }>();
  const processed = new Set<string>();

  clauses.forEach(clause => {
    if (processed.has(clause.clause_number)) return;
    
    const parentNumber = getParentClauseNumber(clause.clause_number);
    
    // Check if this clause is a parent (no parentheses in number)
    const isParent = !clause.clause_number.match(/\([a-z0-9]+\)/i);
    
    if (isParent) {
      // This is a parent clause
      const subClauses = clauses.filter(c => {
        if (c.clause_number === clause.clause_number) return false;
        const cParentNumber = getParentClauseNumber(c.clause_number);
        return cParentNumber === parentNumber && c.clause_number !== parentNumber;
      });
      
      groups.set(clause.clause_number, {
        parent: clause,
        subClauses: subClauses.sort((a, b) => a.clause_number.localeCompare(b.clause_number))
      });
      
      processed.add(clause.clause_number);
      subClauses.forEach(sc => processed.add(sc.clause_number));
    } else {
      // This is a sub-clause, find or create parent
      const parent = clauses.find(c => {
        const cParentNumber = getParentClauseNumber(c.clause_number);
        return cParentNumber === parentNumber && c.clause_number === parentNumber;
      });
      
      if (parent && !groups.has(parent.clause_number)) {
        const subClauses = clauses.filter(c => {
          if (c.clause_number === parent.clause_number) return false;
          const cParentNumber = getParentClauseNumber(c.clause_number);
          return cParentNumber === parentNumber && c.clause_number !== parentNumber;
        });
        
        groups.set(parent.clause_number, {
          parent,
          subClauses: subClauses.sort((a, b) => a.clause_number.localeCompare(b.clause_number))
        });
        
        processed.add(parent.clause_number);
        subClauses.forEach(sc => processed.add(sc.clause_number));
      } else if (!parent) {
        // Orphaned sub-clause, treat as standalone
        groups.set(clause.clause_number, {
          parent: clause,
          subClauses: []
        });
        processed.add(clause.clause_number);
      }
    }
  });

  // Handle any remaining unprocessed clauses (standalone clauses)
  clauses.forEach(clause => {
    if (!processed.has(clause.clause_number)) {
      groups.set(clause.clause_number, {
        parent: clause,
        subClauses: []
      });
    }
  });

  return groups;
};
