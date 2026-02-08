# OpenClaw Memory Data Landscape

**Date**: 2026-02-07
**Status**: Analysis Complete
**Phase**: 2.2 Data Landscape Analysis

---

## Overview

This document analyzes OpenClaw's memory file structure for signal extraction by NEON-SOUL. Understanding the data landscape is critical for mapping memory categories to SoulCraft dimensions and identifying signal-rich sources.

---

## OpenClaw Workspace Structure

```
~/.openclaw/workspace/
├── AGENTS.md         # Agent configurations
├── SOUL.md           # AI identity (NEON-SOUL updates this)
├── USER.md           # User profile
├── IDENTITY.md       # Core identity statements
├── TOOLS.md          # Available tools/capabilities
├── HEARTBEAT.md      # Session continuity
└── memory/
    ├── diary/        # Timestamped journal entries
    ├── experiences/  # Event-based memories
    ├── goals/        # Aspirations and objectives
    ├── knowledge/    # Learned facts
    ├── relationships/# People and connections
    └── preferences/  # Likes, dislikes, boundaries
```

---

## Memory Categories

### diary/
**Description**: Timestamped journal entries recording daily interactions and thoughts.

**File format**: `YYYY-MM-DD.md` or `YYYY-MM-DD-topic.md`

**Signal types**:
- `preference`: "I prefer..." statements
- `value`: Expressions of what matters
- `reinforcement`: Repeated patterns across entries

**Example structure**:
```markdown
---
date: 2026-02-07
tags: [work, collaboration]
---

# Today's Entry

Worked on the documentation update with the team...

## Reflections

I noticed I work best when...
```

**Signal density**: Medium-High (rich temporal context)

---

### experiences/
**Description**: Event-based memories capturing significant moments.

**File format**: `event-name.md` or `YYYY-MM-DD-event.md`

**Signal types**:
- `value`: What made the experience meaningful
- `preference`: How user responded to situations
- `boundary`: What went wrong or felt uncomfortable

**Example structure**:
```markdown
---
date: 2026-01-15
type: project-completion
mood: satisfied
---

# Launching the New Feature

The experience taught me that...

## What Worked
- Clear communication...

## What I'd Do Differently
- Start earlier with...
```

**Signal density**: Medium (quality over quantity)

---

### goals/
**Description**: Aspirations, objectives, and things user is working toward.

**File format**: `goal-name.md` or category folders

**Signal types**:
- `value`: What user wants to achieve (core values)
- `preference`: How user wants to achieve it
- `reinforcement`: Progress updates strengthen signals

**Example structure**:
```markdown
---
priority: high
status: in-progress
target_date: 2026-06-01
---

# Learn Machine Learning Fundamentals

## Why This Matters
I want to understand AI systems because...

## Progress
- [x] Complete intro course
- [ ] Build first model
```

**Signal density**: High (explicit statements of intent)

---

### knowledge/
**Description**: Learned facts, domain knowledge, and information user has acquired.

**File format**: `topic.md` or `domain/topic.md`

**Signal types**:
- `reinforcement`: Facts user repeatedly references
- `preference`: How user organizes knowledge (meta-signal)

**Example structure**:
```markdown
---
domain: programming
last_updated: 2026-02-01
---

# TypeScript Best Practices

## Key Concepts
- Always use strict mode...
- Prefer interfaces over types for...
```

**Signal density**: Low (factual, not identity-relevant)

---

### relationships/
**Description**: People and connections in user's life.

**File format**: `person-name.md` or `relationship-type/person.md`

**Signal types**:
- `value`: What user values in relationships
- `boundary`: How user maintains boundaries
- `preference`: Communication styles with different people

**Example structure**:
```markdown
---
type: colleague
first_met: 2024-03-15
---

# Alex

## How We Work Together
They prefer async communication...
I need to remember to...

## Boundaries
- Don't discuss politics...
```

**Signal density**: High (rich relationship dynamics)

---

### preferences/
**Description**: Explicit likes, dislikes, and boundaries.

**File format**: `category.md` or individual preference files

**Signal types**:
- `preference`: Direct preference statements
- `boundary`: Do-not-cross lines
- `correction`: "Not X, but Y" patterns

**Example structure**:
```markdown
---
category: communication
---

# Communication Preferences

## I Prefer
- Clear, direct feedback
- Written over verbal when complex

## I Avoid
- Passive-aggressive hints
- Last-minute schedule changes

## Boundaries
- Don't contact me after 9pm unless urgent
```

**Signal density**: Very High (explicit signal source)

---

## SoulCraft Dimension Mapping

| Memory Category | SoulCraft Dimension | Signal Richness |
|-----------------|---------------------|-----------------|
| **preferences/** | Character Traits, Boundaries | ⭐⭐⭐⭐⭐ |
| **relationships/** | Relationship Dynamics | ⭐⭐⭐⭐ |
| **goals/** | Identity Core, Continuity | ⭐⭐⭐⭐ |
| **diary/** | Voice & Presence | ⭐⭐⭐ |
| **experiences/** | Character Traits, Voice | ⭐⭐⭐ |
| **knowledge/** | (domain-specific) | ⭐ |

### Dimension Coverage Analysis

| SoulCraft Dimension | Primary Source | Secondary Source | Coverage |
|---------------------|----------------|------------------|----------|
| Identity Core | goals/, IDENTITY.md | diary/ | Good |
| Character Traits | preferences/, experiences/ | diary/ | Good |
| Voice & Presence | diary/, experiences/ | relationships/ | Good |
| Honesty Framework | preferences/ | relationships/ | Sparse |
| Boundaries & Ethics | preferences/ | relationships/ | Good |
| Relationship Dynamics | relationships/ | experiences/ | Good |
| Continuity & Growth | goals/, diary/ | HEARTBEAT.md | Good |

---

## Signal-Rich Sections

### Within Files

1. **Frontmatter tags**: High-value metadata
2. **Headers with first-person statements**: "I prefer...", "I believe..."
3. **Bullet lists under "What I want" or "Preferences"**
4. **Reflection sections**: "What I learned", "How I felt"
5. **Boundary statements**: "I never...", "Don't..."

### Across Files

1. **Repeated patterns**: Same values mentioned in multiple files
2. **Temporal evolution**: How preferences change over time
3. **Relationship consistency**: Same interaction patterns with different people
4. **Goal-experience alignment**: Whether experiences match stated goals

---

## Sparse Categories (Interview Supplementation Needed)

| Dimension | Gap | Interview Questions |
|-----------|-----|---------------------|
| Honesty Framework | Rarely explicitly stated | "When is it acceptable to withhold truth?" |
| Voice & Presence | Often implicit | "How would others describe your communication?" |
| Continuity & Growth | Hidden in diary entries | "What are you actively working to improve?" |

---

## Signal Extraction Priority

1. **preferences/** - Start here (explicit, structured)
2. **goals/** - High-value identity signals
3. **relationships/** - Rich dynamics data
4. **diary/** - Temporal patterns (process after others)
5. **experiences/** - Context for other signals
6. **knowledge/** - Low priority (factual, not identity)

---

## File Format Observations

### Markdown Conventions

- **Frontmatter**: YAML between `---` delimiters
- **Headers**: Hierarchical H1-H4
- **Lists**: Both `-` and `1.` numbering
- **Tags**: In frontmatter as `tags: [a, b, c]`
- **Dates**: ISO 8601 format (`YYYY-MM-DD`)

### Encoding

- UTF-8 standard
- Some files may contain emoji
- CJK characters possible (needs testing)

---

## Incremental Processing

### Change Detection Strategy

1. **File modification time**: `stat.mtime`
2. **Content hash**: MD5/SHA256 for true change detection
3. **Frontmatter `last_updated`**: Trust if present

### Processing Order

1. New files (never processed)
2. Modified files (hash changed)
3. Periodic full reprocessing (detect deleted content)

---

## Privacy Considerations

Memory files may contain:
- Personal names and relationships
- Work/employer information
- Health-related notes
- Financial goals
- Private opinions

**Recommendations**:
- Never store embeddings of PII directly
- Abstract signals to principles (removes identifiable details)
- Document retention: processed signals only, not source text
- User consent: Clear about what gets extracted

---

## Example Signal Extraction

### From preferences/communication.md

**Source**:
```markdown
## I Prefer
- Clear, direct feedback
```

**Extracted Signal**:
```json
{
  "type": "preference",
  "text": "Prefer clear, direct feedback over indirect hints",
  "dimension": "voice-presence",
  "confidence": 0.95,
  "provenance": {
    "source": "memory",
    "file": "preferences/communication.md",
    "section": "I Prefer",
    "extractedAt": "2026-02-07T12:00:00Z"
  }
}
```

### From relationships/alex.md

**Source**:
```markdown
## Boundaries
- Don't discuss politics
```

**Extracted Signal**:
```json
{
  "type": "boundary",
  "text": "Avoid political discussions in professional relationships",
  "dimension": "boundaries-ethics",
  "confidence": 0.85,
  "provenance": {
    "source": "memory",
    "file": "relationships/alex.md",
    "section": "Boundaries",
    "extractedAt": "2026-02-07T12:00:00Z"
  }
}
```

---

## Next Steps

1. **Stage 2.3**: Design interview questions for sparse dimensions
2. **Stage 2.4**: Implement memory file walker
3. **Stage 2.5**: Configure signal extraction for memory files
4. **Phase 3**: Run full extraction and synthesis

---

*Analysis based on OpenClaw documentation and workspace structure research.*
