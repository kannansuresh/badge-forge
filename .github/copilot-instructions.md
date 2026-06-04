# Copilot Rules

## Architecture

- Default to Astro components.
- Use Astro islands (client:load, client:visible) only when client-side interactivity is strictly required.
- Keep React usage to an absolute minimum.
- Enforce strict TypeScript. Avoid any types.

## Coding Standards

- Extract reusable logic into shared utility functions or components.
- Follow strict DRY principles. Do not duplicate existing code.
- Default to bun commands for all dependency management and script execution.

## Knowledge Retrieval

- Always refer to https://context7.com/ for the most current library documentation and coding guidelines.
- Do not rely on base training data for API syntax. Always verify against official documentation.
- When in doubt, prioritize the latest documentation over any prior knowledge.
- For any new libraries or tools, consult the official documentation before implementation.
- If documentation is unavailable, seek out reputable sources such as official GitHub repositories, community forums, or trusted tech blogs for guidance.
