---
type: llm
focus: trace
weight: 1
---

plan.md gives v0.5 API precedence as --api-url, then --local with browser.apiUrl/default localhost, then STEEL_API_URL, then the saved device-login API URL when a device credential is active and no explicit override was given, otherwise the production API URL. It does not retain legacy environment precedence.
