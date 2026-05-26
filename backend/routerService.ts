import { queryLLM, MODEL_PRICING, ApiKeys, QueryResponse } from './llmProviders.js';
import { saveLog } from './db.js';

export interface RouteOptions {
  useAiClassifier?: boolean;
  keys?: ApiKeys;
}

export interface HeuristicResult {
  score: number;
  logs: string[];
}

export interface AiComplexityResult {
  score: number;
  reason: string;
  logs: string[];
}

export interface RoutingResult extends QueryResponse {
  logId: string;
  complexityScore: number;
  pipelineLogs: string[];
}

// Strategy-to-Model Mapping tables based on final complexity score (1 to 5)
const STRATEGY_MAPPINGS: Record<string, Record<number, string>> = {
  cost: {
    1: 'gemini-1.5-flash',
    2: 'gemini-1.5-flash',
    3: 'gpt-4o-mini',
    4: 'claude-3-haiku',
    5: 'gemini-1.5-pro'
  },
  balanced: {
    1: 'gemini-1.5-flash',
    2: 'gpt-4o-mini',
    3: 'claude-3-haiku',
    4: 'gemini-1.5-pro',
    5: 'claude-3-5-sonnet'
  },
  performance: {
    1: 'gpt-4o-mini',
    2: 'claude-3-haiku',
    3: 'gemini-1.5-pro',
    4: 'gpt-4o',
    5: 'claude-3-5-sonnet'
  }
};

/**
 * Helper to match keywords using word boundaries to prevent false substring matches (e.g. 'solve' matching 'dissolve')
 */
function matchesKeyword(text: string, kw: string): boolean {
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startBoundary = /^\w/.test(kw) ? '\\b' : '';
  const endBoundary = /\w$/.test(kw) ? '\\b' : '';
  const regex = new RegExp(startBoundary + escaped + endBoundary, 'i');
  return regex.test(text);
}

/**
 * Heuristics-based complexity scoring
 */
export function evaluateHeuristics(query: string): HeuristicResult {
  const text = query.trim();
  const len = text.length;
  
  let score = 1.0;
  const logs: string[] = [];

  logs.push(`Analyzing input prompt: length = ${len} characters.`);

  if (len > 1500) {
    score += 1.5;
    logs.push(`Length > 1500 chars (Very Long Input): adding 1.5 complexity points.`);
  } else if (len > 600) {
    score += 1.0;
    logs.push(`Length > 600 chars (Long Input): adding 1.0 complexity points.`);
  } else if (len > 250) {
    score += 0.5;
    logs.push(`Length > 250 chars (Medium Input): adding 0.5 complexity points.`);
  }

  const codeKeywords = [
    'javascript', 'typescript', 'python', 'html', 'css', 'react', 'node', 'express',
    'function', 'class', 'import', 'const', 'let', 'def ', 'return', 'interface',
    'struct', 'public static void', 'pointer', 'array', 'object', 'api', 'regex',
    'json', 'xml', 'database', 'sql', 'query', 'table', 'index', 'querySelector'
  ];
  
  const codeSymbolRegex = /[{}\[\];<>=\+\-\*\/]/.test(text);
  let codeKeywordCount = 0;
  
  codeKeywords.forEach(kw => {
    if (matchesKeyword(text, kw)) {
      codeKeywordCount++;
    }
  });

  if (codeKeywordCount >= 3 || (codeKeywordCount >= 1 && codeSymbolRegex)) {
    score += 1.5;
    logs.push(`Detected strong code/programming patterns: adding 1.5 complexity points.`);
  } else if (codeKeywordCount >= 1) {
    score += 0.75;
    logs.push(`Detected programming keywords: adding 0.75 complexity points.`);
  }

  const mathKeywords = [
    'solve', 'equation', 'calculate', 'integral', 'differential', 'derivative',
    'matrix', 'vector', 'theorem', 'proof', 'probability', 'statistics', 'optimize',
    'algorithm', 'big-o', 'sorting', 'binary tree', 'recursion', 'geometry'
  ];
  
  let mathKeywordCount = 0;
  mathKeywords.forEach(kw => {
    if (matchesKeyword(text, kw)) {
      mathKeywordCount++;
    }
  });

  if (mathKeywordCount >= 2) {
    score += 1.0;
    logs.push(`Detected multi-step math/algorithmic keywords: adding 1.0 complexity points.`);
  } else if (mathKeywordCount >= 1) {
    score += 0.5;
    logs.push(`Detected analytical/math keyword: adding 0.5 complexity points.`);
  }

  const instructionsKeywords = [
    'explain in detail', 'comprehensive', 'architect', 'design a', 'step-by-step',
    'compare and contrast', 'critique', 'summarize the following', 'elaborate'
  ];

  let instructionCount = 0;
  instructionsKeywords.forEach(kw => {
    if (matchesKeyword(text, kw)) {
      instructionCount++;
    }
  });

  if (instructionCount >= 1) {
    score += 0.5;
    logs.push(`Complex instruction modifier detected (e.g. "explain in detail"): adding 0.5 complexity points.`);
  }

  const finalHeurScore = Math.max(1.0, Math.min(5.0, score));
  logs.push(`Heuristic scoring complete. Final score: ${finalHeurScore.toFixed(2)} / 5.0`);

  return {
    score: parseFloat(finalHeurScore.toFixed(2)),
    logs
  };
}

/**
 * AI-Assisted Complexity Scoring (using Gemini Flash / Simulator)
 */
async function getAiComplexity(query: string, keys: ApiKeys = {}): Promise<AiComplexityResult> {
  const hasGeminiKey = keys.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!hasGeminiKey) {
    const wordCount = query.split(/\s+/).length;
    let simulatedScore = 1;
    let reason = "Prompt appears to be a basic conversational greeting.";

    if (query.toLowerCase().includes('code') || query.toLowerCase().includes('program')) {
      simulatedScore = 3;
      reason = "Coding prompt, requiring syntax highlighting and variable tracking.";
      if (wordCount > 100) {
        simulatedScore = 4;
        reason = "Complex code architecture request with multiple structural conditions.";
      }
    } else if (query.toLowerCase().includes('solve') || query.toLowerCase().includes('math')) {
      simulatedScore = 3;
      reason = "Mathematical solution request, requires numerical accuracy.";
    } else if (wordCount > 100) {
      simulatedScore = 3;
      reason = "Long conversational or summary query requiring contextual retention.";
    }

    if (query.toLowerCase().includes('architect') || query.toLowerCase().includes('design a system') || query.toLowerCase().includes('full stack')) {
      simulatedScore = 5;
      reason = "High-level design query requiring comprehensive architectural patterns.";
    }

    await new Promise(resolve => setTimeout(resolve, 250));

    return {
      score: simulatedScore,
      reason,
      logs: [
        `[AI Classifier - Simulated] Classifying query...`,
        `[AI Classifier - Simulated] Decision: Score ${simulatedScore} (Reason: ${reason})`
      ]
    };
  }

  try {
    const classificationPrompt = `You are an AI complexity routing classifier. Your job is to analyze the user's prompt and categorize its logical complexity on a scale of 1 to 5:
1: Extremely simple (greetings, simple yes/no, quick single-token lookups).
2: Simple factual or basic conversation (e.g., "what is the capital of France").
3: Moderate difficulty (basic programming questions, simple translations, text summarization, straightforward algebra).
4: High difficulty (advanced programming, debugging complex code, logical reasoning, multi-step math/science problems).
5: Extreme complexity (system architecture design, philosophical inquiries, highly nuanced logic, or extremely long multi-part instructions).

Respond ONLY with a valid JSON object matching this structure:
{
  "complexityScore": <integer from 1 to 5>,
  "reasoning": "<short sentence describing the complexity drivers>"
}

User Prompt to classify:
"""
${query}
"""`;

    const classifierResult = await queryLLM('gemini-1.5-flash', classificationPrompt, keys);
    
    let text = classifierResult.response.trim();
    if (text.includes('```json')) {
      text = text.substring(text.indexOf('```json') + 7, text.lastIndexOf('```')).trim();
    } else if (text.includes('```')) {
      text = text.substring(text.indexOf('```') + 3, text.lastIndexOf('```')).trim();
    }

    const data = JSON.parse(text);
    const score = Math.max(1, Math.min(5, parseInt(data.complexityScore || '1')));
    const reason = data.reasoning || "Analyzed by classifier model.";

    return {
      score,
      reason,
      logs: [
        `[AI Classifier - Live] Contacted gemini-1.5-flash for evaluation (latency: ${classifierResult.latency}ms).`,
        `[AI Classifier - Live] Classification result: Score ${score} (Reason: ${reason})`
      ]
    };
  } catch (err: any) {
    return {
      score: 3,
      reason: `Failed to classify: ${err.message}. Defaulting to score 3.`,
      logs: [
        `[AI Classifier - Error] Classification request failed: ${err.message}`,
        `[AI Classifier - Fallback] Defaulting AI complexity score to 3.`
      ]
    };
  }
}

/**
 * Route and execute the query
 */
export async function routeQuery(query: string, strategy: string = 'balanced', options: RouteOptions = {}): Promise<RoutingResult> {
  const steps: string[] = [];
  steps.push(`Initializing routing pipeline using strategy: "${strategy.toUpperCase()}"`);

  const heuristicResult = evaluateHeuristics(query);
  steps.push(...heuristicResult.logs);

  const useAiClassifier = options.useAiClassifier !== false;
  let aiScore = heuristicResult.score;
  let aiReason = "AI classification skipped.";

  if (useAiClassifier) {
    steps.push(`Running AI Classifier to inspect cognitive difficulty...`);
    const aiResult = await getAiComplexity(query, options.keys);
    aiScore = aiResult.score;
    aiReason = aiResult.reason;
    steps.push(...aiResult.logs);
  }

  const blendedScore = useAiClassifier 
    ? (heuristicResult.score * 0.4) + (aiScore * 0.6)
    : heuristicResult.score;

  const roundedScore = Math.max(1, Math.min(5, Math.round(blendedScore)));
  steps.push(`Blended Complexity Score: ${blendedScore.toFixed(2)} → Rounded Score: ${roundedScore}`);

  const strategyMap = STRATEGY_MAPPINGS[strategy] || STRATEGY_MAPPINGS.balanced;
  const selectedModel = strategyMap[roundedScore];
  const modelName = MODEL_PRICING[selectedModel].name;
  
  steps.push(`Routing Decision: Forwarding query to **${modelName}** (${selectedModel})`);

  steps.push(`Dispatching query request to ${selectedModel}...`);
  const result = await queryLLM(selectedModel, query, options.keys);
  steps.push(`Received response from ${selectedModel} (Latency: ${result.latency}ms, Simulated: ${result.isSimulated})`);

  const logEntry = await saveLog({
    query,
    strategy,
    heuristicScore: heuristicResult.score,
    aiScore: useAiClassifier ? aiScore : null,
    complexityScore: parseFloat(blendedScore.toFixed(2)),
    routedModel: selectedModel,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    cost: result.cost,
    latency: result.latency,
    success: result.success,
    response: result.response,
    isSimulated: result.isSimulated,
    pipelineLogs: steps
  });

  return {
    ...result,
    logId: logEntry.id,
    complexityScore: blendedScore,
    pipelineLogs: steps
  };
}
