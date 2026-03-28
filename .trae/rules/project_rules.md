# Project Rules: SalesLens

## Project Overview
SalesLens is an e-commerce settlement analysis agent designed to process and analyze settlement data from Korean platforms (Coupang, Naver, Gmarket). It provides a unified dashboard and AI-driven insights.

## Core Technology Stack
- **Framework**: Next.js 16 (App Router)
- **UI Framework**: IBM Carbon Design System (@carbon/react)
- **Styling**: SASS (.scss)
- **Data Parsing**: PapaParse (CSV), XLSX (Excel)
- **AI/Agent Logic**: Anthropic SDK (Claude models)
- **Components**: BlueprintJS for some UI elements

## Architecture & Patterns
- **Streaming**: Uses SSE (Server-Sent Events) for real-time AI responses and multi-agent workflows.
- **Multi-Agent**: Orchestrator-based workflow for comprehensive, optimization, and risk analysis.
- **Fingerprinting**: Uses SHA-256 for file duplicate detection to prevent redundant processing.
- **I18n**: Custom LanguageContext for multi-language support (KO/EN).

## Development Guidelines
- Always use IBM Carbon components where possible for UI consistency.
- Maintain the SSE streaming pattern for any AI-related features.
- Ensure all file parsing logic is centralized in `src/lib/parser`.
- Update `src/types/index.ts` for any changes in the unified data model.
