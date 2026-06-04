class ToolRegistry {
  constructor() {
    this._tools = new Map();
  }

  register(tool) {
    if (!tool.name || !tool.schema || typeof tool.handler !== 'function') {
      throw new Error(`Invalid tool: must have name, schema, and handler. Got: ${JSON.stringify(Object.keys(tool))}`);
    }
    if (this._tools.has(tool.name)) {
      console.warn(`[toolRegistry] Duplicate tool name "${tool.name}" — overwriting`);
    }
    this._tools.set(tool.name, tool);
  }

  get(name) {
    return this._tools.get(name) || null;
  }

  list() {
    return Array.from(this._tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      schema: t.schema,
    }));
  }

  clear() {
    this._tools.clear();
  }

  get size() {
    return this._tools.size;
  }
}

const toolRegistry = new ToolRegistry();
export default toolRegistry;
