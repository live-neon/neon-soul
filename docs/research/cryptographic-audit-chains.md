# Cryptographic Audit Chains: Patterns from Production

**Date**: 2026-02-07
**Source**: `multiverse/projects/obviously-not/writer/internal/audit/`
**Relevance**: Reference implementation for NEON-SOUL's provenance tracking

---

## Executive Summary

The obviously-not/writer project implements a production-grade audit logging system with cryptographic integrity, cross-tool chain migration, and privacy controls. This document extracts patterns relevant to NEON-SOUL's provenance tracking goals.

**Key insight**: NEON-SOUL needs provenance (where did this axiom come from?), not necessarily cryptographic proof (can we prove the chain wasn't tampered with?). Understanding the difference helps right-size the implementation.

---

## Concepts

### Audit Chain

A sequence of entries where each entry references the previous one:

```
Entry 1 → Entry 2 → Entry 3 → Entry 4
   ↓         ↓         ↓         ↓
 hash₁    hash₂     hash₃     hash₄
            ↑         ↑         ↑
         prev=1    prev=2    prev=3
```

**Cryptographic chain**: Each entry's hash includes the previous hash, making tampering detectable. If someone modifies Entry 2, hash₂ changes, which breaks the link to Entry 3.

**Simple chain**: Entries reference previous entries by ID, but without cryptographic verification. Tampering is possible but would require updating all references.

### Provenance vs Integrity

| Goal | What it answers | Implementation |
|------|-----------------|----------------|
| **Provenance** | "Where did this come from?" | Source references, timestamps |
| **Integrity** | "Has this been tampered with?" | Cryptographic hashes |

NEON-SOUL primarily needs **provenance**. Integrity is a nice-to-have for transparency but not critical for the use case.

---

## Production Patterns (obviously-not/writer)

### AuditEntry Structure

```go
type AuditEntry struct {
    // Identity
    ID          string    `json:"id"`
    Timestamp   time.Time `json:"timestamp"`

    // Context
    Context     string    `json:"context"`      // "patent", "scanner"
    SessionID   string    `json:"session_id"`   // Groups related entries
    Operation   string    `json:"operation"`    // What happened

    // Source tracking
    Repository  string    `json:"repository,omitempty"`
    Branch      string    `json:"branch,omitempty"`
    CommitHash  string    `json:"commit_hash,omitempty"`

    // Author attribution
    Author      string    `json:"author,omitempty"`
    AuthorEmail string    `json:"author_email,omitempty"`

    // Chain linking (cryptographic)
    PreviousHash string   `json:"previous_hash,omitempty"`
    CurrentHash  string   `json:"current_hash,omitempty"`

    // Cross-tool references
    SourceChain string    `json:"source_chain,omitempty"`
    SourceEntry string    `json:"source_entry,omitempty"`

    // Payload
    Request     string    `json:"request,omitempty"`
    Response    string    `json:"response,omitempty"`
    Metadata    map[string]interface{} `json:"metadata,omitempty"`
}
```

### ChainIndex

A separate file tracking the entire chain:

```go
type ChainIndex struct {
    Context    string    `json:"context"`
    SessionID  string    `json:"session_id"`
    CreatedAt  time.Time `json:"created_at"`
    EntryCount int       `json:"entry_count"`
    Entries    []string  `json:"entries"`      // Entry IDs in order
    LastHash   string    `json:"last_hash"`    // For quick verification
    TotalCost  float64   `json:"total_cost"`   // Accumulated metrics
}
```

### Chain Migration

For cross-tool provenance (scanner → processor):

```go
type ChainMigration struct {
    ID            string    `json:"id"`
    SourceContext string    `json:"source_context"`
    SourceSession string    `json:"source_session"`
    TargetContext string    `json:"target_context"`
    TargetSession string    `json:"target_session"`
    MigratedAt    time.Time `json:"migrated_at"`
    EntryCount    int       `json:"entry_count"`
}
```

### Privacy Mode

Sanitization before storage:

```go
func (e *AuditEntry) SanitizeForStorage(privacyMode bool) {
    // Always hash email
    if e.AuthorEmail != "" {
        h := sha256.Sum256([]byte(strings.ToLower(e.AuthorEmail)))
        e.AuthorEmailHash = hex.EncodeToString(h[:])

        if privacyMode {
            e.AuthorEmail = ""  // Remove cleartext
        }
    }

    // Anonymize in privacy mode
    if privacyMode {
        if e.Repository != "" {
            h := sha256.Sum256([]byte(e.Repository))
            e.Repository = "repo-" + hex.EncodeToString(h[:8])[:16]
        }
        if e.Author != "" {
            e.Author = "anonymous"
        }
    }
}
```

---

## NEON-SOUL Mapping

### What We Need (v1)

| obviously-not/writer | NEON-SOUL Equivalent | Priority |
|---------------------|---------------------|----------|
| `AuditEntry` | `Signal`, `Principle`, `Axiom` | Required |
| `Context` + `SessionID` | Memory file path | Required |
| `Operation` | Signal type, event type | Required |
| Source references | `source.file`, `source.line` | Required |
| `Metadata` | `derived_from`, `history` | Required |
| `ChainIndex` | `axioms.json`, `principles.json` | Required |

### What We Can Defer (v2+)

| Feature | Why Defer |
|---------|-----------|
| Cryptographic hashing | Provenance sufficient for debugging |
| `PreviousHash`/`CurrentHash` | Not needed for transparency goal |
| Chain migration | Single tool, no cross-tool chains |
| Privacy mode | Memory files unlikely to have PII |
| Chain verification | Not court-admissible requirement |

### Simplified NEON-SOUL Structure

```typescript
// Signal (atomic extraction from memory)
interface Signal {
  id: string;
  type: "preference" | "correction" | "boundary" | "value" | "reinforcement";
  text: string;
  confidence: number;

  // Provenance (required)
  source: {
    file: string;      // "memory/2026-02-07.md"
    line: number;      // 156
    context: string;   // Surrounding text
    extracted_at: string;
  };
}

// Principle (distilled from signals)
interface Principle {
  id: string;
  text: string;
  dimension: string;
  strength: number;

  // Provenance (required)
  derived_from: {
    signals: string[];           // Signal IDs
    first_seen: string;
    last_reinforced: string;
    reinforcement_count: number;
  };

  // History log
  history: Array<{
    event: "created" | "reinforced" | "weakened" | "merged";
    timestamp: string;
    signal_id?: string;
    details?: string;
  }>;
}

// Axiom (converged from principles)
interface Axiom {
  id: string;
  text: string;
  cjk_anchor?: string;
  tier: "core" | "domain" | "emerging";

  // Provenance (required)
  derived_from: {
    principles: string[];        // Principle IDs
    convergence_count: number;   // N-count
    first_convergence: string;
    sources_summary: {
      memory_files: string[];
      date_range: { from: string; to: string };
      total_signals: number;
    };
  };

  // History log
  history: Array<{
    event: "promoted" | "strengthened" | "weakened" | "demoted" | "merged";
    timestamp: string;
    from_n: number;
    to_n: number;
    principle_id?: string;
  }>;
}
```

---

## Storage Structure Comparison

### obviously-not/writer

```
patents/{orgID}/PAT-{id}/audit/
├── entries/
│   ├── {uuid1}.json
│   ├── {uuid2}.json
│   └── ...
└── chain-index.json
```

### NEON-SOUL (proposed)

```
~/.openclaw/workspace/.neon-soul/
├── distilled/
│   ├── memory/
│   │   ├── 2026-02-07.json    # Signals from that day
│   │   └── ...
│   └── openclaw/
│       ├── 2026-02-07.json    # OpenClaw SOUL.md snapshot
│       └── ...
├── signals.json               # All signals (or separate files)
├── principles.json            # Accumulated principles
├── axioms.json                # Accumulated axioms
├── state.json                 # Processing state
└── history/                   # SOUL.md versions
    └── ...
```

---

## When to Add Cryptographic Integrity

Consider adding hash chains if:

1. **Legal/compliance requirements** - Need tamper-proof records
2. **Multi-user editing** - Need to detect unauthorized changes
3. **Distributed systems** - Need to verify chain consistency across nodes
4. **Audit requirements** - External parties need to verify provenance

For NEON-SOUL's current use case (debugging, transparency, understanding), simple provenance tracking is sufficient.

---

## Implementation Checklist

### v1: Provenance Only

- [ ] Signal extraction with source file/line
- [ ] Principle derivation with signal references
- [ ] Axiom convergence with principle references
- [ ] History logging for all changes
- [ ] Audit query CLI (`npx neon-soul audit`)

### v2: Optional Integrity (if needed)

- [ ] Add hash computation to entries
- [ ] Link entries with previous hash
- [ ] Add chain verification command
- [ ] Add chain index with integrity check

### v3: Full Audit System (if needed)

- [ ] Privacy mode for PII in memory
- [ ] Chain migration for multi-tool scenarios
- [ ] Formal verification reporting
- [ ] Export for external audit

---

## References

### Source Implementation
- `multiverse/projects/obviously-not/writer/internal/audit/types.go`
- `multiverse/projects/obviously-not/writer/internal/audit/chain.go`
- `multiverse/projects/obviously-not/writer/internal/audit/logger.go`
- `multiverse/projects/obviously-not/writer/docs/proposals/2026-01-26-shared-audit-logger-refactoring.md`

### NEON-SOUL Proposal
- `docs/proposals/soul-bootstrap-pipeline-proposal.md` (Provenance-First Data Model section)

---

*Provenance answers "where did this come from?" — integrity answers "has this been changed?" NEON-SOUL needs the first; the second can wait.*
