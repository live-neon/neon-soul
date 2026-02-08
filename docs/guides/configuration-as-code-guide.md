# Configuration-as-Code Type Safety Guide

**Purpose**: Replace runtime configuration with compile-time type safety

**Source**: Extracted from N=9 validated pattern (multiverse observation 2025-11-12 → 2025-11-30)

**Language**: TypeScript/Node.js

**Last Updated**: 2026-02-07 (modernized for TypeScript 5.x patterns)

---

## Overview

Configuration-as-Code moves configuration from external files (YAML/JSON) into native TypeScript code, enabling:
- Compile-time validation (errors before execution)
- IDE support (autocomplete, go-to-definition, refactoring)
- Breaking change detection (refactor = immediate TypeScript errors)
- No parsing code needed (TypeScript compiler handles validation)

**Key insight**: Type safety at twelve levels (0-11) catches twelve classes of errors—each level builds on previous levels.

---

## Level 0: Strict Mode Foundation

**Problem**: Default TypeScript settings are too permissive, allowing unsafe patterns.

**Solution**: Enable strict mode and additional safety options in `tsconfig.json`.

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

**Why each option matters**:
- `strict`: Enables family of strict checks (required foundation)
- `noUncheckedIndexedAccess`: Array/object access returns `T | undefined`, forcing null checks
- `exactOptionalPropertyTypes`: Optional properties can't be explicitly set to `undefined`
- `noPropertyAccessFromIndexSignature`: Forces bracket notation for dynamic keys

```typescript
// With noUncheckedIndexedAccess: true
const colors: Record<string, string> = { red: "#ff0000" };
const blue = colors["blue"];  // Type: string | undefined (safe!)

// Without it (dangerous):
// const blue = colors["blue"];  // Type: string (lies! could be undefined)
```

**Foundation**: All subsequent levels assume strict mode is enabled.

---

## Level 1: Interfaces + Zod Runtime Validation

**Problem**: YAML/JSON parsing errors only discovered at runtime. TypeScript alone can't validate external data.

```yaml
# experiments.yaml - errors discovered at runtime
experiments:
  - promt: "What is consciousness?"  # typo: "promt" not "prompt"
    loops: "five"                     # wrong type: string not int
```

**Solution**: TypeScript interfaces for compile-time + Zod schemas for runtime validation.

```typescript
// Compile-time: TypeScript interfaces
interface ExperimentConfig {
  prompt: string;  // Typo in field name = compile error
  loops: number;   // Wrong type = compile error
}

const experiments: ExperimentConfig[] = [
  { prompt: "What is consciousness?", loops: 5 },  // Compile-time validated
];
```

**Runtime validation with Zod** (for external data: env vars, API responses, user input):

```typescript
import { z } from "zod";

// Define schema once, get both runtime validation AND TypeScript type
const ExperimentSchema = z.object({
  prompt: z.string().min(1),
  loops: z.number().int().positive(),
});

// Extract TypeScript type from Zod schema (DRY - single source of truth)
type ExperimentConfig = z.infer<typeof ExperimentSchema>;

// Safe parsing for external data
function loadExperiment(data: unknown): ExperimentConfig {
  const result = ExperimentSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid config: ${result.error.message}`);
  }
  return result.data;  // Fully typed!
}
```

**When to use each**:
- **TypeScript only**: Internal code, trusted data, compile-time known values
- **Zod**: External data (env vars, API responses, user input, config files)

**Benefits**:
- Missing required fields = compile error (TS) or runtime error (Zod)
- Wrong types = compile error (TS) or runtime error (Zod)
- IDE autocomplete shows available fields
- Single source of truth for schema and type

---

## Level 2: SDK Types vs External DSL

**Problem**: External DSLs require learning new syntax; type errors at runtime.

```yaml
# config.yaml - errors discovered at runtime
provider: "cluade"  # typo discovered when API call fails
```

**Solution**: Use SDK types (AWS SDK, Anthropic SDK, etc.).

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// TypeScript validates all parameters
const message = await client.messages.create({
  model: "claude-sonnet-4-20250514",  // Typo = compile error with strict types
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello" }],
});
```

**Benefits**:
- No external DSL to learn (just TypeScript)
- SDK upgrades = compile errors if API changed
- Same language for application code and configuration

---

## Level 3: Const Assertions + `satisfies` Operator

**Problem**: Raw strings validated only at runtime.

```typescript
// Before: Runtime validation
interface Experiment {
  provider: string;  // "claude", "gemini", "openai"
  style: string;     // "notice_uncertainty", "notice_bias"
}

const exp: Experiment = {
  provider: "cluade",              // typo - discovered at runtime
  style: "perspective_shifting",   // invalid - discovered at runtime
};
```

**Solution**: Combine `as const` with `satisfies` operator (TypeScript 4.9+).

```typescript
// Modern pattern: as const satisfies Record<...>
// - `as const` preserves literal types ("claude" not string)
// - `satisfies` validates structure at compile-time

const Providers = {
  Claude: "claude",
  Gemini: "gemini",
  OpenAI: "openai",
} as const satisfies Record<string, string>;

type ProviderName = typeof Providers[keyof typeof Providers];
// Type: "claude" | "gemini" | "openai" (literal union, not string)

const Styles = {
  Uncertainty: "notice_uncertainty",
  Bias: "notice_bias",
  Contradiction: "notice_contradiction",
} as const satisfies Record<string, string>;

type ReflectionStyle = typeof Styles[keyof typeof Styles];

interface Experiment {
  provider: ProviderName;      // Must use valid provider
  style: ReflectionStyle;      // Must use valid style
}

const exp: Experiment = {
  provider: Providers.Claude,      // IDE autocomplete
  style: Styles.Uncertainty,       // Compile-time validated
};

// This would fail at compile-time:
// const bad: Experiment = { provider: "cluade", style: "invalid" };
```

**Why `satisfies` matters** (vs type annotation):

```typescript
// Type annotation - loses literal types:
const routes: Record<string, { path: string }> = {
  home: { path: "/" },
};
// routes.home.path is type `string` (lost literal "/")

// satisfies - keeps literal types AND validates:
const routes = {
  home: { path: "/" },
} as const satisfies Record<string, { path: string }>;
// routes.home.path is type `"/"` (preserved literal)
```

**Measured impact**: 62.5% runtime failure rate → 0% (all errors caught at compile-time).

---

## Level 4: Function Registries

**Problem**: Switch statements proliferate and don't scale.

```typescript
// Before: Switch-based dispatch
function handleCommand(cmd: string): Promise<void> {
  switch (cmd) {
    case "validate":
      return runValidation();
    case "visualize":
      return runVisualization();
    // Adding new command requires modifying switch
    default:
      throw new Error(`Unknown command: ${cmd}`);
  }
}
```

**Solution**: Type-safe function registry pattern.

```typescript
// After: Registry-based dispatch
type CommandFunc = () => Promise<void>;

const Commands = {
  validate: "validate",
  visualize: "visualize",
  setup: "setup",
} as const;

type CommandType = typeof Commands[keyof typeof Commands];

const commandRegistry: Record<CommandType, CommandFunc> = {
  [Commands.validate]: runValidation,
  [Commands.visualize]: runVisualization,
  [Commands.setup]: runSetup,
  // Adding new command = add one line to registry
};

function handleCommand(cmd: CommandType): Promise<void> {
  const fn = commandRegistry[cmd];
  return fn();
}

// Type-safe invocation
handleCommand(Commands.validate);  // ✓ Valid
// handleCommand("invalid");        // ✗ Compile error
```

**Benefits**:
- Adding new command = add entry to registry (no switch modification)
- IDE shows all available commands via const object
- Consistent pattern across all dispatchers

---

## Level 5: Permutation Generation

**Problem**: Manual definition of permutations is error-prone and unmaintainable.

```typescript
// Before: 560 manual definitions
const experiments: Experiment[] = [
  { provider: Providers.Claude, style: Styles.Uncertainty, prompt: "..." },
  { provider: Providers.Claude, style: Styles.Bias, prompt: "..." },
  // ... 558 more manual entries
];
```

**Solution**: Functional generation with typed arrays.

```typescript
// After: 20 lines generate 180 experiments
type BatchFunc = () => Experiment[];

const providers = Object.values(Providers);
const styles = Object.values(Styles);
const prompts = [
  "What is consciousness?",
  "Explain quantum computing",
  // ... more prompts
];

function generateValidationBatch(): Experiment[] {
  const experiments: Experiment[] = [];

  // Generate all permutations: 3 × 3 × 20 = 180 experiments
  for (const provider of providers) {
    for (const style of styles) {
      for (const prompt of prompts) {
        experiments.push({
          provider,  // Typed enum
          style,     // Typed enum
          prompt,
        });
      }
    }
  }

  return experiments;
}

const batches: Record<string, BatchFunc> = {
  validation: generateValidationBatch,
};
```

**Measured impact**: 73% code reduction, guaranteed permutation completeness.

---

## Level 6: Composite Coordination

**Problem**: Phases with sub-batches risk incomplete execution.

```bash
# Risk: Phase 4 = 4A + 4B + 4C, but guidance may only mention 4A
npx neon-soul --batch phase4a  # Incomplete!
```

**Solution**: Composite batches coordinate sub-batches.

```typescript
const Batches = {
  Phase4Core: "phase4-core",  // 4A + 4B + 4C combined
  Phase4A: "phase4a",
  Phase4B: "phase4b",
  Phase4C: "phase4c",
} as const;

function generatePhase4Core(): Experiment[] {
  return [
    ...generatePhase4A(),  // 360
    ...generatePhase4B(),  // 540
    ...generatePhase4C(),  // 40
  ];  // 940 total, guaranteed complete
}

const batchRegistry: Record<string, BatchFunc> = {
  [Batches.Phase4Core]: generatePhase4Core,  // Single entry for complete phase
  // Sub-batches still available for debugging
  [Batches.Phase4A]: generatePhase4A,
  [Batches.Phase4B]: generatePhase4B,
  [Batches.Phase4C]: generatePhase4C,
};
```

---

## Level 7: Typed CLI Options

**Problem**: String CLI parameters vulnerable to typos.

```bash
# Before: String parameter
npx neon-soul --batch phase4-core6-20251126-v1
#                     ^^^^ typo = runtime error
```

**Solution**: Type-safe CLI frameworks with built-in validation.

### Modern Options (2025+)

| Framework | TypeScript Support | Size | Best For |
|-----------|-------------------|------|----------|
| **citty** (UnJS) | First-class | ~5KB | Modern ESM projects |
| **cmd-ts** | First-class | ~15KB | Maximum type safety |
| **Stricli** (Bloomberg) | First-class | ~20KB | Enterprise apps |
| Commander.js | Bolted-on | ~50KB | Legacy projects |
| yargs | Bolted-on | ~290KB | Complex CLI apps |

### citty (Recommended for new projects)

```typescript
import { defineCommand, runMain } from "citty";

const ValidBatches = ["phase4-core", "phase4a", "phase4b", "phase4c"] as const;

const main = defineCommand({
  meta: { name: "neon-soul", description: "Soul extraction CLI" },
  args: {
    batch: {
      type: "string",
      description: "Batch to run",
      required: true,
    },
    workers: {
      type: "string",
      description: "Parallel workers (0 = auto-detect)",
      default: "0",
    },
  },
  run({ args }) {
    // Validate against const array
    if (!ValidBatches.includes(args.batch as typeof ValidBatches[number])) {
      console.error(`Invalid batch: ${args.batch}`);
      console.error(`Valid: ${ValidBatches.join(", ")}`);
      process.exit(1);
    }
    runBatch(args.batch);
  },
});

runMain(main);
```

### Commander.js (Legacy/familiar)

```typescript
import { Command } from "commander";

const ValidBatches = ["phase4-core", "phase4a", "phase4b", "phase4c"] as const;
type BatchOption = typeof ValidBatches[number];

const program = new Command();

program
  .option("-b, --batch <name>", "Batch to run")
  .action((options) => {
    const batch = options.batch as string;

    if (!ValidBatches.includes(batch as BatchOption)) {
      console.error(`Invalid batch: ${batch}`);
      console.error(`Valid options: ${ValidBatches.join(", ")}`);
      process.exit(1);
    }

    runBatch(batch as BatchOption);
  });
```

### yargs (Complex CLIs with subcommands)

```typescript
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const ValidBatches = ["phase4-core", "phase4a", "phase4b", "phase4c"] as const;

const argv = yargs(hideBin(process.argv))
  .option("batch", {
    alias: "b",
    choices: ValidBatches,  // Automatic validation + shell completion
    demandOption: true,
  })
  .parseSync();
```

```bash
# After: Validated options
npx neon-soul --batch phase4-core  # Valid
npx neon-soul --batch phase4-typo  # Error: Invalid values for batch
```

---

## Level 8: Resource Auto-Detection

**Problem**: Parallelism configuration is implicit or hardcoded.

```typescript
// Before: Implicit/hardcoded
for (const exp of experiments) {
  await runExperiment(exp);  // Sequential, wastes multi-core CPU
}
```

**Solution**: Auto-detect system resources, make explicit.

```typescript
import os from "node:os";

interface SystemResources {
  cpuCores: number;
  availableMemoryMB: number;
  workers: number;
}

function detectSystemResources(): SystemResources {
  const cpuCores = os.cpus().length;
  const availableMemoryMB = Math.floor(os.freemem() / 1024 / 1024);

  // Default workers = CPU cores - 1 (leave one for OS)
  const workers = Math.max(1, cpuCores - 1);

  return { cpuCores, availableMemoryMB, workers };
}

interface ParallelismConfig {
  workers?: number;  // undefined = auto-detect
  noParallel?: boolean;
}

function resolveWorkerCount(
  config: ParallelismConfig,
  resources: SystemResources
): number {
  if (config.noParallel) return 1;
  return config.workers ?? resources.workers;
}

// Usage
const resources = detectSystemResources();
const workerCount = resolveWorkerCount({ workers: undefined }, resources);

console.log(`🚀 Parallelism: ${workerCount} workers (cpu_cores=${resources.cpuCores})`);
```

**CLI integration**:
```typescript
program
  .option("-w, --workers <n>", "Parallel workers (0 = auto-detect)", parseInt)
  .option("--no-parallel", "Disable parallel execution");
```

**Runtime output**:
```
🚀 Parallelism: 7 workers (cpu_cores=8)
   (Using 7 parallel workers - use --no-parallel to disable)
```

**Measured impact**: 2.5-3x speedup, ~100% resource utilization.

---

## Level 9: TypeScript as Source of Truth

**Problem**: Manual JSON files for cross-tool data drift from source of truth.

```json
// colors.json - manually created, drifts from TypeScript
{"claude": "#ff6b6b", "gemini": "#4ecdc4"}
```

**Solution**: Export JSON from TypeScript registry.

```typescript
// src/config/providers.ts - Single source of truth
export const ProviderColors: Record<ProviderName, string> = {
  [Providers.Claude]: "#ff6b6b",
  [Providers.Gemini]: "#4ecdc4",
  [Providers.OpenAI]: "#45b7d1",
};

// Export function for external tools
export function exportColorsJSON(): string {
  return JSON.stringify(ProviderColors, null, 2);
}

// scripts/generate-config.ts - Run before external tools
import { writeFileSync } from "node:fs";
import { exportColorsJSON } from "../src/config/providers";

writeFileSync("output/provider_colors.json", exportColorsJSON());
console.log("Generated provider_colors.json from TypeScript source");
```

```python
# Python reads generated JSON (never authors it)
import json
with open("output/provider_colors.json") as f:
    PROVIDER_COLORS = json.load(f)
```

**Benefits**:
- TypeScript is single source of truth
- JSON auto-regenerated on build
- Zero manual JSON maintenance

---

## Level 10: Template Literal Types for Config Keys

**Problem**: Configuration keys are unchecked strings, typos discovered at runtime.

```typescript
// Before: String keys, no validation
const config: Record<string, string> = {
  "prod.api.url": "https://api.example.com",
  "dev.api.url": "https://dev.api.example.com",
};

// Typo goes unnoticed until runtime:
const url = config["prod.api.ulr"];  // undefined, no compile error!
```

**Solution**: Template literal types enforce key patterns at compile-time.

```typescript
// Define valid segments
type Environment = "dev" | "staging" | "prod";
type Service = "api" | "auth" | "storage";
type ConfigProperty = "url" | "timeout" | "retries";

// Compose into pattern: "prod.api.url", "dev.auth.timeout", etc.
type ConfigKey = `${Environment}.${Service}.${ConfigProperty}`;

// Type-safe configuration object
const config: Record<ConfigKey, string | number> = {
  "prod.api.url": "https://api.example.com",
  "prod.api.timeout": 5000,
  "dev.api.url": "https://dev.api.example.com",
  // ... other valid combinations
};

// Compile-time error for invalid keys:
// config["prod.api.ulr"] = "...";  // Error: not assignable to ConfigKey

// Type-safe getter
function getConfig<K extends ConfigKey>(key: K): typeof config[K] {
  return config[key];
}

const url = getConfig("prod.api.url");  // Type: string | number
```

**Use cases**:
- API versioned paths: `"/api/v${1 | 2 | 3}/users"`
- CSS class patterns: `"btn-${Size}-${Variant}"`
- Event names: `"on${Capitalize<EventType>}"`
- i18n keys: `"${Namespace}.${Key}"`

---

## Level 11: Branded Types for Semantic Safety

**Problem**: Structurally identical types can be accidentally interchanged.

```typescript
// Before: All IDs are just strings - easy to mix up
function assignTask(taskId: string, userId: string): void { /* ... */ }

const userId = "user_123";
const taskId = "task_456";

// Compiles fine but WRONG - arguments swapped!
assignTask(userId, taskId);  // No error, runtime bug
```

**Solution**: Branded types differentiate structurally identical types.

```typescript
// Create brand utility
type Brand<K, T> = K & { readonly __brand: T };

// Define branded ID types
type UserId = Brand<string, "UserId">;
type TaskId = Brand<string, "TaskId">;
type SessionId = Brand<string, "SessionId">;

// Constructor functions (validate and brand)
function createUserId(id: string): UserId {
  if (!id.startsWith("user_")) throw new Error("Invalid user ID format");
  return id as UserId;
}

function createTaskId(id: string): TaskId {
  if (!id.startsWith("task_")) throw new Error("Invalid task ID format");
  return id as TaskId;
}

// Type-safe function
function assignTask(taskId: TaskId, userId: UserId): void {
  // ...
}

const userId = createUserId("user_123");
const taskId = createTaskId("task_456");

assignTask(taskId, userId);  // Correct order
// assignTask(userId, taskId);  // Compile error! Types don't match
```

**Combine with Zod for runtime validation**:

```typescript
import { z } from "zod";

const UserIdSchema = z.string()
  .startsWith("user_")
  .transform((s) => s as UserId);

const TaskIdSchema = z.string()
  .startsWith("task_")
  .transform((s) => s as TaskId);

// Parse external data with branding
const userId = UserIdSchema.parse(externalData.userId);  // Type: UserId
```

**Use cases**:
- Database IDs (prevent FK mixups)
- API tokens (auth vs refresh)
- Currency amounts (USD vs EUR)
- Validated strings (email, URL, UUID)

---

## Decision Framework

### When to Use Configuration-as-Code

**Good fit**:
- Developers are primary editors (not end-users)
- Breaking changes must be caught early
- Complex nested structures
- Type safety critical
- Version control important
- IDE support would improve productivity

**Bad fit**:
- End-users need to edit configs
- External tools need to parse configs
- Hot-reloading without restart required
- Configuration lives outside source control
- Simple key-value pairs (env vars suffice)

### Evaluation Checklist

| Question | Config-as-Code | External Files |
|----------|----------------|----------------|
| Who edits? | Developers | End-users |
| When are errors acceptable? | Compile-time | Runtime |
| Type safety critical? | Yes | No |
| Hot-reload needed? | No | Yes |
| Complex nested structure? | Yes | No |
| Constrained string values? | Yes (`as const satisfies`) | No (raw strings) |
| Need runtime validation? | Yes (Zod) | Maybe (JSON Schema) |
| Need permutations? | Yes (functional gen) | No (static) |
| Cross-language sharing? | Yes (typed export) | Manual JSON |
| ID type safety needed? | Yes (branded types) | No (string IDs) |

---

## Implementation Checklist for NEON-SOUL

### Phase 0: Foundation (Do First)
- [ ] Configure strict `tsconfig.json` with `noUncheckedIndexedAccess`
- [ ] Install Zod for runtime validation (`npm install zod`)
- [ ] Set up ESM with `"type": "module"` in package.json

### Phase 1: Basic Type Safety
- [ ] Define Zod schemas for external data (config files, env vars)
- [ ] Use `z.infer<>` to derive TypeScript types from schemas
- [ ] Add `as const satisfies` for constrained values

### Phase 2: CLI & Commands
- [ ] Choose CLI framework (citty recommended for new projects)
- [ ] Create function registries for command dispatch
- [ ] Add composite coordination for multi-step operations
- [ ] Implement `--list-commands` helper flag

### Phase 3: Resource Management
- [ ] Add system resource auto-detection
- [ ] Implement parallelism configuration
- [ ] Add `--no-parallel` debug flag

### Phase 4: Advanced Type Safety (if needed)
- [ ] Add template literal types for config keys
- [ ] Implement branded types for IDs
- [ ] Create JSON export from typed registries
- [ ] Auto-generate before external tools run

---

## Trade-offs Summary

**Benefits**:
- Compile-time error detection (TypeScript)
- Runtime validation for external data (Zod)
- IDE autocomplete and refactoring
- Breaking change detection
- No parsing code needed
- Self-documenting (types as documentation)
- Type-safe IDs prevent FK/parameter mixups (branded types)

**Costs**:
- Rebuild required for config changes
- Not suitable for end-user configuration
- Requires TypeScript knowledge
- Branded types add conceptual complexity
- Strict mode may require more null checks

**Migration path**: Start with Level 0-1 (strict mode + Zod), add patterns incrementally as needed.

---

## References

### Project References
- Source observation: `multiverse/docs/observations/configuration-as-code-type-safety.md` (N=9)
- Promoted standard: `multiverse/docs/standards/configuration-as-code.md`

### Runtime Validation
- [Zod](https://zod.dev/) - TypeScript-first schema validation with static type inference

### CLI Frameworks
- [citty](https://github.com/unjs/citty) - Elegant CLI builder (UnJS, ESM-first)
- [cmd-ts](https://github.com/Schniz/cmd-ts) - TypeScript-first CLI framework
- [Stricli](https://bloomberg.github.io/stricli/) - Bloomberg's type-safe CLI framework
- [Commander.js](https://github.com/tj/commander.js) - Popular, widely-used
- [yargs](https://github.com/yargs/yargs) - Feature-rich with subcommand support

### TypeScript Features
- [satisfies operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator) - TypeScript 4.9+
- [Template literal types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html) - TypeScript 4.1+
- [noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig#noUncheckedIndexedAccess) - Stricter array/object access
- [Branded types guide](https://www.learningtypescript.com/articles/branded-types) - Learning TypeScript

### Best Practices
- [TypeScript Best Practices 2025](https://dev.to/mitu_mariam/typescript-best-practices-in-2025-57hb) - DEV Community
- [TypeScript Strict Mode Guide](https://typescriptworld.com/the-ultimate-guide-to-typescript-strict-mode-elevating-code-quality-and-safety) - React News

---

*Twelve levels of type safety (0-11), each catching a different class of errors before runtime.*
