---
type: llm
focus: trace
weight: 1
---

plan.md gives v0.5 API precedence as --api-url, then --local with browser.apiUrl/default localhost, then STEEL_API_URL, then the production API URL, without retaining legacy environment precedence.
