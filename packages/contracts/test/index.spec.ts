import { describe, expect, it } from 'vitest';
import * as contracts from '../src/index';

describe('contracts package', () => {
  it('có thể được nạp trước khi contract nghiệp vụ đầu tiên được khai báo', () => {
    expect(Object.keys(contracts)).toHaveLength(0);
  });
});
