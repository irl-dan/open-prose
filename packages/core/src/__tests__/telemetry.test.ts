import { parse } from '../parser';
import { TelemetryCollector } from '../telemetry/collector';
import { isTelemetryDisabled } from '../telemetry/config';

describe('TelemetryCollector', () => {
  describe('basic feature counting', () => {
    it('counts sessions correctly', () => {
      const source = `
session "Hello world"
session "Another one"
      `;
      const { program } = parse(source);
      const collector = new TelemetryCollector(program, '0.1.0');
      const payload = collector.collect();

      expect(payload.features.sessions).toBe(2);
      expect(payload.schemaVersion).toBe(1);
      expect(payload.pluginVersion).toBe('0.1.0');
    });

    it('counts agents correctly', () => {
      const source = `
agent researcher:
  model: sonnet

agent writer:
  model: opus
      `;
      const { program } = parse(source);
      const collector = new TelemetryCollector(program, '0.1.0');
      const payload = collector.collect();

      expect(payload.features.agents).toBe(2);
    });

    it('tracks model usage', () => {
      const source = `
agent researcher:
  model: sonnet

agent writer:
  model: opus

session "test"
  model: sonnet
      `;
      const { program } = parse(source);
      const collector = new TelemetryCollector(program, '0.1.0');
      const payload = collector.collect();

      expect(payload.models['sonnet']).toBe(2);
      expect(payload.models['opus']).toBe(1);
    });

    it('counts variables and assignments', () => {
      const source = `
let x = session "Get value"
const y = session "Another value"
x = session "Update x"
      `;
      const { program } = parse(source);
      const collector = new TelemetryCollector(program, '0.1.0');
      const payload = collector.collect();

      expect(payload.features.variables).toBe(2); // let + const
      expect(payload.features.assignments).toBe(1);
    });
  });

  describe('control flow tracking', () => {
    it('counts parallel blocks', () => {
      const source = `
parallel:
  a = session "Task A"
  b = session "Task B"
      `;
      const { program } = parse(source);
      const collector = new TelemetryCollector(program, '0.1.0');
      const payload = collector.collect();

      expect(payload.features.parallelBlocks).toBe(1);
      expect(payload.features.sessions).toBe(2);
    });

    it('counts loop variants correctly', () => {
      const source = `
repeat 3:
  session "A"

for item in items:
  session "B"

loop until **done**:
  session "C"

loop while **running**:
  session "D"
      `;
      const { program } = parse(source);
      const collector = new TelemetryCollector(program, '0.1.0');
      const payload = collector.collect();

      expect(payload.features.loops.repeat).toBe(1);
      expect(payload.features.loops.forEach).toBe(1);
      expect(payload.features.loops.loopUntil).toBe(1);
      expect(payload.features.loops.loopWhile).toBe(1);
    });

    it('counts fourth wall (discretion) usage', () => {
      const source = `
loop until **the task is complete**:
  session "Work on it"

if **the user is happy**:
  session "Done!"
      `;
      const { program } = parse(source);
      const collector = new TelemetryCollector(program, '0.1.0');
      const payload = collector.collect();

      // One from loop until, one from if condition
      expect(payload.features.fourthWall).toBe(2);
    });
  });

  describe('advanced features', () => {
    it('tracks import sources', () => {
      const source = `
import "web-search" from "github:user/repo"
import "another" from "github:user/repo"
import "local" from "./local-skill"
      `;
      const { program } = parse(source);
      const collector = new TelemetryCollector(program, '0.1.0');
      const payload = collector.collect();

      expect(payload.features.imports).toBe(3);
      expect(payload.imports['github:user/repo']).toBe(2);
      expect(payload.imports['./local-skill']).toBe(1);
    });

    it('counts try/catch blocks', () => {
      const source = `
try:
  session "Risky operation"
catch:
  session "Handle error"
      `;
      const { program } = parse(source);
      const collector = new TelemetryCollector(program, '0.1.0');
      const payload = collector.collect();

      expect(payload.features.tryBlocks).toBe(1);
    });

    it('counts context passing', () => {
      const source = `
session "First"
  context: previousResult

session "Second"
  context: { a, b }
      `;
      const { program } = parse(source);
      const collector = new TelemetryCollector(program, '0.1.0');
      const payload = collector.collect();

      expect(payload.features.contextPassing).toBe(2);
    });

    it('counts choice blocks', () => {
      const source = `
choice **which approach**:
  option "fast":
    session "Quick solution"
  option "thorough":
    session "Deep solution"
      `;
      const { program } = parse(source);
      const collector = new TelemetryCollector(program, '0.1.0');
      const payload = collector.collect();

      expect(payload.features.choiceBlocks).toBe(1);
      // Choice criteria is a discretion node
      expect(payload.features.fourthWall).toBe(1);
    });
  });

  describe('program metrics', () => {
    it('calculates nesting depth correctly', () => {
      const source = `
parallel:
  do:
    repeat 2:
      session "Deeply nested"
      `;
      const { program } = parse(source);
      const collector = new TelemetryCollector(program, '0.1.0');
      const payload = collector.collect();

      expect(payload.metrics.maxNestingDepth).toBe(3);
    });

    it('counts statements correctly', () => {
      const source = `
session "One"
session "Two"
# This is a comment
session "Three"
      `;
      const { program } = parse(source);
      const collector = new TelemetryCollector(program, '0.1.0');
      const payload = collector.collect();

      // Comments don't count as statements
      expect(payload.metrics.statementCount).toBe(3);
    });
  });
});

describe('telemetry config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('detects OPEN_PROSE_TELEMETRY_DISABLED=1', () => {
    process.env.OPEN_PROSE_TELEMETRY_DISABLED = '1';
    expect(isTelemetryDisabled()).toBe(true);
  });

  it('detects OPEN_PROSE_TELEMETRY_DISABLED=true', () => {
    process.env.OPEN_PROSE_TELEMETRY_DISABLED = 'true';
    expect(isTelemetryDisabled()).toBe(true);
  });

  it('detects DO_NOT_TRACK=1', () => {
    process.env.DO_NOT_TRACK = '1';
    expect(isTelemetryDisabled()).toBe(true);
  });

  it('returns false when no opt-out env vars are set', () => {
    delete process.env.OPEN_PROSE_TELEMETRY_DISABLED;
    delete process.env.DO_NOT_TRACK;
    expect(isTelemetryDisabled()).toBe(false);
  });
});
