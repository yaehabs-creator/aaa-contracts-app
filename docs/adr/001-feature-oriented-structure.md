# ADR 001: Feature-Oriented Structure

## Status
Accepted

## Context
The application currently uses a technical layer-based structure:
```
src/
  components/
  services/
  types/
```

This structure leads to:
- Tight coupling between features
- Difficult to locate feature-specific code
- Hard to test features in isolation
- Difficult to scale as features grow

## Decision
We will reorganize the codebase into a feature-oriented structure following Clean Architecture principles:

```
src/
  features/
    contracts/
      domain/
        entities/
        repositories/
        use-cases/
      application/
        services/
        dto/
      infrastructure/
        repositories/
      transport/
        components/
    users/
      domain/
      application/
      infrastructure/
      transport/
    ai-analysis/
      domain/
      application/
      infrastructure/
      transport/
    ocr/
      domain/
      application/
      infrastructure/
      transport/
  shared/
    domain/
    infrastructure/
    ui/
```

## Consequences

### Positive
- Clear feature boundaries
- Easier to locate feature code
- Better testability (features can be tested in isolation)
- Easier to scale (new features don't affect existing ones)
- Aligns with Clean Architecture principles

### Negative
- Requires significant refactoring
- Initial learning curve for developers
- More files/folders to navigate

## Migration Strategy
1. Start with contracts feature (highest value)
2. Create feature folder structure
3. Move related code incrementally
4. Update imports progressively
5. Keep backward compatibility during migration

## Notes
- Domain layer has no external dependencies
- Infrastructure layer implements domain interfaces
- Transport layer (UI) depends on application layer
- Shared code goes in `shared/` folder
