# Design: vimcore/erp Bootstrap Monorepo

## Technical Approach

Monorepo-first: green pnpm/Turbo toolchain with Vitest before feature code (config rule), then four vertical slices — `identity-access`, `company-onboarding`, `dashboard-shell`, `desktop-access-theme` — as feature-first clean architecture in `apps/web` (React) and `apps/api` (Express 5 + Drizzle + Zod). PostgreSQL via Docker Compose; web dev on host. Shell layout follows uploaded desktop-ERP references; no Lazyweb report fabricated.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Orchestrator | pnpm + Turbo | Nx, app-first | User intent; test runner before features |
| Shared packages | `tsconfig` + `eslint-config` only | ui/types/schemas | No premature abstraction |
| State split | TanStack Query = server, Zustand = client | Server data in Zustand | Skill rule |
| HTTP | Typed `HttpClient` over native `fetch` | Axios | Skill ban; composable middleware, DI |
| Routing | React Router + guard routes | TanStack Router | Mature guard model on Vite |
| AuthN | Opaque session cookie + `sessions` table, argon2id | JWT, bcrypt | Revocation; no token bloat |
| RBAC | `memberships(user, company, role)` + `requireAuth`/`requireRole` | Scattered flags | One join; spec's 3 roles |
| Seed admin | Env-gated; prod boot refuses | Always-on admin | Spec: prod MUST reject |
| Migrations | `drizzle-kit generate` + `migrate`, persistent volume | `db push` | Ordered, reviewable SQL |
| Theming | CSS vars per palette, `data-palette`; per-user + company default | Dark/light toggle | Spec bans toggle |
| Desktop gate | Client detection (pointer/media + UA) → blocking page | Server UA as security | UX-only boundary |
| Observability | pino, request-id, `/health`, `/metrics`, `audit_events`, `notifications` | Ad-hoc console | Admin signals spec |
| CI | One Actions gate: lint, typecheck, unit, integration (Postgres), build, Playwright, 80% coverage (auth/onboarding/dashboard), audit, gitleaks | Split pipelines | Single green gate per spec |

## Data Flow

    web: component -> query/mutation -> use case -> repo port -> HttpClient(fetch, cookie)
    api: router -> requireAuth -> requireRole -> controller(Zod) -> use case -> repo -> Drizzle -> Postgres
                                              └-> audit_events / notifications

Onboarding (most complex flow):

    Zustand draft (per step) -finish-> POST /companies (Zod)
        └-> transaction: company + profile + branches[] + membership(owner)
        └-> notification(platform-admin, company.registered) + audit_event
    <- 201 { companyId } -> invalidate queries -> dashboard shell

Palette: onboarding or preferences -> `PATCH /me/preferences`; applied via `data-palette`; no toggle.

## File Changes

| Area | Action | Count | Description |
|---|---|---|---|
| Root (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, eslint/prettier) + `packages/{tsconfig,eslint-config}` | Create | ~15 | Toolchain + gates; shared config only |
| `.github/workflows/ci.yml`, `docker-compose.yml` | Create | 2 | CI/security; Postgres (+optional api) |
| `apps/web` | Create | ~45 | Features `auth`, `onboarding`, `dashboard`, `theme`; `shared/lib/http` |
| `apps/api` + `src/db/migrations` | Create | ~49 | Features `identity`, `companies`, `notifications`, `admin`; `shared/*`; Drizzle SQL |
| `openspec/config.yaml` | Modify | 1 | Flip `strict_tdd` + commands post-bootstrap |

~111 new, 1 modified, 0 deleted. Exceeds the 800-line review budget — `sdd-tasks` MUST forecast chained-PR slices (ask-always).

## Interfaces / Contracts

- `POST /auth/login {identifier, password}` → `204` + `Set-Cookie`; `401` generic (no enumeration). `GET /auth/me` → `{ user, memberships: [{ companyId, role }] }`; `POST /auth/logout`.
- `POST /companies` (atomic tenant create); `GET /admin/companies/summary`, `GET /admin/notifications` (platform-admin); `PATCH /me/preferences { paletteId }`.
- Error envelope `{ error: { code, message, requestId } }` — never Drizzle internals.
- `HttpClient` (skill contract) injected into feature repositories.
- Tables: `users`, `sessions`, `companies`, `company_profiles` (legal/tax id, services, address, contact), `memberships(role enum)`, `branches` (structural), `theme_preferences`, `notifications`, `audit_events`.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | Domain rules, use cases, Zod schemas, guard/palette logic | Vitest (`pnpm -r test`) |
| Integration | Auth/RBAC/onboarding/admin routes + repositories | Vitest + Compose Postgres |
| E2E | Login, onboarding, dashboard, palette, mobile-block | Playwright desktop + mobile emulation |
| Coverage | 80% lines on auth/onboarding/dashboard APIs | Vitest coverage in CI |

## Threat Matrix

Trigger: web routing + CI process integration. Rows target VCS/shell-classification boundaries:

| Boundary | Applicability | Reason |
|---|---|---|
| Documentation-like paths | N/A | No file classification or content execution; pinned CI commands only |
| Git repository selection | N/A | No git automation; event SHA only |
| Commit state | N/A | No automated commits |
| Push state | N/A | No automated pushes |
| PR commands | N/A | No PR automation; chained PRs are human-run |

Applicable boundaries (propagate to tasks and RED tests unchanged):

1. **Route guards (auth/RBAC).** Safe: API authoritative — 401 unauthenticated, 403 wrong role; client guards UX-only. RED: Playwright unauthenticated `/dashboard` → login redirect; integration `company-user` → `GET /admin/*` ⇒ 403.
2. **Desktop-only gate.** Safe: mobile/tablet UA or coarse pointer → blocking page; API never varies by device. RED: Playwright mobile emulation → blocking page.
3. **CI process integration.** Safe: `permissions: contents: read`, `--frozen-lockfile`, no `pull_request_target` with secrets. RED: CI-lint test parsing workflow YAML asserting restricted permissions, no secret-bearing PR steps.
4. **Seed-admin boundary.** Safe: production boot refuses `SEED_ADMIN_ENABLED`; seeded creds rejected. RED: boot test `NODE_ENV=production` ⇒ refusal; prod seeded login ⇒ 401.

## Migration / Rollout

No migration required — greenfield. Rollback = revert files, drop Compose volumes (pre-production data only).

## Open Questions

- [ ] Final five palettes (user references are direction; tokens confirmed at apply).
- [ ] Session store DB-backed now; Redis only if load demands.
- [ ] Exact branch fields at onboarding (structure only).
- [ ] React Compiler enablement timing.
