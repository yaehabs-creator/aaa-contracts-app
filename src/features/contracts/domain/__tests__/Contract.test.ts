import { describe, it, expect } from 'vitest';
import { Contract, ContractSection, SectionType, ItemType } from '../entities/Contract';
import { Clause } from '../entities/Clause';

describe('Contract', () => {
  describe('getAllClauses', () => {
    it('should return clauses from clauses array when available', () => {
      const clauses = [
        new Clause('1', 'Test Clause', 'General', 'Test text'),
      ];
      
      const contract = new Contract(
        'test-id',
        'Test Contract',
        Date.now(),
        {
          totalClauses: 1,
          generalCount: 1,
          particularCount: 0,
          highRiskCount: 0,
          conflictCount: 0,
        },
        [],
        clauses
      );

      expect(contract.getAllClauses()).toHaveLength(1);
      expect(contract.getAllClauses()[0].clauseNumber).toBe('1');
    });

    it('should return empty array when no clauses', () => {
      const contract = new Contract(
        'test-id',
        'Test Contract',
        Date.now(),
        {
          totalClauses: 0,
          generalCount: 0,
          particularCount: 0,
          highRiskCount: 0,
          conflictCount: 0,
        }
      );

      expect(contract.getAllClauses()).toHaveLength(0);
    });
  });

  describe('hasConflicts', () => {
    it('should return true when conflictCount > 0', () => {
      const contract = new Contract(
        'test-id',
        'Test Contract',
        Date.now(),
        {
          totalClauses: 1,
          generalCount: 1,
          particularCount: 0,
          highRiskCount: 0,
          conflictCount: 1,
        }
      );

      expect(contract.hasConflicts()).toBe(true);
    });

    it('should return false when conflictCount is 0', () => {
      const contract = new Contract(
        'test-id',
        'Test Contract',
        Date.now(),
        {
          totalClauses: 1,
          generalCount: 1,
          particularCount: 0,
          highRiskCount: 0,
          conflictCount: 0,
        }
      );

      expect(contract.hasConflicts()).toBe(false);
    });
  });

  describe('isHighRisk', () => {
    it('should return true when highRiskCount > 0', () => {
      const contract = new Contract(
        'test-id',
        'Test Contract',
        Date.now(),
        {
          totalClauses: 1,
          generalCount: 1,
          particularCount: 0,
          highRiskCount: 1,
          conflictCount: 0,
        }
      );

      expect(contract.isHighRisk()).toBe(true);
    });

    it('should return false when highRiskCount is 0', () => {
      const contract = new Contract(
        'test-id',
        'Test Contract',
        Date.now(),
        {
          totalClauses: 1,
          generalCount: 1,
          particularCount: 0,
          highRiskCount: 0,
          conflictCount: 0,
        }
      );

      expect(contract.isHighRisk()).toBe(false);
    });
  });
});

describe('Clause', () => {
  describe('hasConflicts', () => {
    it('should return true when comparison has conflicts', () => {
      const clause = new Clause(
        '1',
        'Test Clause',
        'General',
        'Test text',
        undefined,
        undefined,
        [
          {
            type: 'CHANGED_WORDING',
            color: 'orange',
            excerpt_general: 'General text',
            excerpt_particular: 'Particular text',
            comment: 'Changed',
          },
        ]
      );

      expect(clause.hasConflicts()).toBe(true);
    });

    it('should return false when no conflicts', () => {
      const clause = new Clause(
        '1',
        'Test Clause',
        'General',
        'Test text'
      );

      expect(clause.hasConflicts()).toBe(false);
    });
  });

  describe('isTimeSensitive', () => {
    it('should return true when has time frames', () => {
      const clause = new Clause(
        '1',
        'Test Clause',
        'General',
        'Test text',
        undefined,
        undefined,
        [],
        true,
        [
          {
            original_phrase: '30 days',
            type: 'NOTICE_PERIOD',
            applies_to: 'Contractor',
            short_explanation: '30 day notice',
          },
        ]
      );

      expect(clause.isTimeSensitive()).toBe(true);
    });

    it('should return false when no time frames', () => {
      const clause = new Clause(
        '1',
        'Test Clause',
        'General',
        'Test text'
      );

      expect(clause.isTimeSensitive()).toBe(false);
    });
  });

  describe('hasFinancialImplications', () => {
    it('should return true when has financial assets', () => {
      const clause = new Clause(
        '1',
        'Test Clause',
        'General',
        'Test text',
        undefined,
        undefined,
        [],
        false,
        [],
        [
          {
            source: 'GC',
            raw_text: '$1000',
            type: 'payment_entitlement',
            payer: 'Employer',
            payee: 'Contractor',
            amount: 1000,
            currency_or_basis: 'lump_sum',
            condition: 'Payment',
          },
        ]
      );

      expect(clause.hasFinancialImplications()).toBe(true);
    });

    it('should return false when no financial assets', () => {
      const clause = new Clause(
        '1',
        'Test Clause',
        'General',
        'Test text'
      );

      expect(clause.hasFinancialImplications()).toBe(false);
    });
  });
});
