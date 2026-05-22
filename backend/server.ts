import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { routeQuery } from './routerService.js';
import { queryLLM, MODEL_PRICING, ApiKeys } from './llmProviders.js';
import { getStats, updateFeedback, clearLogs } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Helper to extract keys from headers
function getKeysFromHeaders(req: Request): ApiKeys {
  return {
    GEMINI_API_KEY: (req.headers['x-gemini-key'] as string) || null,
    OPENAI_API_KEY: (req.headers['x-openai-key'] as string) || null,
    ANTHROPIC_API_KEY: (req.headers['x-anthropic-key'] as string) || null
  };
}

/**
 * Route a single query dynamically
 */
app.post('/api/route', async (req: Request, res: Response): Promise<any> => {
  const { query, strategy, useAiClassifier } = req.body;

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  const keys = getKeysFromHeaders(req);

  try {
    const result = await routeQuery(query, strategy || 'balanced', {
      useAiClassifier: useAiClassifier !== false,
      keys
    });
    res.json(result);
  } catch (error: any) {
    console.error('Routing error:', error);
    res.status(500).json({ error: error.message || 'An error occurred during routing' });
  }
});

/**
 * Compare multiple models side-by-side
 */
app.post('/api/compare', async (req: Request, res: Response): Promise<any> => {
  const { query, models } = req.body;

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  const modelsToCompare = Array.isArray(models) && models.length > 0 
    ? models 
    : ['gemini-1.5-flash', 'gpt-4o-mini', 'gemini-1.5-pro', 'claude-3-5-sonnet'];

  const keys = getKeysFromHeaders(req);
  
  try {
    const comparisonPromises = modelsToCompare.map(async (model: string) => {
      try {
        const result = await queryLLM(model, query, keys);
        return {
          model,
          ...result
        };
      } catch (err: any) {
        return {
          model,
          success: false,
          error: err.message
        };
      }
    });

    const results = await Promise.all(comparisonPromises);
    res.json({ results });
  } catch (error: any) {
    console.error('Comparison error:', error);
    res.status(500).json({ error: error.message || 'An error occurred during comparison' });
  }
});

/**
 * Get aggregated analytics stats
 */
app.get('/api/stats', (_req: Request, res: Response) => {
  try {
    const stats = getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

/**
 * Submit user feedback on a routing choice
 */
app.post('/api/feedback', (req: Request, res: Response): any => {
  const { id, feedback } = req.body;

  if (!id || !feedback) {
    return res.status(400).json({ error: 'Log ID and feedback type are required' });
  }

  try {
    const updated = updateFeedback(id, feedback);
    if (updated) {
      res.json({ success: true, log: updated });
    } else {
      res.status(404).json({ error: 'Log entry not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

/**
 * Get available models and pricing metadata
 */
app.get('/api/models', (_req: Request, res: Response) => {
  res.json(MODEL_PRICING);
});

/**
 * Clear analytics logs
 */
app.post('/api/clear', (_req: Request, res: Response) => {
  try {
    const success = clearLogs();
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`LLM Routing Gateway running on http://localhost:${PORT}`);
});
