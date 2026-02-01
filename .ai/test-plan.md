# SMELT Application - Test Plan

## 1. Introduction and Testing Goals

### 1.1 Purpose

This document defines the comprehensive test plan for the SMELT application - a web app that transforms audio recordings and text into structured Markdown documents through AI-powered processing.

### 1.2 Testing Goals

1. **Ensure functional correctness** - Verify all features work as specified in the PRD
2. **Validate security** - Confirm authentication, authorization, and data protection
3. **Guarantee reliability** - Ensure stable processing pipeline and error recovery
4. **Verify performance** - Confirm the system handles expected loads
5. **Validate real-time features** - Ensure WebSocket subscriptions work correctly
6. **Ensure data integrity** - Verify database operations and RLS policies

### 1.3 Quality Objectives

| Metric | Target |
|--------|--------|
| Unit test coverage | 80%+ |
| Critical path coverage | 100% |
| Integration test coverage | 70%+ |
| Zero critical/blocker bugs | Required for release |
| Mean time to detect bugs | < 24 hours |

---

## 2. Test Scope

### 2.1 In Scope

#### Backend Services
- Authentication service (register, login, logout, password reset, email verification)
- Smelt service (creation, retrieval, listing)
- Usage service (rate limiting, credit management)
- API keys service (validation, encryption, storage)
- Prompts service (CRUD, reordering, sections)
- Audio processing (validation, conversion, transcription)
- LLM integration (OpenRouter client, synthesis)
- Storage service (file upload/download)
- Real-time broadcasting (progress events, completion)

#### API Endpoints (22 total)
- Auth endpoints (8): register, login, logout, session, callback, reset-password, update-password, resend-verification, refresh
- Smelt endpoints (3): create, list, get by ID
- Prompt endpoints (4): CRUD, reorder, upload
- Prompt section endpoints (4): CRUD, reorder
- API key endpoints (2): validate/store, status
- Profile and usage endpoints (2)

#### Frontend Components
- Authentication forms
- File upload (DropZone)
- Text input (TextZone)
- Prompt selection and management
- Real-time progress display
- Results view

#### Database Operations
- Row Level Security (RLS) policies
- SECURITY DEFINER functions for anonymous access
- Transaction integrity
- Foreign key constraints

### 2.2 Out of Scope

- Third-party service internals (OpenRouter, Supabase, FFmpeg)
- Browser compatibility beyond modern evergreen browsers
- Mobile native app testing
- Load testing beyond 100 concurrent users
- Penetration testing (separate security audit)

---

## 3. Types of Tests

### 3.1 Unit Tests

**Purpose:** Test individual functions and classes in isolation

**Coverage Areas:**
| Component | File Path | Priority | Test Count |
|-----------|-----------|----------|------------|
| Auth Service | `src/lib/services/auth.service.ts` | Critical | 15-20 |
| Smelts Service | `src/lib/services/smelts.service.ts` | Critical | 15-20 |
| Usage Service | `src/lib/services/usage.service.ts` | Critical | 12-15 |
| API Keys Service | `src/lib/services/api-keys.service.ts` | High | 10-12 |
| Prompts Service | `src/lib/services/prompts.service.ts` | High | 12-15 |
| Audio Validation | `src/lib/services/audio/validation.ts` | Critical | 10-12 |
| Audio Conversion | `src/lib/services/audio/conversion.ts` | High | 8-10 |
| Transcription | `src/lib/services/audio/transcription.ts` | High | 8-10 |
| Error Classes | `src/lib/utils/errors.ts` | Medium | 8-10 |
| Zod Schemas | `src/lib/schemas/*.ts` | Medium | 15-20 |

### 3.2 Integration Tests

**Purpose:** Test interaction between components and external services

**Coverage Areas:**
| Test Suite | Description | Priority |
|------------|-------------|----------|
| Complete Smelt Flow | End-to-end processing pipeline | Critical |
| Real-time Subscription | WebSocket channel management | Critical |
| API Endpoint Flow | Request → response validation | High |
| Database Operations | Concurrent updates, transactions | High |
| Storage Operations | File upload/download cycle | Medium |
| Auth + RLS | Authentication with row-level security | Critical |

### 3.3 End-to-End Tests

**Purpose:** Validate complete user workflows through the UI

**Key Workflows:**
1. User registration → email verification → login
2. Anonymous user processing → rate limit enforcement
3. Authenticated user with API key → unlimited processing
4. Multi-file combine mode processing
5. Prompt management (create, reorder, delete)
6. API key management (add, validate, remove)

### 3.4 Performance Tests

**Purpose:** Ensure system handles expected load

**Test Scenarios:**
| Scenario | Target | Method |
|----------|--------|--------|
| API response time | < 200ms (p95) | Load test |
| File upload (25MB) | < 30s | Benchmark |
| Concurrent smelts | 20 simultaneous | Stress test |
| Database queries | < 100ms | Query analysis |
| WebSocket throughput | 1000 msg/sec | Load test |

### 3.5 Security Tests

**Purpose:** Validate security controls

**Test Areas:**
- Authentication bypass attempts
- RLS policy enforcement
- API key encryption verification
- File upload validation (path traversal, malicious content)
- Session hijacking prevention
- CSRF protection
- Rate limiting effectiveness

---

## 4. Test Scenarios for Key Functionalities

### 4.1 Authentication

#### Registration
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| AUTH-001 | Valid registration | User created, verification email sent |
| AUTH-002 | Duplicate email | 409 Conflict error |
| AUTH-003 | Invalid email format | 400 Validation error |
| AUTH-004 | Weak password | 400 Validation error |
| AUTH-005 | Rate limit exceeded | 429 Too Many Requests |

#### Login
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| AUTH-010 | Valid credentials | Session created, cookies set |
| AUTH-011 | Invalid password | 401 Unauthorized |
| AUTH-012 | Unverified email (after cutoff) | 403 Email not verified |
| AUTH-013 | Unverified email (before cutoff) | Login succeeds (grandfathered) |
| AUTH-014 | Non-existent user | 401 Unauthorized |

#### Session Management
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| AUTH-020 | Get current session | User data returned |
| AUTH-021 | Expired session | 401 Unauthorized |
| AUTH-022 | Refresh valid session | New tokens issued |
| AUTH-023 | Logout | Session invalidated |

### 4.2 Smelt Processing

#### Creation
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| SMELT-001 | Auth user, single audio file | Smelt created, processing starts |
| SMELT-002 | Auth user, multiple files | Smelt with multiple file records |
| SMELT-003 | Auth user, text input only | Smelt created, transcription skipped |
| SMELT-004 | Auth user, combine mode (2+ files) | Combined processing enabled |
| SMELT-005 | Anonymous user, single file | Smelt created via RPC |
| SMELT-006 | Anonymous user, multiple files | 403 Forbidden |
| SMELT-007 | Anonymous user, combine mode | 403 Forbidden |
| SMELT-008 | No input provided | 400 Validation error |
| SMELT-009 | Too many files (>5) | 400 Validation error |
| SMELT-010 | User at credit limit | 429 Rate limit exceeded |

#### File Validation
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| SMELT-020 | Valid MP3, WAV, M4A files | Files accepted |
| SMELT-021 | Invalid file format | 415 Unsupported Media Type |
| SMELT-022 | File too large (>25MB) | 413 Payload Too Large |
| SMELT-023 | Audio too long (>30min) | 413 Duration exceeded |
| SMELT-024 | Corrupted audio file | 400 Invalid file |
| SMELT-025 | Empty file | 400 Invalid file |

#### Processing Pipeline
| ID | Scenario | Expected Result |
|----|----------|-----------------|
| SMELT-030 | Successful processing | Status: completed, output generated |
| SMELT-031 | Transcription failure | Status: failed, error recorded |
| SMELT-032 | Synthesis failure | Status: failed, error recorded |
| SMELT-033 | Partial failure (multi-file) | Per-file status tracking |
| SMELT-034 | OpenRouter timeout | 504 Gateway Timeout |
| SMELT-035 | OpenRouter rate limit | 429 Rate limit error |

### 4.3 Real-time Updates

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| RT-001 | Subscribe to smelt channel | Connection established |
| RT-002 | Receive progress event | Percentage, stage, message |
| RT-003 | Receive completion event | Final output included |
| RT-004 | Receive error event | Error code and message |
| RT-005 | Connection drop during processing | Auto-reconnect with backoff |
| RT-006 | Multiple subscribers | All receive events |
| RT-007 | Subscribe after completion | Immediate completion event |

### 4.4 Usage and Rate Limiting

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| USAGE-001 | Anonymous user first request | Request allowed |
| USAGE-002 | Anonymous user at daily limit | 429 Daily limit exceeded |
| USAGE-003 | Anonymous user after midnight UTC | Limit reset |
| USAGE-004 | Auth user with credits | Request allowed, credit deducted |
| USAGE-005 | Auth user at weekly limit | 429 Weekly limit exceeded |
| USAGE-006 | Auth user with valid API key | Unlimited access |
| USAGE-007 | Auth user at limit, adds API key | Access restored |

### 4.5 API Key Management

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| APIKEY-001 | Valid OpenRouter key | Key encrypted and stored |
| APIKEY-002 | Invalid OpenRouter key | 401 Invalid key error |
| APIKEY-003 | Quota exhausted key | 402 Quota exhausted status |
| APIKEY-004 | Delete existing key | Key removed, status reset |
| APIKEY-005 | Get key status | Current status returned |
| APIKEY-006 | Network timeout during validation | 504 Timeout error |

### 4.6 Prompts Management

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| PROMPT-001 | List default prompts | System prompts returned |
| PROMPT-002 | List user prompts | User's custom prompts returned |
| PROMPT-003 | Create custom prompt | Prompt created with position |
| PROMPT-004 | Update prompt content | Content updated |
| PROMPT-005 | Delete prompt | Prompt removed |
| PROMPT-006 | Reorder prompts | Positions updated |
| PROMPT-007 | Access other user's prompt | 404 Not found |
| PROMPT-008 | Content exceeds 4000 chars | 400 Validation error |
| PROMPT-009 | Upload prompt from file | Prompt created from file content |
| PROMPT-010 | Upload file >10KB | 413 File too large |

---

## 5. Test Environment

### 5.1 Environment Configuration

| Environment | Purpose | Database | External Services |
|-------------|---------|----------|-------------------|
| Local Dev | Developer testing | Local Supabase | Mock services |
| CI/CD | Automated tests | Test Supabase instance | Mock services |
| Staging | Pre-release validation | Staging database | Real services (sandbox) |
| Production | Smoke tests only | Production (read-only) | Real services |

### 5.2 Test Database Setup

```sql
-- Test database initialization
-- Run migrations from supabase/migrations/
-- Seed test data for various scenarios
```

### 5.3 Environment Variables

```env
# Test Environment
SUPABASE_URL=<test-supabase-url>
SUPABASE_ANON_KEY=<test-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<test-service-role-key>
OPENROUTER_API_KEY=<test-api-key>
ENCRYPTION_KEY=<test-encryption-key>
```

### 5.4 Test Data Requirements

| Data Type | Description | Location |
|-----------|-------------|----------|
| Audio files | Valid MP3, WAV, M4A samples | `tests/fixtures/audio/` |
| Invalid files | Corrupted, oversized files | `tests/fixtures/invalid/` |
| User fixtures | Pre-configured test users | `tests/fixtures/users.json` |
| Prompt fixtures | Sample prompts | `tests/fixtures/prompts.json` |
| Mock responses | OpenRouter, Supabase mocks | `tests/mocks/` |

---

## 6. Testing Tools

### 6.1 Test Framework Stack

| Tool | Purpose | Version |
|------|---------|---------|
| Vitest | Unit & integration tests | ^2.0.0 |
| Playwright | End-to-end tests | ^1.40.0 |
| Mock Service Worker (MSW) | API mocking | ^2.0.0 |
| @testing-library/react | React component tests | ^14.0.0 |
| c8 / @vitest/coverage-v8 | Code coverage | Built-in |

### 6.2 Additional Tools

| Tool | Purpose |
|------|---------|
| supertest | HTTP request testing |
| testcontainers | Database isolation |
| faker-js | Test data generation |
| zod | Schema validation testing |

### 6.3 CI/CD Integration

```yaml
# GitHub Actions workflow
- Install dependencies
- Run database migrations
- Execute unit tests
- Execute integration tests
- Generate coverage report
- Run E2E tests (Playwright)
- Upload test artifacts
```

### 6.4 Recommended Package Additions

```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "playwright": "^1.40.0",
    "@playwright/test": "^1.40.0",
    "msw": "^2.0.0",
    "supertest": "^6.3.0",
    "@faker-js/faker": "^8.0.0"
  }
}
```

---

## 7. Test Schedule

### 7.1 Development Phase

| Activity | Frequency | Trigger |
|----------|-----------|---------|
| Unit tests | Every commit | Pre-commit hook |
| Integration tests | Every PR | CI pipeline |
| Linting | Every commit | Pre-commit hook |

### 7.2 Release Phase

| Activity | Timing | Duration |
|----------|--------|----------|
| Full regression suite | Before release | Automated |
| E2E test suite | Before release | Automated |
| Performance benchmarks | Before release | Automated |
| Security scan | Before release | Automated |
| Manual exploratory testing | Before release | 2-4 hours |

### 7.3 Test Execution Order

1. **Unit Tests** - Fast feedback (< 2 min)
2. **Integration Tests** - Service interactions (< 5 min)
3. **E2E Tests** - Full workflows (< 15 min)
4. **Performance Tests** - Load validation (on-demand)

---

## 8. Test Acceptance Criteria

### 8.1 Release Criteria

| Criterion | Requirement |
|-----------|-------------|
| Unit test pass rate | 100% |
| Integration test pass rate | 100% |
| E2E test pass rate | 100% |
| Code coverage | ≥ 80% |
| Critical bugs | 0 open |
| High priority bugs | 0 open |
| Medium priority bugs | ≤ 3 open |
| Performance benchmarks | All passing |

### 8.2 Test Case Pass/Fail Criteria

**Pass:**
- Expected result matches actual result
- No unhandled exceptions
- Response time within acceptable limits
- Data integrity maintained

**Fail:**
- Any deviation from expected result
- Unhandled exception thrown
- Response time exceeds threshold
- Data corruption or loss

### 8.3 Regression Criteria

- All previously passing tests must continue to pass
- New features must have corresponding tests
- Bug fixes must include regression tests

---

## 9. Roles and Responsibilities

### 9.1 Role Matrix

| Role | Responsibilities |
|------|------------------|
| **Developer** | Write unit tests, fix failing tests, maintain test code |
| **QA Engineer** | Write integration/E2E tests, execute test plans, report bugs |
| **Tech Lead** | Review test coverage, approve test plans, prioritize fixes |
| **DevOps** | Maintain CI/CD pipeline, test environment, infrastructure |
| **Product Owner** | Define acceptance criteria, prioritize bug fixes |

### 9.2 Test Ownership

| Component | Primary Owner | Backup |
|-----------|---------------|--------|
| Auth service tests | Backend Dev | QA |
| Smelt service tests | Backend Dev | QA |
| API endpoint tests | Backend Dev | QA |
| Frontend component tests | Frontend Dev | QA |
| E2E workflow tests | QA | Frontend Dev |
| Performance tests | DevOps | Backend Dev |

---

## 10. Bug Reporting Procedures

### 10.1 Bug Report Template

```markdown
## Bug Title
[Clear, concise description]

## Environment
- Branch/Commit:
- Environment: Local/CI/Staging
- Browser (if applicable):

## Steps to Reproduce
1.
2.
3.

## Expected Result
[What should happen]

## Actual Result
[What actually happened]

## Evidence
- Screenshots:
- Logs:
- Test output:

## Severity
- [ ] Critical - System unusable
- [ ] High - Major feature broken
- [ ] Medium - Feature partially broken
- [ ] Low - Minor issue
```

### 10.2 Severity Definitions

| Severity | Definition | Response Time |
|----------|------------|---------------|
| **Critical** | System crash, data loss, security breach | Immediate |
| **High** | Major feature unusable, no workaround | Same day |
| **Medium** | Feature degraded, workaround exists | Next sprint |
| **Low** | Cosmetic, minor inconvenience | Backlog |

### 10.3 Bug Lifecycle

```
New → Triaged → In Progress → In Review → Verified → Closed
                     ↓
                 Reopened
```

### 10.4 Bug Tracking

- **Tool:** GitHub Issues
- **Labels:** `bug`, `priority:*`, `component:*`
- **Assignment:** Based on component ownership
- **Verification:** QA verifies fix in staging before closing

---

## Appendix A: Test File Structure

```
tests/
├── unit/
│   ├── services/
│   │   ├── auth.service.test.ts
│   │   ├── smelts.service.test.ts
│   │   ├── usage.service.test.ts
│   │   ├── api-keys.service.test.ts
│   │   ├── prompts.service.test.ts
│   │   └── audio/
│   │       ├── validation.test.ts
│   │       ├── conversion.test.ts
│   │       └── transcription.test.ts
│   ├── utils/
│   │   ├── errors.test.ts
│   │   └── encryption.test.ts
│   └── schemas/
│       ├── auth.schema.test.ts
│       ├── smelts.schema.test.ts
│       └── prompts.schema.test.ts
├── integration/
│   ├── api/
│   │   ├── auth.api.test.ts
│   │   ├── smelts.api.test.ts
│   │   ├── prompts.api.test.ts
│   │   └── api-keys.api.test.ts
│   ├── database/
│   │   ├── rls.test.ts
│   │   └── transactions.test.ts
│   └── realtime/
│       └── subscription.test.ts
├── e2e/
│   ├── auth.spec.ts
│   ├── processing.spec.ts
│   ├── prompts.spec.ts
│   └── api-keys.spec.ts
├── fixtures/
│   ├── audio/
│   ├── invalid/
│   ├── users.json
│   └── prompts.json
├── mocks/
│   ├── openrouter.ts
│   ├── supabase.ts
│   └── handlers.ts
└── setup/
    ├── vitest.setup.ts
    └── playwright.setup.ts
```

---

## Appendix B: Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.d.ts'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    setupFiles: ['tests/setup/vitest.setup.ts']
  }
});
```

---

## Appendix C: Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

*Document Version: 1.0*
*Last Updated: 2026-02-01*
*Author: QA Engineering Team*
