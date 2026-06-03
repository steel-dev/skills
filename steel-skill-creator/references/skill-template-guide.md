# Skill Template Guide

Use `templates/browser-task-skill/` for generated browser task skills.

## Required Sections

- frontmatter with `name` and trigger-focused `description`
- purpose and boundary
- inputs
- prerequisites
- workflow
- success criteria
- verification
- troubleshooting handoffs
- references

## Description Rules

- Third person.
- Under 1024 characters.
- Includes what the skill does.
- Includes when to use it.
- Includes negative routing when overlap is likely.

## Body Rules

- Prefer 40-80 lines for generated task skills.
- Use semantic steps over brittle CSS selectors when possible.
- Keep references one level deep.
- Do not embed raw traces, session IDs, timestamps, or credentials.
