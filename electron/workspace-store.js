const fs = require('node:fs');
const os = require('node:os');
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

  getLaunchWorkspace() {
    let workspace = this.getActiveWorkspace();

    if (!workspace) {
      [workspace] = this.listWorkspaces();
    }

    if (!workspace) {
      return null;
    }

    const normalized = this.normalizeWorkspaceForLaunch(workspace);
    const pathsChanged =
      normalized.cwd !== workspace.cwd ||
      JSON.stringify(normalized.sessionSnapshot) !== JSON.stringify(workspace.sessionSnapshot);

    if (pathsChanged) {
      this.saveWorkspace({
        id: normalized.id,
        name: normalized.name,
        cwd: normalized.cwd,
        shell: normalized.shell,
        templateId: normalized.templateId,
        icon: normalized.icon,
        accent: normalized.accent,
        layoutMode: normalized.layoutMode,
        launchProfile: normalized.launchProfile,
        sessionSnapshot: normalized.sessionSnapshot,
      });
      this.setActiveWorkspace(normalized.id);
      return this.getWorkspace(normalized.id);
    }

    return normalized;
  }

  getDirectoryDefaults() {
    return {
      homeDirectory: os.homedir(),
    };
  }

  resolveExistingDirectory(candidate) {
    if (!candidate) {
      return null;
    }

    try {
      const resolved = path.resolve(candidate);
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        return resolved;
      }
    } catch {
      return null;
    }

    return null;
  }

  resolveLaunchDirectory(candidate) {
    return this.resolveExistingDirectory(candidate) || os.homedir();
  }

  normalizeWorkspaceForLaunch(workspace) {
    const resolvedCwd = this.resolveLaunchDirectory(workspace.cwd);
    const snapshot = workspace.sessionSnapshot || this.buildDefaultSnapshot(workspace.name, resolvedCwd);
    const terminals = Array.isArray(snapshot.terminals)
      ? snapshot.terminals.map((terminal) => ({
          ...terminal,
          cwd: this.resolveLaunchDirectory(terminal.cwd || workspace.cwd),
        }))
      : undefined;
    const tabs = Array.isArray(snapshot.tabs)
      ? snapshot.tabs.map((tab) => ({
          ...tab,
          cwd: this.resolveLaunchDirectory(tab.cwd || workspace.cwd),
        }))
      : undefined;

    return {
      ...workspace,
      cwd: resolvedCwd,
      sessionSnapshot: {
        ...snapshot,
        ...(terminals ? { terminals } : {}),
        ...(tabs ? { tabs } : {}),
        history: Array.isArray(snapshot.history) ? snapshot.history.slice(0, 20) : [],
        recovery: snapshot.recovery || {
          lastLaunchAt: null,
          lastAttachedPaneId: null,
          lastExitCode: null,
          lastStopReason: null,
          lastSessionEndedAt: null,
          lastRecoveredAt: null,
        },
      },
    };
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

  renameWorkspace(id, name) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      return { error: 'INVALID_NAME' };
    }

    const current = this.getWorkspace(id);
    if (!current) {
      return null;
    }

    const updatedAt = new Date().toISOString();
    this.db.run(
      `
        UPDATE workspace_state
        SET name = ?, updated_at = ?
        WHERE id = ?
      `,
      [trimmed, updatedAt, id]
    );

    this.persist();
    return this.getWorkspace(id);
  }

  deleteWorkspace(id) {
    const workspaces = this.listWorkspaces();
    if (workspaces.length <= 1) {
      return { error: 'LAST_WORKSPACE' };
    }

    const workspace = this.getWorkspace(id);
    if (!workspace) {
      return null;
    }

    const activeId = this.getAppState('activeWorkspaceId');
    this.db.run(`DELETE FROM workspace_state WHERE id = ?`, [id]);
    this.persist();

    if (activeId === id) {
      const [nextWorkspace] = this.listWorkspaces();
      if (nextWorkspace) {
        this.setActiveWorkspace(nextWorkspace.id);
      }
    }

    return {
      deletedId: id,
      deletedName: workspace.name,
      activeWorkspace: this.getActiveWorkspace(),
    };
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
        mode: 'grid-2',
        focusedTerminalId: '',
        colSplit: 50,
        rowSplit: 50,
      },
      terminals: [],
      history: [],
      recovery: {
        lastLaunchAt: null,
        lastAttachedPaneId: null,
        lastExitCode: null,
        lastStopReason: null,
        lastSessionEndedAt: null,
        lastRecoveredAt: null,
      },
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
