# Quest Keeper AI - TDD Refactoring Plan

**Status:** IN PROGRESS  
**Last Updated:** December 6, 2025  
**Phase:** 1 - Test Infrastructure ✅ COMPLETE

---

## Goal

Establish a robust TDD workflow for the Quest Keeper AI frontend, ensuring all new code is test-driven and systematically covering existing logic.

---

## Current State Summary

| Layer | Files | Tests | Notes |
|-------|-------|-------|-------|
| **Stores** | 7 | 0 | `partyStore` (837 LOC), `gameStateStore` (732 LOC) are largest |
| **Utils** | 4 | **46 ✅** | `mcpUtils` + `gridHelpers` now fully tested |
| **Services** | 3+ | 0 | `LLMService` (433 LOC), `mcpClient` (361 LOC) |
| **Hooks** | 3+ | 0 | Small, pure logic hooks |
| **Components** | 44+ | 0 | 9 subdirectories |

**Backend Reference:** `rpg-mcp` uses Vitest with 95+ test files (851 tests passing). We use the same stack for consistency.

---

## Implementation Status

### ✅ Phase 1: Test Infrastructure Setup (COMPLETE)

| File | Status | Description |
|------|--------|-------------|
| `vitest.config.ts` | ✅ Created | Vitest config for React + JSDOM environment |
| `package.json` | ✅ Updated | Added test scripts and devDependencies |
| `src/test/setup.ts` | ✅ Created | Global test setup with Tauri API mocks |
| `src/test/mocks/mcpClient.ts` | ✅ Created | Mock MCP client with test helpers |
| `src/test/mocks/tauriApis.ts` | ✅ Created | Mock Tauri shell/fs APIs |

**New npm scripts:**
```bash
npm test           # Run all tests once
npm run test:watch # Watch mode for TDD
npm run test:ui    # Visual test UI
npm run test:coverage # Coverage report
```

**Dependencies added:**
- `vitest` ^2.1.8
- `@testing-library/react` ^16.1.0
- `@testing-library/jest-dom` ^6.6.3
- `jsdom` ^25.0.1
- `@vitest/coverage-v8` ^2.1.8
- `@vitest/ui` ^2.1.8

---

### ✅ Phase 2: Priority TDD Targets - Pure Logic First (IN PROGRESS)

| Priority | File | Status | Tests | Notes |
|----------|------|--------|-------|-------|
| 🔴 1 | `src/utils/mcpUtils.ts` | ✅ DONE | 28 | Pure functions fully tested |
| 🔴 2 | `src/utils/gridHelpers.ts` | ✅ DONE | 18 | Pure math fully tested |
| 🟡 3 | `src/utils/toolResponseFormatter.ts` | ⏳ TODO | - | Large formatter - add tests as touched |
| 🟡 4 | `src/stores/partyStore.ts` | ⏳ TODO | - | Core state logic, needs mock MCP |
| 🟢 5 | `src/services/llm/LLMService.ts` | ⏳ TODO | - | Requires provider mocks |

---

### Phase 3: Component Testing Strategy (PLANNED)

Use `@testing-library/react` for component tests. Structure:

```
src/
├── components/
│   └── party/
│       ├── PartyPanel.tsx
│       └── PartyPanel.test.tsx  # Co-located test
├── stores/
│   ├── partyStore.ts
│   └── partyStore.test.ts
└── test/
    ├── setup.ts
    └── mocks/
        ├── mcpClient.ts
        └── tauriApis.ts
```

---

### Phase 4: TDD Process Going Forward

For all new code:
1. Write failing test first → `npm run test:watch`
2. Implement minimum code to pass
3. Refactor with confidence
4. Commit with test + implementation

---

## Cleanup Targets

| Path | Action | Reason |
|------|--------|--------|
| `node-wrapper/` | DELETE | Legacy Node.js wrapper, unused |
| `rpg-mcp-loader.js` | DELETE | Obsolete loader script |
| `_deprecated/` | ARCHIVE | Contains old binaries/DBs - confirm before deleting |

---

## Test Coverage Goals

| Milestone | Target | Current |
|-----------|--------|---------|
| Phase 1 | Infrastructure ready | ✅ 100% |
| Phase 2 | Utils >80% coverage | ~60% (2/4 files) |
| Phase 3 | Stores >70% coverage | 0% |
| Phase 4 | Services >60% coverage | 0% |
| Phase 5 | Components >50% coverage | 0% |

---

## Verification Commands

```bash
# After changes, verify:
npm test           # Should find tests and pass
npm run test:coverage  # Should show coverage report

# Development workflow:
npm run test:watch # Keep running during development
```

---

## Files Created This Session

1. ✅ `vitest.config.ts` - Test runner config
2. ✅ `src/test/setup.ts` - Global test setup
3. ✅ `src/test/mocks/mcpClient.ts` - Mock MCP client
4. ✅ `src/test/mocks/tauriApis.ts` - Mock Tauri shell/fs
5. ✅ `src/utils/mcpUtils.test.ts` - 28 tests for MCP utilities
6. ✅ `src/utils/gridHelpers.test.ts` - 18 tests for grid math

---

## Test Results Summary

```
Test Files  2 passed (2)
Tests       46 passed (46)
Duration    3.97s
```

### mcpUtils.test.ts (28 tests)
- ✅ parseMcpResponse - 8 tests
- ✅ isErrorResponse - 4 tests  
- ✅ getErrorMessage - 5 tests
- ✅ executeBatchToolCalls - 4 tests
- ✅ debounce - 3 tests
- ✅ throttle - 4 tests

### gridHelpers.test.ts (18 tests)
- ✅ CREATURE_SIZE_MAP - 2 tests
- ✅ getSnappingOffset - 6 tests
- ✅ calculateGridPosition - 8 tests
- ✅ Integration tests - 2 tests

---

## Next Actions

### Immediate (This Week)
1. [ ] Add tests for `toolResponseFormatter.ts` (high LOC, complex parsing)
2. [ ] Add tests for `partyStore.ts` (core game state)
3. [ ] Delete legacy `node-wrapper/` and `rpg-mcp-loader.js`

### Next Week
1. [ ] Add tests for `gameStateStore.ts`
2. [ ] Add tests for `combatStore.ts`
3. [ ] Add tests for `mcpClient.ts` service

---

## Document History

| Date | Version | Changes |
|------|---------|---------|
| Dec 6, 2025 | 1.0 | Initial plan + Phase 1 complete |
