# Architecture Documentation

## Overview

This application follows Clean Architecture principles with a feature-oriented structure.

## Architecture Layers

### Domain Layer
- **Location**: `src/domain/` and `src/features/*/domain/`
- **Purpose**: Pure business logic, no external dependencies
- **Contains**: Entities, Value Objects, Repository Interfaces, Use Cases
- **Rules**: No imports from infrastructure, application, or transport layers

### Application Layer
- **Location**: `src/features/*/application/`
- **Purpose**: Application-specific business logic, orchestrates domain entities
- **Contains**: Services, DTOs, Application Use Cases
- **Rules**: Can import from domain, cannot import from infrastructure or transport

### Infrastructure Layer
- **Location**: `src/infrastructure/` and `src/features/*/infrastructure/`
- **Purpose**: External concerns (database, APIs, file system)
- **Contains**: Repository Implementations, External Service Clients
- **Rules**: Implements domain interfaces, can import from domain

### Transport Layer
- **Location**: `src/features/*/transport/`
- **Purpose**: User interface and API endpoints
- **Contains**: React Components, API Handlers
- **Rules**: Can import from application and domain, cannot import from infrastructure directly

## Feature Structure

Each feature follows this structure:

```
feature-name/
  domain/
    entities/          # Domain entities
    repositories/      # Repository interfaces
    use-cases/         # Business use cases
  application/
    services/          # Application services
    dto/              # Data Transfer Objects
  infrastructure/
    repositories/     # Repository implementations
  transport/
    components/       # UI components
```

## Dependency Rules

```
Transport → Application → Domain
Infrastructure → Domain
```

**No circular dependencies allowed.**

## Shared Code

Code shared across features goes in `src/shared/`:
- `shared/domain/` - Shared domain concepts
- `shared/infrastructure/` - Shared infrastructure (logging, errors, DI)
- `shared/ui/` - Shared UI components

## Testing Strategy

- **Domain**: Unit tests for entities and use cases
- **Application**: Unit tests for services, integration tests with mocked repositories
- **Infrastructure**: Integration tests with test database
- **Transport**: Component tests with React Testing Library

## Error Handling

All errors are handled through:
- `AppError` class for structured errors
- `ErrorHandler` for error normalization
- `ErrorTracker` for error monitoring

## Logging

Structured logging via `Logger` service:
- Debug: Development only
- Info: General information
- Warn: Warnings
- Error: Errors with context

## Metrics

Metrics collected via `Metrics` service:
- Counters: Incrementing metrics
- Gauges: Current values
- Histograms: Distributions
- Timings: Duration measurements

## Repository Pattern

All data access goes through repository interfaces:
- Domain defines interfaces (`IContractRepository`, `IUserRepository`)
- Infrastructure implements interfaces (`SupabaseContractRepository`, `SupabaseUserRepository`)
- Dependency injection via `ServiceContainer`

## DTOs

All service boundaries use DTOs:
- Separate external representation from domain entities
- Validation at boundaries
- Mappers convert between DTOs and entities

## Development Guidelines

1. **New Features**: Create feature folder with domain, application, infrastructure, transport layers
2. **Shared Code**: Put in `shared/` if used by multiple features
3. **Domain First**: Start with domain entities and interfaces
4. **Test Coverage**: Aim for 80% domain coverage, 60% overall
5. **Error Handling**: Always use `AppError` and `ErrorHandler`
6. **Logging**: Use structured `Logger` instead of `console.log`
