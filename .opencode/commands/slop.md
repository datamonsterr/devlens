---
description: Record a mistake for future avoidance by AI agents
---

Record a slop entry when agent makes a mistake. System stores structured mistake data so future sessions avoid repeating it.

**Input**: Describe the mistake. Agent determines severity, layer, and creates the entry.

**Steps**

1. **Analyze the mistake**
   - What was done wrong?
   - What should have happened?
   - Which layer? `general` (cross-cutting) or `features/{name}` (specific to a feature)?

2. **Determine severity**
   - `critical`: Security, data loss, system breakage
   - `common`: Regular wrong patterns, likely to recur
   - `rare`: Edge case, unlikely but worth recording

3. **Find next available number**
   - Check `.opencode/slop/{layer}/` for highest numbered file
   - Use next integer (zero-padded to 2 digits)

4. **Create the entry**
   - Copy format from `.opencode/slop/TEMPLATE.md`
   - Write to `.opencode/slop/{layer}/NN-short-slug.md`
   - Fill all sections: What went wrong, What should have happened, Why it matters, How to avoid

5. **Notify**
   - Confirm: "Slop recorded: `{layer}/NN-short-slug.md`"
   - Suggest related slop entries if applicable
   - Remind that slop-reader will load this before future work

**Guardrails**
- Do NOT record every small typo — only patterns likely to recur
- Do NOT include secrets, credentials, or sensitive data in slop entries
- Layer correctly: general is for tool/project-wide mistakes, features/ for domain-specific
- Use project domain terms from `CONTEXT.md` in descriptions
