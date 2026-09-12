# Test-Driven Development (Local Copy)

Source: /Users/ian.huang/aiProjects/LRP/.agents/skills/tdd/SKILL.md

TDD is the red -> green loop.
- Tests verify behavior through public interfaces, not implementation details.
- Test at pre-agreed seams (the public boundary: E2E user flows, HTTP APIs, opaque component interaction).
- Anti-patterns to avoid:
  - Implementation-coupled
  - Tautological assertions
  - Facade / mock-only tests
- Expected values must come from independent source of truth (ORIGINAL_REQUEST.md, TEST_INFRA.md, domain logic).
