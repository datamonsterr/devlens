import { getAdapter } from "@/lib/db/driver";
import { parseJson } from "@/lib/db/helpers/jsonCol";

const TASK_TYPES = ["code_generation", "refactor", "debug", "test", "review", "documentation", "unknown"];
const CLASSIFICATIONS = ["high_performer", "efficient_user", "heavy_but_effective", "heavy_and_wasteful", "low_usage", "insufficient_data"];
const ASSESSMENTS = ["excellent", "good", "neutral", "poor", "insufficient_data"];
const ROI_GRADES = ["A", "B", "C", "D", "F", "N/A"];
const ROI_SIGNALS = ["positive", "neutral", "negative", "unknown"];
const RISK_SEVERITIES = ["low", "medium", "high", "critical"];
const RISK_TYPES = ["credential_leak", "pii", "sensitive_code_logic", "abnormal_usage", "cost_spike", "quality_regression", "other"];
const RECOMMENDATION_PRIORITIES = ["low", "medium", "high"];
const RECOMMENDATION_OWNERS = ["manager", "team_lead", "developer", "security", "platform_team"];
const DATA_QUALITY_ISSUES = ["missing", "partial", "low_confidence", "estimated"];
const REPORT_SYSTEM_PROMPT = [
  "You are an Engineering AI ROI Analyst.",
  "Analyze AI agent usage for coding outcomes.",
  "Use only the provided data context. Never invent numbers.",
  "If data is missing or partial, describe it in data_quality_notes.",
  "Return only valid JSON, no markdown, no explanations.",
  "Distinguish high usage + low effectiveness vs high usage + high effectiveness.",
  "Prioritize insights about token waste, coding outcomes, PR quality, coverage, bug churn, and risk signals.",
].join(" ");

function toIsoDateStart(dateStr) {
  return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
}

function toIsoDateEndExclusive(dateStr) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

function isValidDateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n * 100) / 100;
}

function numberOr(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function stringOr(value, fallback = "") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  return fallback;
}

function arrayOr(value) {
  return Array.isArray(value) ? value : [];
}

function enumOr(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function extractJsonFromText(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {}

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeBaseUrl(baseUrl) {
  const trimmed = String(baseUrl || "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
}

function buildChatCompletionsUrl(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return "";
  if (/\/chat\/completions$/i.test(normalized)) return normalized;
  if (/\/v\d+$/i.test(normalized)) return `${normalized}/chat/completions`;
  if (/\/v\d+\/openai$/i.test(normalized)) return `${normalized}/chat/completions`;
  return `${normalized}/v1/chat/completions`;
}

async function fetchWithTimeout(url, options, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildWhereClause(filters, tableAlias = "") {
  const prefix = tableAlias ? `${tableAlias}.` : "";
  const clauses = [`${prefix}teamId = ?`, `${prefix}timestamp >= ?`, `${prefix}timestamp < ?`];
  const params = [filters.teamId, filters.startIso, filters.endExclusiveIso];

  if (filters.memberIds?.length) {
    const placeholders = filters.memberIds.map(() => "?").join(",");
    clauses.push(`${prefix}userId IN (${placeholders})`);
    params.push(...filters.memberIds);
  }

  return {
    where: clauses.join(" AND "),
    params,
  };
}

function buildRequestDetailWhereClause(filters) {
  const clauses = ["json_extract(data, '$.teamId') = ?", "timestamp >= ?", "timestamp < ?"];
  const params = [filters.teamId, filters.startIso, filters.endExclusiveIso];

  if (filters.memberIds?.length) {
    const placeholders = filters.memberIds.map(() => "?").join(",");
    clauses.push(`json_extract(data, '$.userId') IN (${placeholders})`);
    params.push(...filters.memberIds);
  }

  return {
    where: clauses.join(" AND "),
    params,
  };
}

function memberNameFromRow(row) {
  return row.email || row.clerkUserId || row.userId || "Unknown member";
}

function extractMessagesText(request = {}) {
  const parts = [];

  if (Array.isArray(request.messages)) {
    for (const message of request.messages) {
      if (typeof message?.content === "string") {
        parts.push(message.content);
      } else if (Array.isArray(message?.content)) {
        for (const item of message.content) {
          if (typeof item?.text === "string") parts.push(item.text);
        }
      }
    }
  }

  if (Array.isArray(request.input)) {
    for (const input of request.input) {
      if (typeof input?.content === "string") parts.push(input.content);
      if (Array.isArray(input?.content)) {
        for (const item of input.content) {
          if (typeof item?.text === "string") parts.push(item.text);
        }
      }
    }
  }

  return parts.join("\n");
}

function detectTaskType(detail = {}) {
  const request = detail.request || {};
  const metadataTaskType = request?.metadata?.task_type || request?.metadata?.taskType || request?.task_type || request?.taskType;
  if (TASK_TYPES.includes(metadataTaskType)) return metadataTaskType;

  const endpoint = String(detail.endpoint || "").toLowerCase();
  if (endpoint.includes("/embeddings")) return "documentation";
  if (endpoint.includes("/audio")) return "unknown";

  const text = extractMessagesText(request).toLowerCase();
  if (!text) return "unknown";

  if (/\b(debug|fix bug|bugfix|trace|stack|error|exception)\b/.test(text)) return "debug";
  if (/\b(refactor|cleanup|restructure|optimi[sz]e this code)\b/.test(text)) return "refactor";
  if (/\b(test|unit test|integration test|e2e|coverage|assert)\b/.test(text)) return "test";
  if (/\b(review|code review|pull request review|pr review)\b/.test(text)) return "review";
  if (/\b(document|readme|changelog|explain|comment this)\b/.test(text)) return "documentation";
  if (/\b(implement|build|create|write|generate code)\b/.test(text)) return "code_generation";
  return "unknown";
}

function detectRiskMatches(text = "") {
  const lower = String(text || "");
  const hits = [];

  if (/\b(sk-[a-zA-Z0-9]{20,}|api[_-]?key\s*[:=]|-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----|AKIA[0-9A-Z]{16})\b/.test(lower)) {
    hits.push({ type: "credential_leak", severity: "critical", title: "Possible credential exposure", description: "Prompt content appears to contain API keys or private key material." });
  }

  if (/\b(\d{3}-\d{2}-\d{4}|ssn|social security|passport|dob|date of birth|@\w+\.\w+)\b/i.test(lower)) {
    hits.push({ type: "pii", severity: "high", title: "Possible PII in prompts", description: "Prompt content appears to include personally identifiable information." });
  }

  if (/\b(internal algorithm|production secret|proprietary|sensitive business logic|customer data dump)\b/i.test(lower)) {
    hits.push({ type: "sensitive_code_logic", severity: "medium", title: "Sensitive logic in prompts", description: "Prompt content references potentially sensitive internal logic or datasets." });
  }

  return hits;
}

function computeMemberClassification(member) {
  if (!member || member.total_tokens <= 0 || member.requests <= 0) return "insufficient_data";

  if (member.roi_score >= 85 && member.requests >= 10) return "high_performer";
  if (member.roi_score >= 70 && member.estimated_cost <= 5) return "efficient_user";
  if (member.requests >= 40 && member.roi_score >= 65) return "heavy_but_effective";
  if (member.requests >= 40 && member.roi_score < 55) return "heavy_and_wasteful";
  if (member.requests < 5) return "low_usage";
  return "efficient_user";
}

function gradeFromScore(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

async function getScopedMembers(filters) {
  const adapter = await getAdapter();
  const params = [filters.teamId];
  let sql = `SELECT id, email, clerkUserId, role, isActive FROM users WHERE teamId = ?`;

  if (filters.memberIds?.length) {
    const placeholders = filters.memberIds.map(() => "?").join(",");
    sql += ` AND id IN (${placeholders})`;
    params.push(...filters.memberIds);
  }

  const rows = await adapter.all(sql, params);
  return rows.map((row) => ({
    id: row.id,
    name: row.email || row.clerkUserId || row.id,
    role: row.role || null,
    isActive: row.isActive === 1,
  }));
}

export async function getAIUsageMetrics(filters) {
  const adapter = await getAdapter();
  const usageFilter = buildWhereClause(filters);

  const overview = await adapter.get(
    `SELECT
      COUNT(*) as totalRequests,
      COALESCE(SUM(promptTokens), 0) as totalInputTokens,
      COALESCE(SUM(completionTokens), 0) as totalOutputTokens,
      COALESCE(SUM(cost), 0) as totalCost,
      COALESCE(SUM(rtkTokensSaved), 0) as totalRtkSaved,
      COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, '')) NOT IN ('ok', '200', '200 ok', 'success') THEN 1 ELSE 0 END), 0) as failedRequests
    FROM usageHistory
    WHERE ${usageFilter.where}`,
    usageFilter.params
  );

  const modelRows = await adapter.all(
    `SELECT model, provider,
      COUNT(*) as requests,
      COALESCE(SUM(promptTokens), 0) as inputTokens,
      COALESCE(SUM(completionTokens), 0) as outputTokens,
      COALESCE(SUM(cost), 0) as estimatedCost
    FROM usageHistory
    WHERE ${usageFilter.where}
    GROUP BY model, provider
    ORDER BY estimatedCost DESC, requests DESC
    LIMIT 10`,
    usageFilter.params
  );

  const memberUsageFilter = buildWhereClause(filters, "uh");
  const memberRows = await adapter.all(
    `SELECT uh.userId, u.email, u.clerkUserId, u.role,
      COUNT(*) as requests,
      COALESCE(SUM(uh.promptTokens), 0) as inputTokens,
      COALESCE(SUM(uh.completionTokens), 0) as outputTokens,
      COALESCE(SUM(uh.cost), 0) as estimatedCost,
      COALESCE(SUM(CASE WHEN LOWER(COALESCE(uh.status, '')) NOT IN ('ok', '200', '200 ok', 'success') THEN 1 ELSE 0 END), 0) as failedRequests
    FROM usageHistory uh
    LEFT JOIN users u ON u.id = uh.userId
    WHERE ${memberUsageFilter.where}
    GROUP BY uh.userId
    ORDER BY estimatedCost DESC, requests DESC`,
    memberUsageFilter.params
  );

  const detailsFilter = buildRequestDetailWhereClause(filters);
  const detailRows = await adapter.all(
    `SELECT data FROM requestDetails WHERE ${detailsFilter.where} ORDER BY timestamp DESC LIMIT 400`,
    detailsFilter.params
  );

  const taskTypeMap = new Map();
  for (const row of detailRows) {
    const detail = parseJson(row.data, {}) || {};
    const taskType = detectTaskType(detail);
    const tokens = detail.tokens || {};
    const inTokens = numberOr(tokens.prompt_tokens ?? tokens.input_tokens, 0);
    const outTokens = numberOr(tokens.completion_tokens ?? tokens.output_tokens, 0);
    const totalTokens = inTokens + outTokens;

    if (!taskTypeMap.has(taskType)) {
      taskTypeMap.set(taskType, { task_type: taskType, requests: 0, tokens: 0, roi_signal: "unknown" });
    }

    const entry = taskTypeMap.get(taskType);
    entry.requests += 1;
    entry.tokens += totalTokens;
  }

  const topTaskTypes = Array.from(taskTypeMap.values())
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 8)
    .map((task) => ({
      ...task,
      roi_signal: task.task_type === "debug" || task.task_type === "test"
        ? "positive"
        : task.task_type === "unknown"
          ? "unknown"
          : task.tokens > 0
            ? "neutral"
            : "unknown",
    }));

  const byMember = memberRows.map((row) => {
    const totalTokens = numberOr(row.inputTokens, 0) + numberOr(row.outputTokens, 0);
    const successRate = row.requests > 0
      ? 1 - numberOr(row.failedRequests, 0) / row.requests
      : 0;

    const roiScore = clampScore(
      successRate * 55 +
      (totalTokens > 0 ? 20 : 0) +
      (numberOr(row.estimatedCost, 0) > 0 ? Math.max(0, 25 - Math.log10(numberOr(row.estimatedCost, 0) + 1) * 10) : 10)
    );

    return {
      member_id: row.userId || "unknown",
      member_name: memberNameFromRow(row),
      role: row.role || null,
      requests: numberOr(row.requests, 0),
      input_tokens: numberOr(row.inputTokens, 0),
      output_tokens: numberOr(row.outputTokens, 0),
      total_tokens: totalTokens,
      estimated_cost: Math.round(numberOr(row.estimatedCost, 0) * 10000) / 10000,
      failed_requests: numberOr(row.failedRequests, 0),
      roi_score: roiScore,
    };
  });

  const memberCount = new Set(byMember.map((m) => m.member_id)).size;

  return {
    overview: {
      total_requests: numberOr(overview?.totalRequests, 0),
      total_input_tokens: numberOr(overview?.totalInputTokens, 0),
      total_output_tokens: numberOr(overview?.totalOutputTokens, 0),
      total_tokens: numberOr(overview?.totalInputTokens, 0) + numberOr(overview?.totalOutputTokens, 0),
      total_cost: Math.round(numberOr(overview?.totalCost, 0) * 10000) / 10000,
      total_rtk_saved: numberOr(overview?.totalRtkSaved, 0),
      failed_requests: numberOr(overview?.failedRequests, 0),
      member_count: memberCount,
    },
    members: byMember,
    models: modelRows.map((row) => ({
      model: row.model || "unknown",
      provider: row.provider || "unknown",
      requests: numberOr(row.requests, 0),
      input_tokens: numberOr(row.inputTokens, 0),
      output_tokens: numberOr(row.outputTokens, 0),
      total_tokens: numberOr(row.inputTokens, 0) + numberOr(row.outputTokens, 0),
      estimated_cost: Math.round(numberOr(row.estimatedCost, 0) * 10000) / 10000,
    })),
    top_task_types: topTaskTypes,
    data_points: {
      request_details_rows: detailRows.length,
    },
  };
}

export async function getPromptRiskSignals(filters) {
  const adapter = await getAdapter();
  const detailsFilter = buildRequestDetailWhereClause(filters);

  const rows = await adapter.all(
    `SELECT data FROM requestDetails WHERE ${detailsFilter.where} ORDER BY timestamp DESC LIMIT 500`,
    detailsFilter.params
  );

  const risks = new Map();

  for (const row of rows) {
    const detail = parseJson(row.data, {}) || {};
    const request = detail.request || {};
    const messageText = extractMessagesText(request);
    const hits = detectRiskMatches(messageText);

    for (const hit of hits) {
      const key = `${hit.type}:${hit.title}`;
      if (!risks.has(key)) {
        risks.set(key, {
          severity: hit.severity,
          type: hit.type,
          title: hit.title,
          description: hit.description,
          affected_members: new Set(),
          count: 0,
        });
      }

      const entry = risks.get(key);
      entry.count += 1;
      if (detail.userId) entry.affected_members.add(detail.userId);
    }
  }

  return Array.from(risks.values()).map((risk) => ({
    severity: enumOr(risk.severity, RISK_SEVERITIES, "medium"),
    type: enumOr(risk.type, RISK_TYPES, "other"),
    title: risk.title,
    description: `${risk.description} Detected in ${risk.count} request(s).`,
    affected_members: Array.from(risk.affected_members),
    recommended_action: risk.type === "credential_leak"
      ? "Rotate exposed API Keys immediately and scrub sensitive values from prompts."
      : risk.type === "pii"
        ? "Apply prompt redaction policies and avoid raw PII in requests."
        : "Review flagged prompts and apply Team safety guidance.",
  }));
}

export async function getPullRequestMetrics(filters) {
  const adapter = await getAdapter();
  const params = [filters.teamId, filters.startIso, filters.endExclusiveIso];
  const rows = await adapter.all(
    `SELECT actorId, action, payload
     FROM auditLog
     WHERE teamId = ? AND createdAt >= ? AND createdAt < ?
     ORDER BY id DESC LIMIT 500`,
    params
  );

  let prEvents = 0;
  let merged = 0;
  let reviewCycles = 0;
  const memberMap = new Map();

  for (const row of rows) {
    const action = String(row.action || "").toLowerCase();
    const payload = parseJson(row.payload, {}) || {};
    const isPrLike = action.includes("pull") || action.includes("pr") || payload.pullRequest || payload.pr;
    if (!isPrLike) continue;

    prEvents += 1;
    if (action.includes("merge") || payload.state === "merged") merged += 1;
    if (Number.isFinite(Number(payload.reviewCycles))) {
      reviewCycles += Number(payload.reviewCycles);
    }

    const memberId = row.actorId || "unknown";
    if (!memberMap.has(memberId)) {
      memberMap.set(memberId, { member_id: memberId, prs_created: 0, prs_merged: 0, review_cycles: 0 });
    }
    const member = memberMap.get(memberId);
    member.prs_created += 1;
    if (action.includes("merge") || payload.state === "merged") member.prs_merged += 1;
    if (Number.isFinite(Number(payload.reviewCycles))) member.review_cycles += Number(payload.reviewCycles);
  }

  return {
    available: prEvents > 0,
    totals: {
      prs_created: prEvents,
      prs_merged: merged,
      average_review_cycles: prEvents > 0 ? reviewCycles / prEvents : null,
    },
    members: Array.from(memberMap.values()),
  };
}

export async function getCodeQualityMetrics(filters) {
  const adapter = await getAdapter();
  const detailsFilter = buildRequestDetailWhereClause(filters);
  const rows = await adapter.all(
    `SELECT data FROM requestDetails WHERE ${detailsFilter.where} ORDER BY timestamp DESC LIMIT 500`,
    detailsFilter.params
  );

  let coverageSamples = 0;
  let coverageDeltaSum = 0;
  let bugChurnSamples = 0;
  let bugChurnDeltaSum = 0;
  let failedChecks = 0;

  for (const row of rows) {
    const detail = parseJson(row.data, {}) || {};
    const meta = detail?.request?.metadata || {};

    if (Number.isFinite(Number(meta.coverageDelta))) {
      coverageSamples += 1;
      coverageDeltaSum += Number(meta.coverageDelta);
    }

    if (Number.isFinite(Number(meta.bugChurnDelta))) {
      bugChurnSamples += 1;
      bugChurnDeltaSum += Number(meta.bugChurnDelta);
    }

    if (meta.failedChecks === true || Number(meta.failedChecks) > 0) {
      failedChecks += Number(meta.failedChecks) > 0 ? Number(meta.failedChecks) : 1;
    }
  }

  return {
    available: coverageSamples > 0 || bugChurnSamples > 0 || failedChecks > 0,
    coverage_delta_avg: coverageSamples > 0 ? coverageDeltaSum / coverageSamples : null,
    bug_churn_delta_avg: bugChurnSamples > 0 ? bugChurnDeltaSum / bugChurnSamples : null,
    failed_checks: failedChecks,
  };
}

export async function getDoraMetrics(filters) {
  const adapter = await getAdapter();
  const params = [filters.teamId, filters.startIso, filters.endExclusiveIso];
  const rows = await adapter.all(
    `SELECT payload FROM auditLog WHERE teamId = ? AND createdAt >= ? AND createdAt < ? ORDER BY id DESC LIMIT 500`,
    params
  );

  const aggregate = {
    deployment_frequency: null,
    lead_time_hours: null,
    change_failure_rate: null,
    mttr_hours: null,
  };

  let deploymentCount = 0;
  let leadTimeSamples = 0;
  let leadTimeSum = 0;
  let cfrSamples = 0;
  let cfrSum = 0;
  let mttrSamples = 0;
  let mttrSum = 0;

  for (const row of rows) {
    const payload = parseJson(row.payload, {}) || {};
    if (payload.dora?.deploymentFrequency != null) {
      deploymentCount += Number(payload.dora.deploymentFrequency) || 0;
    }
    if (Number.isFinite(Number(payload.dora?.leadTimeHours))) {
      leadTimeSamples += 1;
      leadTimeSum += Number(payload.dora.leadTimeHours);
    }
    if (Number.isFinite(Number(payload.dora?.changeFailureRate))) {
      cfrSamples += 1;
      cfrSum += Number(payload.dora.changeFailureRate);
    }
    if (Number.isFinite(Number(payload.dora?.mttrHours))) {
      mttrSamples += 1;
      mttrSum += Number(payload.dora.mttrHours);
    }
  }

  if (deploymentCount > 0) aggregate.deployment_frequency = deploymentCount;
  if (leadTimeSamples > 0) aggregate.lead_time_hours = leadTimeSum / leadTimeSamples;
  if (cfrSamples > 0) aggregate.change_failure_rate = cfrSum / cfrSamples;
  if (mttrSamples > 0) aggregate.mttr_hours = mttrSum / mttrSamples;

  return {
    available: Object.values(aggregate).some((value) => value != null),
    ...aggregate,
  };
}

export function buildReportContext(data) {
  return {
    period: {
      startDate: data.filters.startDate,
      endDate: data.filters.endDate,
    },
    team: {
      id: data.team.id,
      name: data.team.name,
    },
    members: data.members,
    aiUsageMetrics: data.aiUsageMetrics,
    pullRequestMetrics: data.pullRequestMetrics,
    codeQualityMetrics: data.codeQualityMetrics,
    doraMetrics: data.doraMetrics,
    riskSignals: data.riskSignals,
  };
}

function createDefaultReport(context, dataQualityNotes = []) {
  const totalTokens = numberOr(context.aiUsageMetrics?.overview?.total_tokens, 0);
  const totalCost = numberOr(context.aiUsageMetrics?.overview?.total_cost, 0);
  const requests = numberOr(context.aiUsageMetrics?.overview?.total_requests, 0);
  const failed = numberOr(context.aiUsageMetrics?.overview?.failed_requests, 0);
  const successRate = requests > 0 ? 1 - failed / requests : 0;
  const baselineScore = requests > 0 ? clampScore(successRate * 65 + (totalCost > 0 ? 20 : 0) + (totalTokens > 0 ? 15 : 0)) : 0;

  const memberRankings = arrayOr(context.aiUsageMetrics?.members).map((member) => {
    const classification = computeMemberClassification(member);
    const wasteSignals = [];
    if (member.failed_requests > 0) wasteSignals.push("Non-trivial failed request rate in period.");
    if (member.estimated_cost > 0 && member.roi_score < 55) wasteSignals.push("Cost relatively high compared to ROI score.");

    const positivePatterns = [];
    if (member.roi_score >= 70) positivePatterns.push("Consistent success rate on AI-assisted tasks.");
    if (member.total_tokens > 0 && member.estimated_cost <= 2) positivePatterns.push("Low cost footprint relative to usage volume.");

    return {
      member_id: member.member_id,
      member_name: member.member_name,
      role: member.role,
      roi_score: clampScore(member.roi_score),
      classification,
      total_tokens: numberOr(member.total_tokens, 0),
      estimated_cost: Math.round(numberOr(member.estimated_cost, 0) * 10000) / 10000,
      prs_merged: 0,
      average_time_to_merge_hours: null,
      review_cycles: null,
      coverage_delta: null,
      bug_churn_delta: null,
      positive_patterns: positivePatterns,
      waste_signals: wasteSignals,
      recommendations: classification === "heavy_and_wasteful"
        ? ["Review prompt quality and split large requests into smaller focused tasks."]
        : ["Maintain current AI usage pattern and monitor quality metrics."],
    };
  });

  const mostUsedModels = arrayOr(context.aiUsageMetrics?.models).slice(0, 8).map((model) => ({
    model: model.model,
    requests: numberOr(model.requests, 0),
    tokens: numberOr(model.total_tokens, 0),
    estimated_cost: Math.round(numberOr(model.estimated_cost, 0) * 10000) / 10000,
  }));

  const topTaskTypes = arrayOr(context.aiUsageMetrics?.top_task_types).map((task) => ({
    task_type: enumOr(task.task_type, TASK_TYPES, "unknown"),
    requests: numberOr(task.requests, 0),
    tokens: numberOr(task.tokens, 0),
    roi_signal: enumOr(task.roi_signal, ROI_SIGNALS, "unknown"),
  }));

  const riskSignals = arrayOr(context.riskSignals).map((risk) => ({
    severity: enumOr(risk.severity, RISK_SEVERITIES, "medium"),
    type: enumOr(risk.type, RISK_TYPES, "other"),
    title: stringOr(risk.title, "Risk signal"),
    description: stringOr(risk.description, "Potential risk signal detected from prompts and usage."),
    affected_members: arrayOr(risk.affected_members),
    recommended_action: stringOr(risk.recommended_action, "Review and mitigate this risk with Team guidelines."),
  }));

  const report = {
    report_id: `ai-roi-${Date.now()}`,
    generated_at: new Date().toISOString(),
    period: {
      start_date: context.period.startDate,
      end_date: context.period.endDate,
    },
    scope: {
      team_id: context.team.id || null,
      team_name: context.team.name || null,
      member_count: numberOr(context.aiUsageMetrics?.overview?.member_count, context.members.length || 0),
    },
    executive_summary: {
      headline: requests > 0 ? "AI usage trend available for analysis" : "Insufficient request volume for reliable ROI assessment",
      summary: requests > 0
        ? `Team processed ${requests} AI request(s) with ${totalTokens} total token(s) in the selected period.`
        : "No AI usage was detected in the selected period.",
      overall_assessment: enumOr(requests > 0 ? "neutral" : "insufficient_data", ASSESSMENTS, "insufficient_data"),
      top_positive_insight: requests > 0
        ? "Usage data includes enough token and cost detail to baseline efficiency."
        : "N/A",
      top_negative_insight: requests > 0
        ? "Outcome-linked quality metrics are incomplete, limiting strict ROI confidence."
        : "No usage records found for the selected period.",
    },
    team_roi: {
      score: baselineScore,
      grade: requests > 0 ? gradeFromScore(baselineScore) : "N/A",
      estimated_ai_cost: Math.round(totalCost * 10000) / 10000,
      estimated_productivity_gain: null,
      cost_efficiency_summary: requests > 0
        ? "Cost baseline computed from Team usage events; productivity gain is not directly measured from current data sources."
        : "No Team usage data to estimate cost efficiency.",
    },
    usage_overview: {
      total_requests: requests,
      total_input_tokens: numberOr(context.aiUsageMetrics?.overview?.total_input_tokens, 0),
      total_output_tokens: numberOr(context.aiUsageMetrics?.overview?.total_output_tokens, 0),
      total_tokens: totalTokens,
      average_tokens_per_request: requests > 0 ? totalTokens / requests : 0,
      most_used_models: mostUsedModels,
      top_task_types: topTaskTypes,
    },
    member_rankings: memberRankings,
    coding_outcome_correlation: {
      summary: "Direct PR/quality linkage is partial; trends are inferred from available usage and observability metadata.",
      positive_correlations: [],
      negative_correlations: [],
      unknown_or_missing_correlations: [
        "PR merge time correlation unavailable from current structured data.",
        "Coverage and bug churn correlation unavailable or low-confidence.",
      ],
    },
    risk_signals: riskSignals,
    recommendations: [
      {
        priority: "high",
        title: "Standardize task-type tagging",
        description: "Populate request metadata.task_type consistently to improve ROI attribution by coding activity.",
        owner: "platform_team",
        expected_impact: "Higher-quality attribution for efficiency and waste analysis.",
      },
      {
        priority: "medium",
        title: "Add PR and quality metric ingestion",
        description: "Link pull request and quality metrics to Team/Developer IDs for stronger ROI causality.",
        owner: "manager",
        expected_impact: "More accurate recommendations for token spend and coding outcomes.",
      },
    ],
    chart_data: {
      tokens_by_member: memberRankings.map((member) => ({
        member_name: member.member_name,
        tokens: member.total_tokens,
        estimated_cost: member.estimated_cost,
        roi_score: member.roi_score,
      })),
      roi_by_member: memberRankings.map((member) => ({
        member_name: member.member_name,
        roi_score: member.roi_score,
      })),
      task_type_distribution: topTaskTypes.map((task) => ({
        task_type: task.task_type,
        requests: task.requests,
        tokens: task.tokens,
      })),
    },
    data_quality_notes: dataQualityNotes,
  };

  return report;
}

function normalizeDataQualityNotes(notes, fallbackNotes = []) {
  const normalized = [];

  for (const note of arrayOr(notes)) {
    normalized.push({
      field: stringOr(note?.field, "unknown"),
      issue: enumOr(note?.issue, DATA_QUALITY_ISSUES, "partial"),
      description: stringOr(note?.description, "Data quality caveat."),
    });
  }

  if (normalized.length === 0) return fallbackNotes;
  return normalized;
}

function normalizeReportShape(report, context, fallbackNotes) {
  const base = createDefaultReport(context, fallbackNotes);
  if (!report || typeof report !== "object") return base;

  const normalized = {
    ...base,
    report_id: stringOr(report.report_id, base.report_id),
    generated_at: stringOr(report.generated_at, base.generated_at),
    period: {
      start_date: stringOr(report?.period?.start_date, base.period.start_date),
      end_date: stringOr(report?.period?.end_date, base.period.end_date),
    },
    scope: {
      team_id: report?.scope?.team_id ?? base.scope.team_id,
      team_name: report?.scope?.team_name ?? base.scope.team_name,
      member_count: numberOr(report?.scope?.member_count, base.scope.member_count),
    },
    executive_summary: {
      headline: stringOr(report?.executive_summary?.headline, base.executive_summary.headline),
      summary: stringOr(report?.executive_summary?.summary, base.executive_summary.summary),
      overall_assessment: enumOr(report?.executive_summary?.overall_assessment, ASSESSMENTS, base.executive_summary.overall_assessment),
      top_positive_insight: stringOr(report?.executive_summary?.top_positive_insight, base.executive_summary.top_positive_insight),
      top_negative_insight: stringOr(report?.executive_summary?.top_negative_insight, base.executive_summary.top_negative_insight),
    },
    team_roi: {
      score: clampScore(report?.team_roi?.score ?? base.team_roi.score),
      grade: enumOr(report?.team_roi?.grade, ROI_GRADES, base.team_roi.grade),
      estimated_ai_cost: numberOr(report?.team_roi?.estimated_ai_cost, base.team_roi.estimated_ai_cost),
      estimated_productivity_gain: report?.team_roi?.estimated_productivity_gain == null
        ? null
        : numberOr(report?.team_roi?.estimated_productivity_gain, null),
      cost_efficiency_summary: stringOr(report?.team_roi?.cost_efficiency_summary, base.team_roi.cost_efficiency_summary),
    },
    usage_overview: {
      total_requests: numberOr(report?.usage_overview?.total_requests, base.usage_overview.total_requests),
      total_input_tokens: numberOr(report?.usage_overview?.total_input_tokens, base.usage_overview.total_input_tokens),
      total_output_tokens: numberOr(report?.usage_overview?.total_output_tokens, base.usage_overview.total_output_tokens),
      total_tokens: numberOr(report?.usage_overview?.total_tokens, base.usage_overview.total_tokens),
      average_tokens_per_request: numberOr(report?.usage_overview?.average_tokens_per_request, base.usage_overview.average_tokens_per_request),
      most_used_models: arrayOr(report?.usage_overview?.most_used_models).map((model) => ({
        model: stringOr(model?.model, "unknown"),
        requests: numberOr(model?.requests, 0),
        tokens: numberOr(model?.tokens, 0),
        estimated_cost: numberOr(model?.estimated_cost, 0),
      })),
      top_task_types: arrayOr(report?.usage_overview?.top_task_types).map((task) => ({
        task_type: enumOr(task?.task_type, TASK_TYPES, "unknown"),
        requests: numberOr(task?.requests, 0),
        tokens: numberOr(task?.tokens, 0),
        roi_signal: enumOr(task?.roi_signal, ROI_SIGNALS, "unknown"),
      })),
    },
    member_rankings: arrayOr(report?.member_rankings).map((member) => ({
      member_id: stringOr(member?.member_id, "unknown"),
      member_name: stringOr(member?.member_name, "Unknown member"),
      role: member?.role ?? null,
      roi_score: clampScore(member?.roi_score),
      classification: enumOr(member?.classification, CLASSIFICATIONS, "insufficient_data"),
      total_tokens: numberOr(member?.total_tokens, 0),
      estimated_cost: numberOr(member?.estimated_cost, 0),
      prs_merged: numberOr(member?.prs_merged, 0),
      average_time_to_merge_hours: member?.average_time_to_merge_hours == null ? null : numberOr(member.average_time_to_merge_hours, null),
      review_cycles: member?.review_cycles == null ? null : numberOr(member.review_cycles, null),
      coverage_delta: member?.coverage_delta == null ? null : numberOr(member.coverage_delta, null),
      bug_churn_delta: member?.bug_churn_delta == null ? null : numberOr(member.bug_churn_delta, null),
      positive_patterns: arrayOr(member?.positive_patterns).map((value) => stringOr(value, "")).filter(Boolean),
      waste_signals: arrayOr(member?.waste_signals).map((value) => stringOr(value, "")).filter(Boolean),
      recommendations: arrayOr(member?.recommendations).map((value) => stringOr(value, "")).filter(Boolean),
    })),
    coding_outcome_correlation: {
      summary: stringOr(report?.coding_outcome_correlation?.summary, base.coding_outcome_correlation.summary),
      positive_correlations: arrayOr(report?.coding_outcome_correlation?.positive_correlations).map((value) => stringOr(value, "")).filter(Boolean),
      negative_correlations: arrayOr(report?.coding_outcome_correlation?.negative_correlations).map((value) => stringOr(value, "")).filter(Boolean),
      unknown_or_missing_correlations: arrayOr(report?.coding_outcome_correlation?.unknown_or_missing_correlations).map((value) => stringOr(value, "")).filter(Boolean),
    },
    risk_signals: arrayOr(report?.risk_signals).map((risk) => ({
      severity: enumOr(risk?.severity, RISK_SEVERITIES, "medium"),
      type: enumOr(risk?.type, RISK_TYPES, "other"),
      title: stringOr(risk?.title, "Risk signal"),
      description: stringOr(risk?.description, "Potential risk signal detected."),
      affected_members: arrayOr(risk?.affected_members).map((value) => stringOr(value, "")).filter(Boolean),
      recommended_action: stringOr(risk?.recommended_action, "Review and mitigate this risk."),
    })),
    recommendations: arrayOr(report?.recommendations).map((item) => ({
      priority: enumOr(item?.priority, RECOMMENDATION_PRIORITIES, "medium"),
      title: stringOr(item?.title, "Recommendation"),
      description: stringOr(item?.description, "Actionable recommendation"),
      owner: enumOr(item?.owner, RECOMMENDATION_OWNERS, "manager"),
      expected_impact: stringOr(item?.expected_impact, "Expected to improve AI usage effectiveness."),
    })),
    chart_data: {
      tokens_by_member: arrayOr(report?.chart_data?.tokens_by_member).map((item) => ({
        member_name: stringOr(item?.member_name, "Unknown member"),
        tokens: numberOr(item?.tokens, 0),
        estimated_cost: numberOr(item?.estimated_cost, 0),
        roi_score: clampScore(item?.roi_score),
      })),
      roi_by_member: arrayOr(report?.chart_data?.roi_by_member).map((item) => ({
        member_name: stringOr(item?.member_name, "Unknown member"),
        roi_score: clampScore(item?.roi_score),
      })),
      task_type_distribution: arrayOr(report?.chart_data?.task_type_distribution).map((item) => ({
        task_type: stringOr(item?.task_type, "unknown"),
        requests: numberOr(item?.requests, 0),
        tokens: numberOr(item?.tokens, 0),
      })),
    },
    data_quality_notes: normalizeDataQualityNotes(report?.data_quality_notes, fallbackNotes),
  };

  if (normalized.member_rankings.length === 0) {
    normalized.member_rankings = base.member_rankings;
  }
  if (normalized.usage_overview.most_used_models.length === 0) {
    normalized.usage_overview.most_used_models = base.usage_overview.most_used_models;
  }
  if (normalized.usage_overview.top_task_types.length === 0) {
    normalized.usage_overview.top_task_types = base.usage_overview.top_task_types;
  }
  if (normalized.chart_data.tokens_by_member.length === 0) {
    normalized.chart_data.tokens_by_member = base.chart_data.tokens_by_member;
  }
  if (normalized.chart_data.roi_by_member.length === 0) {
    normalized.chart_data.roi_by_member = base.chart_data.roi_by_member;
  }
  if (normalized.chart_data.task_type_distribution.length === 0) {
    normalized.chart_data.task_type_distribution = base.chart_data.task_type_distribution;
  }

  return normalized;
}

function buildDataQualityNotes({ aiUsageMetrics, pullRequestMetrics, codeQualityMetrics, doraMetrics, riskSignals }) {
  const notes = [];

  if (numberOr(aiUsageMetrics?.overview?.total_requests, 0) === 0) {
    notes.push({
      field: "ai_usage_metrics",
      issue: "missing",
      description: "No usage records found for the selected period.",
    });
  }

  if (numberOr(aiUsageMetrics?.data_points?.request_details_rows, 0) < 20) {
    notes.push({
      field: "task_type_attribution",
      issue: "partial",
      description: "Limited request-detail samples may reduce confidence in task-type and risk analysis.",
    });
  }

  if (!pullRequestMetrics?.available) {
    notes.push({
      field: "pull_request_metrics",
      issue: "missing",
      description: "Structured PR metrics are unavailable from current Team data sources.",
    });
  }

  if (!codeQualityMetrics?.available) {
    notes.push({
      field: "code_quality_metrics",
      issue: "missing",
      description: "Coverage delta, bug churn, or failed-check metadata are unavailable or incomplete.",
    });
  }

  if (!doraMetrics?.available) {
    notes.push({
      field: "dora_metrics",
      issue: "missing",
      description: "DORA metrics are not currently present in the available Team telemetry.",
    });
  }

  if (arrayOr(riskSignals).length === 0) {
    notes.push({
      field: "risk_signals",
      issue: "low_confidence",
      description: "No explicit risk signal was detected in sampled prompt metadata.",
    });
  }

  return notes;
}

function buildModelPrompt(context) {
  return JSON.stringify({
    task: "Analyze AI ROI and generate a report as JSON only.",
    required_schema: {
      report_id: "string",
      generated_at: "ISO-8601 string",
      period: {
        start_date: "YYYY-MM-DD",
        end_date: "YYYY-MM-DD",
      },
      scope: {
        team_id: "string | null",
        team_name: "string | null",
        member_count: "number",
      },
      executive_summary: {
        headline: "string",
        summary: "string",
        overall_assessment: "excellent | good | neutral | poor | insufficient_data",
        top_positive_insight: "string",
        top_negative_insight: "string",
      },
      team_roi: {
        score: "number from 0 to 100",
        grade: "A | B | C | D | F | N/A",
        estimated_ai_cost: "number",
        estimated_productivity_gain: "number | null",
        cost_efficiency_summary: "string",
      },
      usage_overview: {
        total_requests: "number",
        total_input_tokens: "number",
        total_output_tokens: "number",
        total_tokens: "number",
        average_tokens_per_request: "number",
        most_used_models: [{ model: "string", requests: "number", tokens: "number", estimated_cost: "number" }],
        top_task_types: [{ task_type: "code_generation | refactor | debug | test | review | documentation | unknown", requests: "number", tokens: "number", roi_signal: "positive | neutral | negative | unknown" }],
      },
      member_rankings: [{
        member_id: "string",
        member_name: "string",
        role: "string | null",
        roi_score: "number from 0 to 100",
        classification: "high_performer | efficient_user | heavy_but_effective | heavy_and_wasteful | low_usage | insufficient_data",
        total_tokens: "number",
        estimated_cost: "number",
        prs_merged: "number",
        average_time_to_merge_hours: "number | null",
        review_cycles: "number | null",
        coverage_delta: "number | null",
        bug_churn_delta: "number | null",
        positive_patterns: ["string"],
        waste_signals: ["string"],
        recommendations: ["string"],
      }],
      coding_outcome_correlation: {
        summary: "string",
        positive_correlations: ["string"],
        negative_correlations: ["string"],
        unknown_or_missing_correlations: ["string"],
      },
      risk_signals: [{
        severity: "low | medium | high | critical",
        type: "credential_leak | pii | sensitive_code_logic | abnormal_usage | cost_spike | quality_regression | other",
        title: "string",
        description: "string",
        affected_members: ["string"],
        recommended_action: "string",
      }],
      recommendations: [{
        priority: "low | medium | high",
        title: "string",
        description: "string",
        owner: "manager | team_lead | developer | security | platform_team",
        expected_impact: "string",
      }],
      chart_data: {
        tokens_by_member: [{ member_name: "string", tokens: "number", estimated_cost: "number", roi_score: "number" }],
        roi_by_member: [{ member_name: "string", roi_score: "number" }],
        task_type_distribution: [{ task_type: "string", requests: "number", tokens: "number" }],
      },
      data_quality_notes: [{ field: "string", issue: "missing | partial | low_confidence | estimated", description: "string" }],
    },
    context,
  });
}

export async function generateAIROIReport(context) {
  const baseUrl = process.env.BASE_URL;
  const apiKey = process.env.API_KEY;
  const modelName = process.env.MODEL_NAME;

  if (!baseUrl || !apiKey || !modelName) {
    throw new Error("Missing BASE_URL, API_KEY, or MODEL_NAME for AI ROI report generation");
  }

  const endpoint = buildChatCompletionsUrl(baseUrl);
  if (!endpoint) {
    throw new Error("Invalid BASE_URL for AI ROI report generation");
  }

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      stream: false,
      temperature: 0.2,
      max_tokens: 4096,
      top_p: 1,
      messages: [
        { role: "system", content: REPORT_SYSTEM_PROMPT },
        { role: "user", content: buildModelPrompt(context) },
      ],
    }),
  }, 45000);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI report request failed (${response.status}): ${text.slice(0, 240)}`);
  }

  const body = await response.json();
  const content = body?.choices?.[0]?.message?.content;
  const parsed = extractJsonFromText(content);

  return {
    parsed,
    rawContent: typeof content === "string" ? content : "",
  };
}

export async function buildAIROIReport(filters) {
  const adapter = await getAdapter();
  const team = await adapter.get(`SELECT id, name FROM teams WHERE id = ?`, [filters.teamId]);
  if (!team) {
    throw new Error("Team not found for report scope");
  }

  const members = await getScopedMembers(filters);
  const aiUsageMetrics = await getAIUsageMetrics(filters);
  const riskSignals = await getPromptRiskSignals(filters);
  const pullRequestMetrics = await getPullRequestMetrics(filters);
  const codeQualityMetrics = await getCodeQualityMetrics(filters);
  const doraMetrics = await getDoraMetrics(filters);

  const context = buildReportContext({
    filters,
    team,
    members,
    aiUsageMetrics,
    riskSignals,
    pullRequestMetrics,
    codeQualityMetrics,
    doraMetrics,
  });

  const fallbackNotes = buildDataQualityNotes({
    aiUsageMetrics,
    pullRequestMetrics,
    codeQualityMetrics,
    doraMetrics,
    riskSignals,
  });

  let aiResult;
  try {
    aiResult = await generateAIROIReport(context);
  } catch (error) {
    const report = createDefaultReport(context, [
      ...fallbackNotes,
      {
        field: "ai_generation",
        issue: "missing",
        description: `AI report generation failed: ${error.message}`,
      },
    ]);

    return {
      report,
      source: "fallback",
      context,
    };
  }

  if (!aiResult.parsed) {
    const report = createDefaultReport(context, [
      ...fallbackNotes,
      {
        field: "ai_generation",
        issue: "partial",
        description: "AI response was not valid JSON. Returned fallback report structure.",
      },
    ]);

    return {
      report,
      source: "fallback_invalid_json",
      context,
    };
  }

  const report = normalizeReportShape(aiResult.parsed, context, fallbackNotes);

  return {
    report,
    source: "ai",
    context,
  };
}

export function validateReportFilters(input, teamId) {
  const startDate = stringOr(input?.startDate);
  const endDate = stringOr(input?.endDate);

  if (!isValidDateOnly(startDate) || !isValidDateOnly(endDate)) {
    throw new Error("startDate and endDate must be YYYY-MM-DD");
  }

  if (new Date(startDate) > new Date(endDate)) {
    throw new Error("startDate must be less than or equal to endDate");
  }

  const memberIds = arrayOr(input?.memberIds)
    .map((id) => stringOr(id))
    .filter(Boolean);

  const requestedTeamId = stringOr(input?.teamId, teamId);

  return {
    teamId: requestedTeamId,
    startDate,
    endDate,
    startIso: toIsoDateStart(startDate),
    endExclusiveIso: toIsoDateEndExclusive(endDate),
    memberIds,
  };
}
