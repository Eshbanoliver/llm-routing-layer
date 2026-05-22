import { queryLLM, MODEL_PRICING } from './llmProviders.js';
import { saveLog } from './db.js';

// Strategy-to-Model Mapping tables based on final complexity score (1 to 5)
const STRATEGY_MAPPINGS = {
  // Cost Minimized: Keep costs as low as possible
  cost: {
    1: 'gemini-1.5-flash', // Cheapest
    2: 'gemini-1.5-flash',
    3: 'gpt-4o-mini',
    4: 'claude-3-haiku',
    5: 'gemini-1.5-pro'   // Medium tier but cheaper than Claude Sonnet / GPT-4o
  },
  
  // Balanced: Standard tradeoff between cost and performance
  balanced: {
    1: 'gemini-1.5-flash',
    2: 'gpt-4o-mini',
    3: 'claude-3-haiku',
    4: 'gemini-1.5-pro',
    5: 'claude-3-5-sonnet' // Premium model only for score 5
  },

  // Performance Maximized: Quality first, routing to higher models sooner
  performance: {
    1: 'gpt-4o-mini',
    2: 'claude-3-haiku',
    3: 'gemini-1.5-pro',
    4: 'gpt-4o',
    5: 'claude-3-5-sonnet'
  }
};

/**
 * Heuristics-based complexity scoring
 * Analyzes string features to return a score from 1.0 to 5.0
 */
export function evaluateHeuristics(query) {
  const text = query.trim();
  const len = text.length;
  
  let score = 1.0;
  const logs = [];

  logs.push(`Analyzing input prompt: length = ${len} characters.`);

  // 1. Length scoring (up to +1.5 points)
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

  // 2. Code detection (up to +1.5 points)
  const codeKeywords = [
    'javascript', 'typescript', 'python', 'html', 'css', 'react', 'node', 'express',
    'function', 'class', 'import', 'const', 'let', 'def ', 'return', 'interface',
    'struct', 'public static void', 'pointer', 'array', 'object', 'api', 'regex',
    'json', 'xml', 'database', 'sql', 'query', 'table', 'index', 'querySelector'
  ];
  
  const codeSymbolRegex = /[{}\[\];<>=\+\-\*\/]/.test(text);
  let codeKeywordCount = 0;
  
  codeKeywords.forEach(kw => {
    if (text.toLowerCase().includes(kw)) {
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

  // 3. Logic & Math words (up to +1.0 points)
  const mathKeywords = [
    'solve', 'equation', 'calculate', 'integral', 'differential', 'derivative',
    'matrix', 'vector', 'theorem', 'proof', 'probability', 'statistics', 'optimize',
    'algorithm', 'big-o', 'sorting', 'binary tree', 'recursion', 'geometry'
  ];
  
  let mathKeywordCount = 0;
  mathKeywords.forEach(kw => {
    if (text.toLowerCase().includes(kw)) {
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

  // 4. Instructions complexity indicator (up to +1.0 points)
  const instructionsKeywords = [
    'explain in detail', 'comprehensive', 'architect', 'design a', 'step-by-step',
    'compare and contrast', 'critique', 'summarize the following', 'elaborate'
  ];

  let instructionCount = 0;
  instructionsKeywords.forEach(kw => {
    if (text.toLowerCase().includes(kw)) {
      instructionCount++;
    }
  });

  if (instructionCount >= 1) {
    score += 0.5;
    logs.push(`Complex instruction modifier detected (e.g. "explain in detail"): adding 0.5 complexity points.`);
  }

  // Cap at 5.0 and floor at 1.0
  const finalHeurScore = Math.max(1.0, Math.min(5.0, score));
  logs.push(`Heuristic scoring complete. Final score: ${finalHeurScore.toFixed(2)} / 5.0`);

  return {
    score: parseFloat(finalHeurScore.toFixed(2)),
    logs
  };
}

/**
 * AI-Assisted Complexity Scoring (using Gemini Flash / Simulator)
 * Queries a cheap model with a system prompt asking to classify the query from 1 to 5.
 */
async function getAiComplexity(query, keys = {}) {
  // If we are simulating or doing a quick check, we can return a mock or call Gemini Flash if keys are available
  const hasGeminiKey = keys.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!hasGeminiKey) {
    // Simulated AI classification response
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

    // Add a slight delay to simulate API processing
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

  // Real AI classification using Gemini Flash
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

    // Query gemini-1.5-flash as the classifier
    const classifierResult = await queryLLM('gemini-1.5-flash', classificationPrompt, keys);
    
    // Clean response text to parse JSON
    let text = classifierResult.response.trim();
    if (text.includes('```json')) {
      text = text.substring(text.indexOf('```json') + 7, text.lastIndexOf('```')).trim();
    } else if (text.includes('```')) {
      text = text.substring(text.indexOf('```') + 3, text.lastIndexOf('```')).trim();
    }

    const data = JSON.parse(text);
    const score = Math.max(1, Math.min(5, parseInt(data.complexityScore || 1)));
    const reason = data.reasoning || "Analyzed by classifier model.";

    return {
      score,
      reason,
      logs: [
        `[AI Classifier - Live] Contacted gemini-1.5-flash for evaluation (latency: ${classifierResult.latency}ms).`,
        `[AI Classifier - Live] Classification result: Score ${score} (Reason: ${reason})`
      ]
    };
  } catch (err) {
    return {
      score: 3, // Safe default in case of error
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
export async function routeQuery(query, strategy = 'balanced', options = {}) {
  const steps = [];
  steps.push(`Initializing routing pipeline using strategy: "${strategy.toUpperCase()}"`);

  // 1. Run Heuristic analysis
  const heuristicResult = evaluateHeuristics(query);
  steps.push(...heuristicResult.logs);

  // 2. Run AI Analysis (if enabled or defaulted)
  const useAiClassifier = options.useAiClassifier !== false;
  let aiScore = heuristicResult.score; // Fallback to heuristic
  let aiReason = "AI classification skipped.";

  if (useAiClassifier) {
    steps.push(`Running AI Classifier to inspect cognitive difficulty...`);
    const aiResult = await getAiComplexity(query, options.keys);
    aiScore = aiResult.score;
    aiReason = aiResult.reason;
    steps.push(...aiResult.logs);
  }

  // 3. Compute final blended score
  // Blended formula: 40% heuristic, 60% AI classifier
  const blendedScore = useAiClassifier 
    ? (heuristicResult.score * 0.4) + (aiScore * 0.6)
    : heuristicResult.score;

  const roundedScore = Math.max(1, Math.min(5, Math.round(blendedScore)));
  steps.push(`Blended Complexity Score: ${blendedScore.toFixed(2)} → Rounded Score: ${roundedScore}`);

  // 4. Select model
  const strategyMap = STRATEGY_MAPPINGS[strategy] || STRATEGY_MAPPINGS.balanced;
  const selectedModel = strategyMap[roundedScore];
  const modelName = MODEL_PRICING[selectedModel].name;
  
  steps.push(`Routing Decision: Forwarding query to **${modelName}** (${selectedModel})`);

  // 5. Query the model
  steps.push(`Dispatching query request to ${selectedModel}...`);
  const result = await queryLLM(selectedModel, query, options.keys);
  steps.push(`Received response from ${selectedModel} (Latency: ${result.latency}ms, Simulated: ${result.isSimulated})`);

  // 6. Log in Database
  const logEntry = saveLog({
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
