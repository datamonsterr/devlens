import fs from 'fs';
import path from 'path';
import toolRegistry from './toolRegistry.js';

const SKILLS_DIR = path.join(process.cwd(), 'src', 'chatbot', 'skills');

export async function discoverSkills() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.warn(`[skillRegistry] Skills directory not found: ${SKILLS_DIR}`);
    return [];
  }

  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillDir = path.join(SKILLS_DIR, entry.name);
    const indexPath = path.join(skillDir, 'index.js');

    if (!fs.existsSync(indexPath)) {
      console.warn(`[skillRegistry] Skipping "${entry.name}": no index.js found`);
      continue;
    }

    try {
      const skillModule = await import(`@/chatbot/skills/${entry.name}/index.js`);
      const skill = skillModule.default || skillModule;

      if (!skill || !Array.isArray(skill.tools)) {
        console.error(`[skillRegistry] Skipping "${entry.name}": no tools array exported`);
        continue;
      }

      for (const tool of skill.tools) {
        if (!tool.name || !tool.schema || typeof tool.handler !== 'function') {
          console.error(`[skillRegistry] Skipping tool in "${entry.name}": missing name/schema/handler`);
          continue;
        }
        toolRegistry.register(tool);
      }

      skills.push({
        name: skill.name || entry.name,
        description: skill.description || '',
        toolCount: skill.tools.length,
      });

      console.log(`[skillRegistry] Loaded skill "${skill.name || entry.name}" (${skill.tools.length} tools)`);
    } catch (err) {
      console.error(`[skillRegistry] Failed to load skill "${entry.name}":`, err.message);
    }
  }

  console.log(`[skillRegistry] Total tools registered: ${toolRegistry.size}`);
  return skills;
}

export function getRegisteredSkillNames() {
  if (!fs.existsSync(SKILLS_DIR)) return [];

  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(SKILLS_DIR, e.name, 'index.js')))
    .map((e) => e.name);
}
