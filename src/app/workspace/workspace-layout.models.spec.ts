import { getOverviewColumnCount, getOverviewRowCount } from './workspace-layout.models';

describe('overview grid size', () => {
  const cases: Array<{ count: number; columns: number; rows: number }> = [
    { count: 0, columns: 1, rows: 1 },
    { count: 1, columns: 1, rows: 1 },
    { count: 2, columns: 2, rows: 1 },
    { count: 3, columns: 2, rows: 2 },
    { count: 4, columns: 2, rows: 2 },
    { count: 5, columns: 3, rows: 2 },
    { count: 6, columns: 3, rows: 2 },
    { count: 7, columns: 3, rows: 3 },
    { count: 9, columns: 3, rows: 3 },
    { count: 10, columns: 4, rows: 3 },
  ];

  for (const example of cases) {
    it(`uses a ${example.columns}x${example.rows} grid for ${example.count} terminals`, () => {
      expect(getOverviewColumnCount(example.count)).toBe(example.columns);
      expect(getOverviewRowCount(example.count)).toBe(example.rows);
    });
  }
});
