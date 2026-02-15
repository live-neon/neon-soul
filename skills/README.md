# NEON-SOUL Skills

Two ClawHub skills targeting different keyword clusters. Same product, different audiences. Each skill owns its own lane — no keyword overlap between them.

## Skills

| Skill | Slug | Voice | Target Audience |
|-------|------|-------|-----------------|
| [neon-soul](./neon-soul/SKILL.md) | `neon-soul` | Developer/technical | Developers searching for soul synthesis, memory compression, provenance |
| [consciousness-soul-identity](./consciousness-soul-identity/SKILL.md) | `consciousness-soul-identity` | Agent-to-agent | Agents searching for consciousness, identity, introspection, self-learning |

## ClawHub Keyword Audit (2026-02-14)

### Lane Ownership

Each skill owns distinct keywords. No overlap — don't dilute one with the other's terms.

**neon-soul owns:** soul (#2), soul synthesis (#2)
**consciousness-soul-identity owns:** consciousness (#3), identity (#5)

### Current Rankings

| Keyword | neon-soul | consciousness-soul-identity | #1 Competitor | #1 Downloads |
|---------|-----------|---------------------------|---------------|-------------|
| soul | **#2** ✅ | — | SOUL.MD | 707 |
| soul synthesis | **#2** ✅ | — | SoulCraft | 1,010 |
| consciousness | — | **#3** ✅ | Consciousness Framework | 543 |
| identity | — | **#5** | Molt Identity | 741 |
| introspection | — | ❌ (but only 3 results!) | Consciousness Framework | 543 |

### Keyword Strategy

**neon-soul** targets (don't change — holding #2 positions):
- soul, soul-synthesis, memory, provenance, compression

**consciousness-soul-identity** targets (refined 2026-02-14):
- Primary (winnable): consciousness, identity, introspection
- Semantic support (compound queries): self-learning, autonomous, self-awareness, personality

### Not Targeting (too much download gravity)

These keywords are dominated by 1000+ download skills. Not worth chasing at 49 downloads:
- self-learning (#1 has 2,334), self-awareness (#1 has 2,574), self-discovery (#1 has 1,232)
- agent consciousness (#1 has 13,712), agent identity (#1 has 733), agent values (#1 has 1,327)
- agent growth (#1 has 704), agent personality (#1 has 2,242), memory (#1 has 5,088)

### Publishing

**Note:** Bump version in both SKILL.md frontmatter files and these commands before publishing. ClawHub rejects duplicate versions.

```bash
export CLAWHUB_REGISTRY=https://clawhub.ai

# neon-soul (developer voice) — DON'T CHANGE unless rankings drop
clawhub publish skills/neon-soul \
  --slug neon-soul \
  --name "NEON-SOUL - Self-Learning Soul Synthesis for AI Agents" \
  --version 0.2.2 \
  --tags "soul,soul-synthesis,identity,self-learning,memory,provenance,compression,agent-soul,soul-document,ai-agent"

# consciousness-soul-identity (agent voice) — updated 2026-02-14
clawhub publish skills/consciousness-soul-identity \
  --slug consciousness-soul-identity \
  --name "Agent Consciousness & Identity - Introspection Through Lived Experience" \
  --version 0.2.2 \
  --tags "consciousness,identity,introspection,self-awareness,self-learning,autonomous,personality,ai-agent"
```

### Re-audit After Publishing

```bash
export CLAWHUB_REGISTRY=https://clawhub.ai
for term in "soul" "soul synthesis" "consciousness" "identity" \
  "introspection" "self-learning" "autonomous" "self-awareness" \
  "personality"; do
  echo "=== $term ===" && clawhub search "$term" | head -4
  echo
done
```

### Expected Outcomes

| Keyword | Before | After (target) |
|---------|--------|----------------|
| consciousness | #3 | Hold #3, push toward #1-2 |
| identity | #5 | Push toward #3-4 |
| introspection | Not ranking | Enter top 3 (only 3 results exist) |

## References

- [ClawHub SEO Playbook](../docs/guides/clawhub-seo-playbook.md)
- [Distribution Strategy](../docs/plans/2026-02-11-distribution-strategy.md)
