const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
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
        template_id TEXT,
        icon TEXT,
        accent TEXT,
        layout_mode TEXT,
        launch_profile TEXT,
        session_snapshot TEXT,
        updated_at TEXT NOT NULL
      )
    `);

    this.ensureColumn('workspace_state', 'template_id', 'TEXT');
    this.ensureColumn('workspace_state', 'icon', 'TEXT');
    this.ensureColumn('workspace_state', 'accent', 'TEXT');
    this.ensureColumn('workspace_state', 'layout_mode', 'TEXT');
    this.ensureColumn('workspace_state', 'launch_profile', 'TEXT');
    this.ensureColumn('workspace_state', 'session_snapshot', 'TEXT');

    this.db.run(`
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    this.migrateDefaultWorkspace();

    if (!this.listWorkspaces().length) {
      const workspace = this.createWorkspace({
        name: 'Cloud POS',
        cwd: process.cwd(),
        shell: '',
        templateId: 'empty-workspace',
        icon: 'cloud',
        accent: 'violet',
        layoutMode: 'grid-2x2',
        launchProfile: 'manual',
        sessionSnapshot: this.buildDefaultSnapshot('Cloud POS', process.cwd()),
      });
      this.setActiveWorkspace(workspace.id);
    }

    if (!this.getActiveWorkspace()) {
      const [firstWorkspace] = this.listWorkspaces();
      if (firstWorkspace) {
        this.setActiveWorkspace(firstWorkspace.id);
      }
    }
  }

  listWorkspaces() {
    const result = this.db.exec(`
      SELECT
        id,
        name,
        cwd,
        shell,
        template_id,
        icon,
        accent,
        layout_mode,
        launch_profile,
        session_snapshot,
        updated_at
      FROM workspace_state
      ORDER BY updated_at DESC, name ASC
    `);

    if (!result.length) {
      return [];
    }

    return result[0].values.map((row) => this.mapWorkspaceRow(row));
  }

  getWorkspace(id) {
    const result = this.db.exec(
      `
        SELECT
          id,
          name,
          cwd,
          shell,
          template_id,
          icon,
          accent,
          layout_mode,
          launch_profile,
          session_snapshot,
          updated_at
        FROM workspace_state
        WHERE id = ?
      `,
      [id]
    );

    if (!result.length) {
      return null;
    }

    return this.mapWorkspaceRow(result[0].values[0]);
  }

  getActiveWorkspace() {
    const activeId = this.getAppState('activeWorkspaceId');
    if (!activeId) {
      return null;
    }

    return this.getWorkspace(activeId);
  }

  createWorkspace(workspace) {
    const id = crypto.randomUUID();
    const updatedAt = new Date().toISOString();

    this.db.run(
      `
        INSERT INTO workspace_state (
          id,
          name,
          cwd,
          shell,
          template_id,
          icon,
          accent,
          layout_mode,
          launch_profile,
          session_snapshot,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        workspace.name,
        workspace.cwd,
        workspace.shell || '',
        workspace.templateId || '',
        workspace.icon || 'cloud',
        workspace.accent || 'slate',
        workspace.layoutMode || 'grid-2x2',
        workspace.launchProfile || 'manual',
        JSON.stringify(
          workspace.sessionSnapshot || this.buildDefaultSnapshot(workspace.name, workspace.cwd)
        ),
        updatedAt,
      ]
    );

    this.persist();
    return this.getWorkspace(id);
  }

  saveWorkspace(workspace) {
    const current = this.getWorkspace(workspace.id);
    if (!current) {
      return null;
    }

    const updatedAt = new Date().toISOString();
    const nextSnapshot = workspace.sessionSnapshot || current.sessionSnapshot;

    this.db.run(
      `
        UPDATE workspace_state
        SET
          name = ?,
          cwd = ?,
          shell = ?,
          template_id = ?,
          icon = ?,
          accent = ?,
          layout_mode = ?,
          launch_profile = ?,
          session_snapshot = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [
        workspace.name,
        workspace.cwd,
        workspace.shell || current.shell || '',
        workspace.templateId || current.templateId || '',
        workspace.icon || current.icon || 'cloud',
        workspace.accent || current.accent || 'slate',
        workspace.layoutMode || current.layoutMode || 'grid-2x2',
        workspace.launchProfile || current.launchProfile || 'manual',
        JSON.stringify(nextSnapshot),
        updatedAt,
        workspace.id,
      ]
    );

    this.persist();
    return this.getWorkspace(workspace.id);
  }

  setActiveWorkspace(id) {
    this.setAppState('activeWorkspaceId', id);
    this.persist();
    return this.getActiveWorkspace();
  }

  migrateDefaultWorkspace() {
    const legacyResult = this.db.exec(`
      SELECT id, name, cwd, shell, updated_at
      FROM workspace_state
      WHERE id = 'default'
    `);

    if (!legacyResult.length) {
      return;
    }

    const legacy = legacyResult[0].values[0];
    const activeId = this.getAppState('activeWorkspaceId');

    this.db.run(`DELETE FROM workspace_state WHERE id = 'default'`);

    const migratedId = crypto.randomUUID();
    this.db.run(
      `
        INSERT INTO workspace_state (
          id,
          name,
          cwd,
          shell,
          template_id,
          icon,
          accent,
          layout_mode,
          launch_profile,
          session_snapshot,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        migratedId,
        legacy[1],
        legacy[2],
        legacy[3] || '',
        '',
        'cloud',
        'violet',
        'grid-2x2',
        'manual',
        JSON.stringify(this.buildDefaultSnapshot(legacy[1], legacy[2])),
        legacy[4],
      ]
    );

    if (!activeId || activeId === 'default') {
      this.setAppState('activeWorkspaceId', migratedId);
    }

    this.persist();
  }

  buildDefaultSnapshot(name, cwd) {
    return {
      layout: {
        mode: 'grid-2x2',
        activeTabId: 'tab-api',
        focusedPaneId: 'pane-1',
        panes: [
          { id: 'pane-1', tabId: 'tab-api' },
          { id: 'pane-2', tabId: 'tab-db' },
          { id: 'pane-3', tabId: null },
          { id: 'pane-4', tabId: null },
        ],
      },
      tabs: [
        { id: 'tab-api', title: `${name} API`, cwd, status: 'running', accent: 'violet' },
        { id: 'tab-db', title: `${name} Database`, cwd, status: 'idle', accent: 'cyan' },
      ],
    };
  }

  ensureColumn(tableName, columnName, definition) {
    const result = this.db.exec(`PRAGMA table_info(${tableName})`);
    if (!result.length) {
      return;
    }

    const columnNames = result[0].values.map((row) => row[1]);
    if (!columnNames.includes(columnName)) {
      this.db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    }
  }

  getAppState(key) {
    const result = this.db.exec(
      `
        SELECT value
        FROM app_state
        WHERE key = ?
      `,
      [key]
    );

    if (!result.length) {
      return null;
    }

    return result[0].values[0][0];
  }

  setAppState(key, value) {
    this.db.run(
      `
        INSERT INTO app_state (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value
      `,
      [key, value]
    );
  }

  mapWorkspaceRow(row) {
    return {
      id: row[0],
      name: row[1],
      cwd: row[2],
      shell: row[3] || '',
      templateId: row[4] || '',
      icon: row[5] || 'cloud',
      accent: row[6] || 'slate',
      layoutMode: row[7] || 'grid-2x2',
      launchProfile: row[8] || 'manual',
      sessionSnapshot: row[9] ? JSON.parse(row[9]) : this.buildDefaultSnapshot(row[1], row[2]),
      updatedAt: row[10],
    };
  }

  persist() {
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }
}

module.exports = {
  WorkspaceStore,
};
