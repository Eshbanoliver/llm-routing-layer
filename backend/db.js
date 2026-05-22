import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'metrics.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure metrics.json exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
}

// Standard costs (per 1M tokens) for comparison
// We use Claude 3.5 Sonnet as the "benchmark premium model" to compare against for savings
const PREMIUM_MODEL_COSTS = {
  input: 3.00 / 1000000,   // $3.00 per M tokens
  output: 15.00 / 1000000  // $15.00 per M tokens
};

export function getLogs() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading db file:', error);
    return [];
  }
}

export function saveLog(logData) {
  try {
    const logs = getLogs();
    
    // Add default savings calculation if not provided
    if (logData.success && typeof logData.savings === 'undefined') {
      const inputTokens = logData.inputTokens || 0;
      const outputTokens = logData.outputTokens || 0;
      
      const premiumCost = (inputTokens * PREMIUM_MODEL_COSTS.input) + (outputTokens * PREMIUM_MODEL_COSTS.output);
      const actualCost = logData.cost || 0;
      logData.savings = Math.max(0, premiumCost - actualCost);
    }

    const newLog = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      feedback: null,
      ...logData
    };

    logs.push(newLog);
    fs.writeFileSync(DB_FILE, JSON.stringify(logs, null, 2), 'utf-8');
    return newLog;
  } catch (error) {
    console.error('Error saving log to db:', error);
    return logData;
  }
}

export function updateFeedback(id, feedbackType) {
  try {
    const logs = getLogs();
    const index = logs.findIndex(log => log.id === id);
    if (index !== -1) {
      logs[index].feedback = feedbackType; // 'thumbs-up' or 'thumbs-down'
      fs.writeFileSync(DB_FILE, JSON.stringify(logs, null, 2), 'utf-8');
      return logs[index];
    }
    return null;
  } catch (error) {
    console.error('Error updating feedback in db:', error);
    return null;
  }
}

export function getStats() {
  const logs = getLogs();
  const successfulLogs = logs.filter(log => log.success);
  
  const totalQueries = logs.length;
  const successRate = totalQueries > 0 ? (successfulLogs.length / totalQueries) * 100 : 0;
  
  let totalCost = 0;
  let totalSavings = 0;
  let totalLatency = 0;
  
  const modelDistribution = {};
  
  successfulLogs.forEach(log => {
    totalCost += log.cost || 0;
    totalSavings += log.savings || 0;
    totalLatency += log.latency || 0;
    
    const model = log.routedModel || 'unknown';
    modelDistribution[model] = (modelDistribution[model] || 0) + 1;
  });

  const avgLatency = successfulLogs.length > 0 ? totalLatency / successfulLogs.length : 0;
  
  return {
    totalQueries,
    successRate: parseFloat(successRate.toFixed(2)),
    totalCost: parseFloat(totalCost.toFixed(6)),
    totalSavings: parseFloat(totalSavings.toFixed(6)),
    avgLatency: Math.round(avgLatency),
    modelDistribution,
    history: logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      query: log.query.substring(0, 60) + (log.query.length > 60 ? '...' : ''),
      complexityScore: log.complexityScore,
      routedModel: log.routedModel,
      cost: log.cost,
      savings: log.savings,
      latency: log.latency,
      success: log.success,
      feedback: log.feedback
    }))
  };
}

export function clearLogs() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error clearing db:', error);
    return false;
  }
}
