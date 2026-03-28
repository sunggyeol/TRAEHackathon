# SalesLens

Korean e-commerce sellers manage settlements across Coupang, Naver, and Gmarket — each with different file formats, column names, and fee structures. SalesLens unifies them with a multi-agent AI orchestrator that automatically maps columns, analyzes data in parallel, and delivers actionable insights through an interactive dashboard.

## Core Features

**AI Column Mapping** — Upload CSV/XLSX settlement files from any Korean e-commerce platform. Claude LLM identifies the platform, infers column semantics from Korean headers and sample data, and maps them to a unified schema with confidence scores. Supports CP949/EUC-KR encoding auto-detection.

**Multi-Agent Orchestrator** — 18 specialized AI agents across 6 workflows run in parallel via SSE streaming. Each workflow dispatches 2-3 domain-expert agents simultaneously, then a synthesizer meta-agent combines their findings into a unified report.

| Workflow | Agents | What it does |
|----------|--------|-------------|
| Comprehensive Report | Revenue + Fee + Product Analyst | Full cross-platform analysis |
| Profit Simulator | Platform Optimizer + Pricing Strategist | Revenue optimization suggestions |
| Anomaly Detection | Price + Volume + Commission Anomaly | Statistical outlier detection |
| Price Health | Cross-Platform Price + Net Margin + Price Recommendation | Arbitrage and pricing opportunities |
| Settlement Audit | Math Verifier + Commission Rate Auditor + Summary | Validates settlement calculations |
| Data Export | Schema Validator + Dedup Detector + Export Formatter | Unified CSV generation |

**Interactive Dashboard** — 5 tabs: Revenue (stacked area + donut), Fees (Sankey flow + bar), Products (sortable table with platform logos), Trends (daily sales), Risk Diagnosis (computed from actual data — platform concentration, product dependency, margin analysis).

**Session Persistence** — Each analysis thread is saved to localStorage with full record and message history. Switch between sessions from the sidebar, or start fresh.

## Architecture

```
Browser (Next.js 16 App Router)
├── SalesLensApp (useReducer state machine)
│   ├── ChatLanding → file upload / template preview
│   ├── ChatInput → file staging with drag-and-drop
│   └── DashboardLayout → 5 tab panels + sidebar chat
│
├── /api/agent (API Route)
│   ├── mapping → Claude Sonnet (JSON response)
│   ├── insights → Claude Sonnet (SSE stream)
│   ├── chat → Claude Sonnet (SSE stream)
│   └── multi-agent → Parallel agent dispatch
│       ├── Promise.all(agents.map(stream))
│       └── Synthesizer meta-agent
│
└── Client-side processing
    ├── SheetJS (XLSX) + PapaParse (CSV)
    ├── TextDecoder('euc-kr') for CP949
    └── Carbon Charts + BlueprintJS
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript, Sass)
- **AI**: Anthropic Claude Sonnet via `@anthropic-ai/sdk`
- **Charts**: Carbon Charts (`@carbon/charts-react`) — Stacked Area, Donut, Alluvial/Sankey, Bar
- **UI**: BlueprintJS icons + IBM Carbon theme (white)
- **File Parsing**: SheetJS (`xlsx`) + PapaParse + TextDecoder for Korean encoding
- **Design**: Palantir/IBM industrial aesthetic — sharp edges, light theme, dense data, `IBM Plex Sans/Mono`
- **State**: React `useReducer` + `useRef` for stale-closure prevention
- **Persistence**: localStorage sessions (max 20)

## Getting Started

```bash
# Install dependencies
npm install

# Set your Anthropic API key
export ANTHROPIC_API_KEY=your_key_here

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Upload settlement files or click a template card to preview with mock data.

### Demo Files

Sample settlement files are included in `mockdata/`:
- `쿠팡_정산현황_2025Q4_2026Q1.csv` — Coupang (220 records)
- `스마트스토어_정산내역_2025Q4_2026Q1.csv` — Naver (200 records)
- `지마켓_정산내역_2025Q4_2026Q1.xlsx` — Gmarket (150 records)

These can also be downloaded from the landing page.

## Development

This project was built with [TRAE IDE](https://trae.ai), an AI-native development environment. TRAE's Builder Mode scaffolded the initial project structure, its context-aware AI assistant accelerated debugging and iteration across 50+ files, and its multi-agent coding workflows enabled parallel feature development throughout the hackathon.

## License

MIT
