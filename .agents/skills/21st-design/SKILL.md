---
name: 21st-design
description: >-
  Guide for designing and building UI components using the 21st.dev MCP server.
  Use when searching, selecting, generating, or integrating modern React/Tailwind
  components and themes into the ProjectEdge application.
---

# 21st.dev Design Workflow for ProjectEdge

Use this skill when designing, upgrading, or adding UI components, sections, themes, or layouts.

## Available 21st MCP Tools

1. **`search`**:
   - Query 12,000+ vetted React / Tailwind / shadcn / Framer Motion components.
   - Example query: `"pricing table"`, `"animated hero section"`, `"stats card"`, `"bento grid"`.
   - Free, unmetered metadata search.

2. **`get_inspiration`**:
   - Project-aware UI inspiration search that reranks components against design context.

3. **`get_component`**:
   - Fetches the complete TSX source code and demo for a given component ID.
   - Adapt the code to ProjectEdge conventions (Next.js App Router, Tailwind tokens, Lucide icons).

4. **`get_theme`**:
   - Retrieves full CSS `:root` and `.dark` tokens for a 21st community theme.

5. **`search_logo`**:
   - Free SVG brand & company logos from svgl.app.

6. **`generate`**:
   - Generates novel UI via 21st AI when catalog components need bespoke customization.

## Best Practices for ProjectEdge

- **Framework Compatibility**: Ensure imported components align with React 19 and Next.js 16 (App Router conventions).
- **Styling**: Match ProjectEdge's modern dark theme, typography, and border radius tokens.
- **Client vs Server Components**: Add `"use client"` if components utilize hooks or Framer Motion animations.
