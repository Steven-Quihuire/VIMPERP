import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const workflowPath = resolve(process.cwd(), '.github/workflows/ci.yml');

describe('ci workflow threat #3 guardrails', () => {
  it('uses read-only contents permissions and avoids secret-bearing pull_request_target flows', () => {
    const workflow = readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('permissions:');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toMatch(/secrets\./);
  });
});
