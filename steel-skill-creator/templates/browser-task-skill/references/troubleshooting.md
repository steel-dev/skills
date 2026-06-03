# Troubleshooting

- If the task fails before evidence exists, use `steel-session-debugging`.
- If the failure is bot detection, CAPTCHA, proxy, profile identity, or pacing, use `steel-reliability`.
- If the page shape changed, capture two new traces and update the workflow.
- If a selector fails, prefer accessible names, labels, roles, or `data-testid` before raw CSS.
