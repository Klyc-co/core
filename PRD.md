# KLYC - AI Marketing Intelligence Platform

## System Architecture

KLYC has been refactored into a **backend AI orchestration service** with a **sequential pipeline architecture**. The React UI serves as a **development interface only** for testing and visualization. The **production user interface** exists in an external system called **Loveable**, which calls the KLYC backend through REST APIs.

### Architecture Layers

1. **Backend Orchestration Engine** (`/backend`)
   - KLYC Orchestrator coordinates all AI agents in sequential pipelines
   - 9 specialized AI agents execute in order with structured input/output
   - Agents pass data from one to the next in the pipeline
   - Real-time logging of agent execution
   - API layer for external system integration
   - Working memory and context compression

2. **Development UI** (React frontend - current codebase)
   - Visualizes backend orchestration in real-time
   - Testing interface for agent workflows
   - Development and debugging tool

3. **Production UI** (Loveable - external system)
   - Consumes KLYC APIs
   - Production user interface
   - Loveable sends campaign configs and receives generated content/analytics

### Orchestrator Pipeline Flow

The KLYC Orchestrator implements a **sequential execution model** where agents process in a specific order:

**Campaign Creation Pipeline:**
1. Normalizer Agent - Processes incoming campaign data
2. Research Agent - Gathers topic signals
3. Product Agent - Analyzes product positioning
4. Narrative Agent - Generates messaging structure
5. Social Agent - Adapts content to platform formats
6. Image Agent - Generates visual concepts
7. EditorPublisher Agent - Assembles final content
8. Approval Agent - Validates messaging
9. Analytics Agent - Prepares tracking configuration

Each agent receives **AgentInput** (containing previous output + context) and returns **AgentOutput** (containing results + metadata).

### AI Model Architecture (Claude API)

- **Claude Sonnet** (`claude-sonnet-4-20250514`): Research, Product, Narrative, Social, Editor, Analytics
- **Claude Haiku** (`claude-haiku-4-5-20251001`): Normalizer (no LLM), Image, Approval
- **Raw fetch** to `https://api.anthropic.com/v1/messages` (zero-dependency edge deployment)
- **Execution guardrails**: 30s timeout, 2 retries, 20KB response limit

### Math Models

**Viral Score**: `VS = 0.25*E + 0.25*V + 0.20*N + 0.15*D + 0.10*CS + 0.05*EE`
**Narrative Rank**: `NarrativeRank = preLaunchScore * clarity * trust`
**Pre-Launch Score**: `PLS = w_r*R + w_n*N + w_e*EE + w_p*PF + w_c*CC + w_u*U`
**Checkpoint Evaluation**: `combined = engRate*0.6 + viralVelocity*0.4`
  - boost >= 0.75, continue >= 0.50, pause >= 0.25, archive < 0.25

### Campaign Lifecycle

17 states: draft, normalizing, normalized, researching, researched, positioning, positioned, narrating, narrated, simulating, simulated, packaging, packaged, approving, approved, published, learned

## Essential Features

- Multi-Agent AI Architecture (9 specialized agents)
- Campaign Creation Studio
- Content Studio & Preview Workspace
- Media Lab
- AI Agent Monitor (The Brain)
- Analytics Engine with Early Signal Detection
- Viral Pattern Learning Engine
- Research Signal Ingestion

## Design Direction

Dark canvas AI operations center aesthetic. Deep cyber blue primary, electric cyan accent, neon green success states. Space Grotesk + JetBrains Mono typography. Phosphor icons.
