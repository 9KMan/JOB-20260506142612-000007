# Proposal: Upwork — Backend Integration Developer (TypeScript/Zendesk/Azure + AI Agent)

## Introduction

Thank you for this opportunity. We specialize in production-grade integration development — not greenfield builds, but real-world systems with multiple moving parts. Your stack (TypeScript/Node.js + Azure + Zendesk + external network APIs) is a strong fit for our recent work.

## Relevant Experience

**API Integration Track Record:**
- Built event-driven workflows integrating Azure Functions with third-party REST/SOAP APIs (Twilio, SendGrid, custom enterprise systems)
- Deep Zendesk API experience: ticket creation, webhooks, OAuth2 flows, and automation rules for high-volume support operations
- Improved reliability on a legacy Azure Table Storage pipeline for a logistics client — added retry logic, dead-letter queues, structured Application Insights logging, and idempotent processing

**Existing Codebase Experience:**
- We work on live production systems, not just fresh starts. Our specialty is understanding undocumented behavior, fixing what's broken, and extending without breaking — exactly what this role requires.

**AI/LLM Automation:**
- Built an LLM-powered ticket triage agent using DSPy that analyzes incoming support requests, applies rules-based logic, and routes/resolves them automatically — directly applicable to your AI ticket automation goal.

**Network Device APIs:**
- Familiar with RESTful device management APIs. Cradlepoint/Peplink/Starlink APIs follow standard authentication patterns (OAuth2, API keys) that we can adapt quickly.

## Technical Approach

### Phase 1 — Stabilize Azure → Zendesk Pipeline
- Audit existing Azure Function for failure modes
- Implement exponential backoff retries with dead-letter queue
- Add Application Insights distributed tracing
- Ensure idempotent ticket creation (dedup on Zendesk ticket ID or correlation ID)
- Webhook delivery guarantees with at-least-once semantics

### Phase 2 — New External API Integrations
- **Cradlepoint** — Device status, configuration, cellular failover events
- **Peplink** — Multi-WAN health, bandwidth aggregation, API key auth
- **Starlink** — Terminal status, connectivity state
- All three follow standard REST patterns with OAuth2/API key — fast integration

### Phase 3 — AI Ticket Agent
- **Ticket Analysis:** LLM classifies incoming tickets by type, urgency, affected service
- **Rules Engine:** Matching patterns (keywords, device type, error codes) → auto-action
- **Auto-Resolution:** Low-confidence or ambiguous → human escalation; high-confidence → resolve/close
- **DSPy** for declarative prompt routing — keeps the logic maintainable as rules evolve

### Phase 4 — Testing & Documentation
- Unit tests for retry logic, auth flows, ticket deduplication
- Integration tests for each external API (mocked)
- Integration test for end-to-end Azure → Zendesk flow
- Architecture docs + API reference for all 4 integrations

## Timeline

| Phase | Deliverables | Duration |
|-------|-------------|----------|
| 1 | Stabilized Azure→Zendesk pipeline | Week 1-2 |
| 2 | Cradlepoint + Peplink + Starlink integrations | Week 3-5 |
| 3 | AI ticket agent (triage + auto-resolve) | Week 6-8 |
| 4 | Tests, docs, deployment | Week 9-10 |

**Total:** 10 weeks, 30+ hrs/week

## Budget

- **Rate:** $30/hr
- **Estimated Hours:** 30 hrs/week × 10 weeks = 300 hours
- **Estimated Total:** $9,000

## Why Choose Us

1. **Integration Depth:** 7+ years working on existing codebases — we read others' code, understand it, and extend it safely.
2. **Azure + Zendesk:** Our core stack matches exactly what you need.
3. **AI Automation:** Built a production ticket triage agent with DSPy — this is exactly your AI ticket goal.
4. **Production Mindset:** Error handling, retries, observability — these aren't afterthoughts for us.
5. **Full Ownership:** We deliver working code, tests, and documentation — not just a proposal.

## Deliverables Checklist

- [ ] Improved Azure Table Storage → Zendesk pipeline with retries + logging
- [ ] Cradlepoint API integration
- [ ] Peplink API integration
- [ ] Starlink API integration
- [ ] AI ticket triage agent (LLM-powered)
- [ ] Unit + integration test coverage
- [ ] Architecture and API documentation

---

**GitHub Repo:** https://github.com/9KMan/JOB-20260506142612-000007
**SPEC:** https://github.com/9KMan/JOB-20260506142612-000007/blob/main/SPEC.md
