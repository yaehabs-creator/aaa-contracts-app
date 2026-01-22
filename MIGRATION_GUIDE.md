# Migration Guide: Adopting the New Architecture

This guide helps you migrate existing code to use the new Clean Architecture structure.

## Quick Start

### 1. Using Repositories Instead of Direct Services

**Before:**
```typescript
import { saveContractToSupabase } from './services/supabaseService';

await saveContractToSupabase(contract);
```

**After:**
```typescript
import { ServiceContainer } from './shared/infrastructure/di/ServiceContainer';
import { supabase } from './supabase/config';

const container = new ServiceContainer(supabase!);
const contractRepo = container.getContractRepository();
await contractRepo.save(contract);
```

### 2. Using Structured Logging

**Before:**
```typescript
console.log('Saving contract:', contractId);
console.error('Error saving contract:', error);
```

**After:**
```typescript
import { logger } from './shared/infrastructure/observability/Logger';

logger.info('Saving contract', { contractId });
logger.error('Error saving contract', error, { contractId });
```

### 3. Using Error Handling

**Before:**
```typescript
try {
  // operation
} catch (error) {
  throw new Error('Failed to save contract');
}
```

**After:**
```typescript
import { ErrorHandler, AppErrors } from './shared/application/errors';

try {
  // operation
} catch (error) {
  const appError = ErrorHandler.handle(error, { operation: 'saveContract' });
  throw appError;
}
```

## Step-by-Step Migration

### Step 1: Replace Direct Service Calls

1. Find all imports of `supabaseService.ts` or `userService.ts`
2. Replace with repository pattern using `ServiceContainer`
3. Update function calls to use repository methods

### Step 2: Replace Console Logging

1. Find all `console.log`, `console.error`, `console.warn`
2. Replace with `logger.info`, `logger.error`, `logger.warn`
3. Add context objects with relevant information

### Step 3: Replace Error Handling

1. Find all `throw new Error(...)` statements
2. Replace with `AppErrors` helper functions or `ErrorHandler.handle()`
3. Add error context where appropriate

### Step 4: Add Validation

1. Identify service boundaries (functions that accept user input)
2. Add validation using validators from `shared/application/validation`
3. Validate DTOs before processing

## Common Patterns

### Pattern 1: Service Function Migration

**Before:**
```typescript
export const saveContract = async (contract: SavedContract) => {
  if (!supabase) throw new Error('Supabase not initialized');
  console.log('Saving contract:', contract.id);
  
  try {
    await supabase.from('contracts').upsert(contract);
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Failed to save');
  }
};
```

**After:**
```typescript
import { ServiceContainer } from '../shared/infrastructure/di/ServiceContainer';
import { logger } from '../shared/infrastructure/observability/Logger';
import { ErrorHandler } from '../shared/application/errors';
import { Contract } from '../domain/contracts/entities/Contract';

export const saveContract = async (
  contract: Contract,
  container: ServiceContainer
) => {
  const contractRepo = container.getContractRepository();
  logger.startOperation('saveContract', { contractId: contract.id });
  
  try {
    await contractRepo.save(contract);
    logger.endOperation('saveContract', 0, { contractId: contract.id });
  } catch (error) {
    const appError = ErrorHandler.handle(error, {
      operation: 'saveContract',
      contractId: contract.id,
    });
    logger.operationError('saveContract', appError.cause || appError, {
      contractId: contract.id,
    });
    throw appError;
  }
};
```

### Pattern 2: Component Migration

**Before:**
```typescript
const handleSave = async () => {
  try {
    await saveContractToSupabase(contract);
    setSuccess('Contract saved!');
  } catch (error) {
    setError(error.message);
  }
};
```

**After:**
```typescript
import { ServiceContainer } from '../shared/infrastructure/di/ServiceContainer';
import { ErrorHandler } from '../shared/application/errors';

const container = new ServiceContainer(supabase!);

const handleSave = async () => {
  try {
    const contractRepo = container.getContractRepository();
    await contractRepo.save(contract);
    setSuccess('Contract saved!');
  } catch (error) {
    const appError = ErrorHandler.handle(error);
    setError(ErrorHandler.getUserMessage(appError));
  }
};
```

## Testing Migration

### Before
```typescript
// Hard to test - depends on Supabase
test('saves contract', async () => {
  await saveContractToSupabase(mockContract);
  // Need real Supabase instance
});
```

### After
```typescript
// Easy to test - mock repository
test('saves contract', async () => {
  const mockRepo = {
    save: vi.fn(),
  };
  const container = new ServiceContainer(supabase!);
  container.setContractRepository(mockRepo);
  
  await saveContract(contract, container);
  expect(mockRepo.save).toHaveBeenCalledWith(contract);
});
```

## Benefits of Migration

1. **Testability**: Easy to mock repositories for testing
2. **Maintainability**: Clear separation of concerns
3. **Observability**: Structured logging and metrics
4. **Error Handling**: Consistent error handling across the app
5. **Type Safety**: Strong typing with domain entities

## Backward Compatibility

- Old service functions still work
- New code should use new architecture
- Gradual migration is recommended
- Both can coexist during transition

## Need Help?

- See `examples/` folder for usage examples
- Check `docs/ARCHITECTURE.md` for architecture details
- Review `ARCHITECTURE_IMPROVEMENTS_SUMMARY.md` for overview
