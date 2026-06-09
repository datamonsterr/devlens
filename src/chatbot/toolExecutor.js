import toolRegistry from './toolRegistry.js';

const MAX_RESULT_TOKENS = 4000;

function estimateTokens(val) {
  if (typeof val === 'string') return Math.ceil(val.length / 4);
  try { return Math.ceil(JSON.stringify(val).length / 4); } catch { return 0; }
}

function truncateResult(result) {
  const str = typeof result === 'string' ? result : JSON.stringify(result);
  const estimated = estimateTokens(str);
  if (estimated <= MAX_RESULT_TOKENS) return result;

  const truncated = str.slice(0, MAX_RESULT_TOKENS * 4);
  if (typeof result === 'string') {
    return truncated + '\n\n[... result truncated, exceeds ' + MAX_RESULT_TOKENS + ' tokens]';
  }
  return { _truncated: true, _original_length: str.length, content: truncated };
}

function validateArgs(schema, args) {
  if (!schema || !schema.properties) return [];

  const errors = [];
  const required = schema.required || [];

  for (const field of required) {
    if (args[field] === undefined || args[field] === null) {
      errors.push(`Missing required argument: ${field}`);
    }
  }

  for (const [key, value] of Object.entries(args)) {
    const propSchema = schema.properties[key];
    if (!propSchema) continue;

    if (propSchema.type === 'number' || propSchema.type === 'integer') {
      if (typeof value !== 'number' && typeof value !== 'undefined') {
        errors.push(`Argument "${key}" must be type ${propSchema.type}, got ${typeof value}`);
      }
    }
    if (propSchema.type === 'string' && typeof value !== 'string' && typeof value !== 'undefined') {
      errors.push(`Argument "${key}" must be type string, got ${typeof value}`);
    }
    if (propSchema.enum && !propSchema.enum.includes(value)) {
      errors.push(`Argument "${key}" must be one of: ${propSchema.enum.join(', ')}`);
    }
  }

  return errors;
}

export async function executeTool(name, args, context) {
  if (!context || !context.teamId) {
    return { error: 'Authentication required — no team context' };
  }

  const tool = toolRegistry.get(name);
  if (!tool) {
    return { error: `Tool "${name}" not found` };
  }

  const validationErrors = validateArgs(tool.schema, args);
  if (validationErrors.length > 0) {
    return { error: `Invalid arguments: ${validationErrors.join('; ')}` };
  }

  try {
    const result = await tool.handler(args, context);
    const formatted = truncateResult(result);
    return {
      tool_name: name,
      result: formatted,
    };
  } catch (err) {
    return {
      tool_name: name,
      error: err.message || 'Unknown error during tool execution',
    };
  }
}

export function getToolSchemas() {
  return toolRegistry.list().map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.schema,
    },
  }));
}
