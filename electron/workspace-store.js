const fs = require('node:fs');
const path = require('node:path');
const initSqlJs = require('sql.js');

class WorkspaceStore {
  constructor() {
    this.SQL = null;
    this.db = null;
    this.dbPath = null;
  }

  async init(userDataPath) {
    this.SQL = await initSqlJs();
    this.dbPath = path.join(userDataPath, 'nthterm.sqlite');

    if (fs.existsSync(this.dbPath)) {
      const data = fs.readFileSync(this.dbPath);
      this.db = new this.SQL.Database(data);
    } else {
      this.db = new this.SQL.Database();
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS workspace_state (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cwd TEXT NOT NULL,
        shell TEXT,
        updated_at TEXT NOT NULL
      )
    `);

    if (!this.getDefaultWorkspace()) {
      this.saveDefaultWorkspace({
        name: 'Default Workspace',
        cwd: process.cwd(),
        shell: '',
      });
    }
  }

  getDefaultWorkspace() {
    const result = this.db.exec(`
      SELECT id, name, cwd, shell, updated_at
      FROM workspace_state
      WHERE id = 'default'
    `);

    if (!result.length) {
      return null;
    }

    const [row] = result[0].values;

    return {
      id: row[0],
      name: row[1],
      cwd: row[2],
      shell: row[3] || '',
      updatedAt: row[4],
    };
  }

  saveDefaultWorkspace(workspace) {
    const updatedAt = new Date().toISOString();

    this.db.run(
      `
        INSERT INTO workspace_state (id, name, cwd, shell, updated_at)
        VALUES ('default', ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          cwd = excluded.cwd,
          shell = excluded.shell,
          updated_at = excluded.updated_at
      `,
      [workspace.name, workspace.cwd, workspace.shell || '', updatedAt]
    );

    this.persist();
    return this.getDefaultWorkspace();
  }

  persist() {
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }
}

module.exports = {
  WorkspaceStore,
};
