## [ERR-20260130-001] lsp_diagnostics

**Logged**: 2026-01-30T00:00:00Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
LSP diagnostics failed because TypeScript language server is not installed

### Error
```
LSP server 'typescript' is NOT INSTALLED.

Command not found: typescript-language-server

To install: npm install -g typescript-language-server typescript
```

### Context
- Command/operation attempted: lsp_diagnostics on multiple TypeScript files
- Environment: local dev, repo /Users/kurtcalacday/Documents/Projects/Personal/naero

### Suggested Fix
Install `typescript-language-server` and `typescript` globally or configure project-local LSP support.

### Metadata
- Reproducible: yes
- Related Files: src/components/openstreet-map.tsx

---
