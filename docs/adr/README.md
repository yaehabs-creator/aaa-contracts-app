# Architecture Decision Records (ADR)

This directory contains Architecture Decision Records (ADRs) documenting important architectural decisions made for this project.

## What is an ADR?

An ADR is a document that captures an important architectural decision made along with its context and consequences. ADRs help:
- Document why decisions were made
- Provide context for future developers
- Track architectural evolution
- Avoid revisiting settled decisions

## ADR Format

Each ADR follows this structure:
- **Status**: Proposed, Accepted, Rejected, Deprecated, Superseded
- **Context**: The situation that led to this decision
- **Decision**: The architectural decision
- **Consequences**: Positive and negative outcomes

## Current ADRs

- [ADR 001: Feature-Oriented Structure](./001-feature-oriented-structure.md)

## How to Create an ADR

1. Create a new file `NNN-title.md` where NNN is the next number
2. Use the template below
3. Update this README with the new ADR

## Template

```markdown
# ADR NNN: Title

## Status
Proposed

## Context
[Describe the context and problem]

## Decision
[Describe the decision]

## Consequences

### Positive
- [Positive outcome 1]
- [Positive outcome 2]

### Negative
- [Negative outcome 1]
- [Negative outcome 2]

## Notes
[Any additional notes]
```
