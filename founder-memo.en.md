# Founder Memo: Codeindex

## Thesis
`codeindex` is context infrastructure for AI coding agents. It helps agents retrieve the right parts of a codebase with far fewer tokens, reducing AI spend while improving accuracy on real-world repositories.

## Problem
AI agents do not primarily fail because they lack intelligence. They fail because context retrieval is still weak.

When operating on real codebases, agents often:
- read too many files for a small task
- inflate prompts and drive token costs up quickly
- still make wrong decisions because the context is noisy or misses key dependencies

The result is a growing gap between the promise of AI coding and the reality inside production repositories: agents are more expensive than expected and less reliable than teams need.

## Solution
`codeindex` indexes a codebase structurally and uses reasoning to return a compact, relevant context pack that an agent can use immediately.

Instead of dumping an entire repository into a prompt, `codeindex` helps agents retrieve:
- the right symbols
- the right dependency chain
- the right files
- the right context boundary

The value proposition is straightforward:
- lower token spend per task
- higher agent task success rates
- less time wasted exploring codebases

## Why Now
AI coding is moving from autocomplete to autonomous agents. As agents become a real engineering workflow, context retrieval becomes a required infrastructure layer.

The more AI is used in software development:
- the higher token costs become
- the more context-related failures show up
- the more valuable an independent context layer becomes

This is the right time to build infrastructure, not just another model wrapper.

## Target Customer
Initial ICP:
- AI-native engineering teams
- startups and product teams using Claude, Codex, and Cursor daily
- medium to large codebases with real dependency complexity
- teams that already find AI useful, but too expensive or not reliable enough

This is not a product for every developer at the outset. It is for teams with enough pain to pay for better accuracy and efficiency.

## Product Strategy
`codeindex` should be built as developer infrastructure, not merely as a CLI utility.

The right product layers are:
- local CLI for individual developers
- local server / MCP for cross-client interoperability
- self-hosted deployment for teams and enterprises
- context APIs for internal agents and agent platforms

MCP is the most important expansion layer because it enables distribution across multiple AI systems rather than locking into a single vendor.

## Why This Can Win
The differentiation is not “search.” The differentiation is:
- context quality
- token efficiency
- workflow fit for coding agents
- privacy and local-first deployment
- multi-agent, multi-client compatibility

If executed well, `codeindex` becomes an ROI-clear layer in the AI coding stack: use fewer tokens to complete more tasks correctly.

## Business Model
Plausible monetization paths:
- Pro plan for heavy individual AI coding users
- Team plan for shared context workflows
- Self-hosted / enterprise deployments for security-sensitive organizations
- API / infrastructure licensing for agent products

Customers are not paying for “an index.” They are paying for:
- lower AI costs
- more reliable agents
- stronger privacy controls
- higher engineering throughput

## Key Risks
- Commoditization by major IDE or agent platforms
- Difficulty proving value without strong benchmarks
- Being perceived as a utility instead of a must-have workflow layer

## What Must Be True
For this to become a real business, `codeindex` must prove:
- meaningful token spend reduction
- meaningful improvement in agent task success rate
- installation simple enough for daily use
- compatibility across multiple AI clients through MCP or an equivalent standard

## Near-Term Priorities
1. Publish benchmarks: token savings, latency, and task-success uplift
2. Ship MCP support
3. Expand beyond TypeScript into multi-language support
4. Deepen integrations with Codex, Claude, and Cursor
5. Tighten positioning around one message: context infrastructure for coding agents

## Bottom Line
`codeindex` has the potential to become an important developer infrastructure layer in AI-native software development. If the company can prove ROI through benchmarks and establish itself as the context retrieval layer before the market is commoditized, this can become a meaningful commercial product rather than just a useful open-source utility.
