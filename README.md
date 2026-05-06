# Azure Zendesk AI Agent

TypeScript/Node.js Azure Function system for device event handling, Zendesk ticketing, and AI-powered ticket triage.

## Architecture

- **Event Ingestion**: Azure Event Grid trigger → validates events → emits orchestration trigger
- **Orchestration**: Durable Function singleton per deviceId → routes events → coordinates handlers
- **ZendeskBridge**: Creates/updates/closes tickets via Zendesk API v2
- **DeviceAPIClient**: Unified interface for Cradlepoint, Peplink, Starlink REST APIs
- **TicketAI**: DSPy-style signature with rules engine fallback + optional LLM classification
- **RetryQueue**: Exponential backoff (1s→16s, max 5 retries) → dead letter handling

## Technical Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20 LTS, TypeScript 5.x |
| Azure Functions | TypeScript runtime, Durable Functions |
| Storage | Azure Table Storage |
| Ticketing | Zendesk API v2 |
| AI | OpenAI GPT-4o (optional), DSPy-style signatures |
| Observability | Application Insights, Winston |
| Testing | Jest + ts-jest |

## Project Structure

```
src/
├── functions/
│   ├── event-ingestion.ts    # Event Grid trigger + HTTP endpoint
│   └── orchestration.ts     # Durable orchestrator
├── services/
│   ├── zendesk.ts          # Zendesk API client
│   ├── device-api.ts       # Device API clients
│   ├── ticket-ai.ts        # AI ticket classification
│   ├── retry-queue.ts      # Retry with backoff
│   └── auth.ts             # OAuth2/API key management
├── models/
│   ├── enums.ts           # EventType, DeviceType, Severity, etc.
│   └── types.ts           # DeviceEvent, TicketRecord, etc.
└── utils/
    └── logger.ts          # Winston + Application Insights
tests/
├── models.test.ts
├── ticket-ai.test.ts
├── retry-queue.test.ts
└── auth.test.ts
```

## Event Types

- `DEVICE_ALERT` → create ticket + AI triage → resolve/escalate
- `DEVICE_OFFLINE` → create ticket + AI triage → resolve/escalate
- `DEVICE_CONFIG` → create ticket + AI triage → resolve/escalate
- `MANUAL_SYNC` → skip AI, direct ticket create

## AI Rules Engine

| Condition | Action | Confidence |
|-----------|--------|------------|
| "offline" + Starlink | auto-resolve | 0.95 |
| "offline" + Cradlepoint | escalate | 0.85 |
| any "error" + alert code | escalate | 0.6 |
| MANUAL_SYNC | auto-resolve | 0.95 |
| routine check | auto-resolve | 0.9 |

## Getting Started

```bash
npm install
npm run build
npm test
```

## Configuration

Environment variables required:
- `APPLICATIONINSIGHTS_CONNECTION_STRING`
- `STORAGE_TABLE_CONNECTION_STRING`
- `ZENDESK_BASE_URL`, `ZENDESK_EMAIL`, `ZENDESK_API_TOKEN`, `ZENDESK_WEBHOOK_URL`
- `CRADLEPOINT_BASE_URL`, `CRADLEPOINT_CLIENT_ID`, `CRADLEPOINT_CLIENT_SECRET`
- `PEPLINK_BASE_URL`, `PEPLINK_API_KEY`
- `STARLINK_BASE_URL`, `STARLINK_API_KEY`
- `OPENAI_API_KEY` (optional)

## CI/CD

GitHub Actions workflow:
1. Lint + typecheck on PR
2. Unit tests on PR + merge
3. Deploy to Azure on merge to main