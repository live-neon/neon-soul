# NEON-SOUL Docker Setup

Docker configurations for running NEON-SOUL with OpenClaw and Ollama.

## Quick Start

### Option 1: Ollama Only (Local LLM Testing)

```bash
# Start Ollama
docker compose -f docker/docker-compose.ollama.yml up -d

# Pull a model (choose one)
docker exec neon-soul-ollama ollama pull llama3    # Recommended (8B, high quality)
docker exec neon-soul-ollama ollama pull mistral   # Fast (7B, good quality)
docker exec neon-soul-ollama ollama pull phi3      # Small (3.8B, resource-limited)

# Verify Ollama is running
curl http://localhost:11434/api/tags

# Run real LLM tests
USE_REAL_LLM=true npm test tests/e2e/real-llm.test.ts
```

### Option 2: Full Stack (OpenClaw + Ollama)

```bash
# Copy environment file
cp docker/.env.example docker/.env
# Edit .env with your API keys (optional if using Ollama only)

# Start full stack
docker compose --profile ollama up -d

# Or just OpenClaw (requires API keys)
docker compose up -d
```

## Services

| Service | Port | Purpose |
|---------|------|---------|
| OpenClaw | 3000 | Web UI |
| OpenClaw | 8080 | API |
| Ollama | 11434 | Local LLM API |

## Ollama Models

| Model | Size | RAM | Quality | Speed |
|-------|------|-----|---------|-------|
| llama3 | 8B | ~8GB | High | Medium |
| mistral | 7B | ~7GB | Good | Fast |
| phi3 | 3.8B | ~4GB | Medium | Fast |

### Model Management

```bash
# List installed models
docker exec neon-soul-ollama ollama list

# Pull a model
docker exec neon-soul-ollama ollama pull llama3

# Remove a model
docker exec neon-soul-ollama ollama rm llama3

# Run interactive chat (testing)
docker exec -it neon-soul-ollama ollama run llama3
```

## Testing with Ollama

### Provider Tests

```bash
# Test the Ollama provider implementation
npm test tests/e2e/ollama-provider.test.ts
```

### Real LLM E2E Tests

```bash
# Run with real LLM
USE_REAL_LLM=true npm test tests/e2e/real-llm.test.ts

# Run with mock LLM (faster, for CI)
npm test tests/e2e/real-llm.test.ts
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_REAL_LLM` | false | Enable real LLM testing |
| `OLLAMA_BASE_URL` | http://localhost:11434 | Ollama API URL |
| `OLLAMA_MODEL` | llama3 | Model to use for tests |

## Troubleshooting

### Ollama not responding

```bash
# Check if container is running
docker ps | grep ollama

# Check logs
docker logs neon-soul-ollama

# Restart
docker compose -f docker/docker-compose.ollama.yml restart
```

### Model not found

```bash
# Pull the model
docker exec neon-soul-ollama ollama pull llama3

# Verify
docker exec neon-soul-ollama ollama list
```

### Slow responses

Local LLM inference is slower than API-based LLMs. Tips:
- Use `mistral` or `phi3` for faster responses
- Increase timeout in tests: `timeout: 60000`
- Ensure sufficient RAM (8GB+ recommended)

### Out of memory

```bash
# Check Docker memory limit
docker stats

# Use smaller model
docker exec neon-soul-ollama ollama pull phi3
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Host Machine                   │
├─────────────────────────────────────────────────┤
│  ┌───────────────┐    ┌───────────────────────┐ │
│  │   NEON-SOUL   │    │       Docker          │ │
│  │   (npm test)  │    │  ┌─────────────────┐  │ │
│  │               │────│──│ Ollama (:11434) │  │ │
│  │               │    │  │  └── llama3     │  │ │
│  │               │    │  └─────────────────┘  │ │
│  └───────────────┘    │  ┌─────────────────┐  │ │
│                       │  │OpenClaw (:3000) │  │ │
│                       │  └─────────────────┘  │ │
│                       └───────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Cross-References

- **Ollama Plan**: `docs/plans/2026-02-08-ollama-llm-provider.md`
- **E2E Testing Plan**: `docs/plans/2026-02-09-e2e-testing.md`
- **Provider Implementation**: `src/lib/llm-providers/ollama-provider.ts`
- **Provider Tests**: `tests/e2e/ollama-provider.test.ts`
- **Real LLM Tests**: `tests/e2e/real-llm.test.ts`
