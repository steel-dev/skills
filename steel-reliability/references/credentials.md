# Credentials

Use Steel Credentials when login secrets should not be exposed to the agent, generated code, page scripts, or logs.

## Pattern

1. Store credentials once per origin and namespace.
2. Create the session with the same namespace and `credentials` enabled.
3. Navigate to the login page.
4. Wait for injection.
5. Assert login success.

## Rules

- Use environment variables for usernames, passwords, and TOTP secrets in generated setup code.
- Do not paste raw credentials into chat.
- Do not fill username/password manually when using Steel Credentials.
- Keep namespace stable for the account and target origin.

## Reliability Notes

Credentials solve secret handling; profiles solve persistent browser identity. Many reliable login flows use both.
