# Quick Reference: New Architecture

## Import Paths

### Repositories
```typescript
import { ServiceContainer } from '@/shared/infrastructure/di';
import { IContractRepository } from '@/domain/contracts/repositories/IContractRepository';
```

### Error Handling
```typescript
import { AppErrors, ErrorHandler } from '@/shared/application/errors';
```

### Logging
```typescript
import { logger } from '@/shared/infrastructure/observability';
```

### Metrics
```typescript
import { metrics } from '@/shared/infrastructure/observability';
```

### Validation
```typescript
import { validateEmail, validateCreateUserDTO } from '@/shared/application/validation';
```

### DTOs
```typescript
import { CreateUserDTO, UserResponseDTO } from '@/shared/application/dto';
```

## Common Tasks

### Initialize Service Container
```typescript
import { ServiceContainer } from '@/shared/infrastructure/di/ServiceContainer';
import { supabase } from '@/supabase/config';

const container = new ServiceContainer(supabase!);
```

### Save Contract
```typescript
const contractRepo = container.getContractRepository();
await contractRepo.save(contract);
```

### Find Contract
```typescript
const contract = await contractRepo.findById('contract-id');
```

### Find All Contracts
```typescript
const contracts = await contractRepo.findAll();
```

### Delete Contract
```typescript
await contractRepo.delete('contract-id');
```

### Log Info
```typescript
logger.info('Message', { context: 'value' });
```

### Log Error
```typescript
logger.error('Message', error, { context: 'value' });
```

### Handle Error
```typescript
try {
  // operation
} catch (error) {
  const appError = ErrorHandler.handle(error, { operation: 'name' });
  throw appError;
}
```

### Throw Error
```typescript
throw AppErrors.notFound('Contract', 'id');
throw AppErrors.validationError('Invalid input');
throw AppErrors.unauthorized('Not logged in');
```

### Record Metric
```typescript
metrics.increment('counter.name');
metrics.timing('operation.name', duration);
metrics.gauge('value.name', value);
```

### Validate Input
```typescript
validateEmail(email);
validatePassword(password);
validateCreateUserDTO(userDTO);
```

## Error Codes

- `UNAUTHORIZED` - Not authenticated
- `FORBIDDEN` - No permission
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid input
- `DATABASE_ERROR` - Database operation failed
- `EXTERNAL_SERVICE_ERROR` - External API error
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `TIMEOUT` - Operation timed out
- `INTERNAL_ERROR` - Unexpected error

## Log Levels

- `DEBUG` - Development only
- `INFO` - General information
- `WARN` - Warnings
- `ERROR` - Errors

## Testing

### Mock Repository
```typescript
const mockRepo = {
  save: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn(),
  delete: vi.fn(),
  exists: vi.fn(),
};

container.setContractRepository(mockRepo);
```

### Test Domain Entity
```typescript
import { Contract } from '@/domain/contracts/entities/Contract';

const contract = new Contract(/* ... */);
expect(contract.hasConflicts()).toBe(true);
```

## File Locations

- **Domain Entities**: `src/domain/*/entities/`
- **Repository Interfaces**: `src/domain/*/repositories/`
- **Repository Implementations**: `src/infrastructure/*/repositories/`
- **Error Handling**: `src/shared/application/errors/`
- **Logging**: `src/shared/infrastructure/observability/`
- **DTOs**: `src/shared/application/dto/`
- **Validators**: `src/shared/application/validation/`

## See Also

- `MIGRATION_GUIDE.md` - Detailed migration steps
- `examples/` - Code examples
- `docs/ARCHITECTURE.md` - Architecture documentation
