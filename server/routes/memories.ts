import { Router, Request, Response } from 'express';
import fs from 'fs';
import { ingestionPipeline } from '../services/ingestionPipeline.js';
import { searchEngine } from '../services/searchEngine.js';
import { sqliteStore } from '../db/sqliteStore.js';
import { jsonImporter } from '../services/jsonImporter.js';
import { keyRotator } from '../config/keyRotator.js';
import { geminiService } from '../services/geminiService.js';
import { multiverseService } from '../services/multiverseService.js';
import { ttsService } from '../services/ttsService.js';
import multer from 'multer';
import { exec } from 'child_process';
import os from 'os';

const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit
export const router = Router();

// POST /api/memories - Ingest new memory
router.post('/memories', async (req: Request, res: Response) => {
  try {
    const { content, user_notes, force } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content string is required.' });
    }

    const result = await ingestionPipeline.ingest(
      content,
      undefined,
      user_notes,
      Boolean(force)
    );

    return res.status(201).json(result);
  } catch (err: any) {
    console.error('Error ingesting memory:', err);
    return res.status(500).json({ error: err.message || 'Failed to process memory.' });
  }
});

// POST /api/upload - Handle file upload ingestion
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const fileMeta = {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      buffer: req.file.buffer,
    };

    const userNotes = req.body.user_notes || '';
    const result = await ingestionPipeline.ingest(
      req.file.originalname,
      fileMeta,
      userNotes,
      true
    );

    return res.status(201).json(result);
  } catch (err: any) {
    console.error('Error uploading file memory:', err);
    return res.status(500).json({ error: err.message || 'File upload processing failed.' });
  }
});

// GET /api/memories - Get list of memories
router.get('/memories', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const memories = sqliteStore.getAllMemories(limit, offset);
    return res.json({ memories, total: memories.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/memories/:id - Get detailed memory with graph connections
router.get('/memories/:id', (req: Request, res: Response) => {
  try {
    const memory = sqliteStore.getMemoryById(req.params.id);
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found.' });
    }
    const relationships = sqliteStore.getEdgesForMemory(memory.id);
    return res.json({ ...memory, relationships });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/memories/:id - Update memory details
router.put('/memories/:id', (req: Request, res: Response) => {
  try {
    const memory = sqliteStore.getMemoryById(req.params.id);
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found.' });
    }

    const { title, user_notes, category, favorite } = req.body;
    if (title !== undefined) memory.title = title;
    if (user_notes !== undefined) memory.user_notes = user_notes;
    if (category !== undefined) memory.category = category;
    if (favorite !== undefined) memory.favorite = Boolean(favorite);
    memory.updated_at = new Date().toISOString();

    sqliteStore.saveMemory(memory);
    return res.json(memory);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/memories/:id - Delete memory
router.delete('/memories/:id', (req: Request, res: Response) => {
  try {
    const success = sqliteStore.deleteMemory(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Memory not found or already deleted.' });
    }
    return res.json({ message: 'Memory deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/memories/:id/favorite - Toggle favorite status
router.post('/memories/:id/favorite', (req: Request, res: Response) => {
  try {
    const isFav = sqliteStore.toggleFavorite(req.params.id);
    return res.json({ favorite: isFav });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/search - Hybrid semantic + keyword search
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, session_id, category } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query string is required.' });
    }

    const result = await searchEngine.search(
      query,
      session_id || 'default-session',
      category || undefined
    );

    return res.json(result);
  } catch (err: any) {
    console.error('Error executing search:', err);
    return res.status(500).json({ error: err.message || 'Search execution failed.' });
  }
});

// GET /api/graph - Graph visualization dataset with Level-of-Detail limit
router.get('/graph', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 250;
    const category = (req.query.category as string) || undefined;
    const graphData = sqliteStore.getAllGraphData();

    let filteredNodes = graphData.nodes;
    if (category) {
      filteredNodes = filteredNodes.filter(
        (n) => n.category && n.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Limit nodes for 90+ FPS rendering performance
    const nodeSlice = filteredNodes.slice(0, limit);
    const nodeIds = new Set(nodeSlice.map((n) => n.id));

    const edgeSlice = graphData.edges.filter(
      (e) => nodeIds.has(e.source_id) && nodeIds.has(e.target_id)
    );

    const formatted = {
      nodes: nodeSlice.map((n) => ({
        id: n.id,
        label: n.label,
        type: n.type,
        category: n.category,
      })),
      edges: edgeSlice.map((e) => ({
        id: e.id,
        source: e.source_id,
        target: e.target_id,
        label: e.relationship_type,
        weight: e.weight,
      })),
    };
    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/categories - Aggregate categories with memory counts
router.get('/categories', (req: Request, res: Response) => {
  try {
    const categories = sqliteStore.getAllCategories();
    return res.json({ categories });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/concepts - Aggregate concepts
router.get('/concepts', (req: Request, res: Response) => {
  try {
    const concepts = sqliteStore.getAllConcepts();
    return res.json({ concepts });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/import - Bulk import JSON memories
router.post('/import', async (req: Request, res: Response) => {
  try {
    const jsonItems = req.body;
    if (!Array.isArray(jsonItems)) {
      return res.status(400).json({ error: 'Payload must be a JSON array of memory records.' });
    }

    const result = await jsonImporter.importJSON(jsonItems);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/path/open - Local Windows File Explorer Bridge
router.post('/path/open', (req: Request, res: Response) => {
  try {
    const { local_path } = req.body;
    if (!local_path) {
      return res.status(400).json({ error: 'local_path parameter is required.' });
    }

    const platform = os.platform();
    if (platform === 'win32') {
      // Windows explorer command
      const cmd = `explorer.exe /select,"${local_path.replace(/"/g, '\\"')}"`;
      exec(cmd, (err) => {
        if (err) {
          // Fallback to opening folder directly if file select fails
          exec(`explorer.exe "${local_path.replace(/"/g, '\\"')}"`);
        }
      });
      return res.json({ success: true, message: 'File Explorer bridge triggered on Windows.' });
    } else if (platform === 'darwin') {
      exec(`open -R "${local_path}"`);
      return res.json({ success: true, message: 'Finder opened.' });
    } else {
      exec(`xdg-open "${local_path}"`);
      return res.json({ success: true, message: 'File manager opened.' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/key/slots - Get detailed health status of all 20 key slots
router.get('/key/slots', (req: Request, res: Response) => {
  return res.json({
    activeKeys: keyRotator.activeKeyCount,
    slots: keyRotator.getSlotStatus(),
    recentLogs: keyRotator.getLogs().slice(0, 20),
  });
});

// POST /api/key/pool - Update pool of up to 20 Gemini API keys
router.post('/key/pool', (req: Request, res: Response) => {
  try {
    const { keys } = req.body;
    if (!Array.isArray(keys)) {
      return res.status(400).json({ error: 'keys parameter must be an array of API key strings.' });
    }

    keyRotator.setKeysManually(keys);
    return res.json({
      success: true,
      message: `Updated pool with ${keyRotator.activeKeyCount} valid Gemini API keys!`,
      slots: keyRotator.getSlotStatus(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/key/test - Test Gemini API Key validity
router.post('/key/test', async (req: Request, res: Response) => {
  try {
    const testKey = req.body.apiKey || process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY;
    if (!testKey || !testKey.trim()) {
      return res.status(400).json({
        success: false,
        error: 'No API Key provided. Please enter a Gemini API Key to test.',
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${testKey.trim()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with OK if API key is working.' }] }],
        }),
      }
    );

    if (response.ok) {
      const data: any = await response.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'OK';
      return res.json({
        success: true,
        message: 'Gemini API Key is ACTIVE and working perfectly!',
        modelReply: reply.trim(),
      });
    } else {
      const errText = await response.text();
      return res.status(400).json({
        success: false,
        error: `Gemini API returned status ${response.status}: ${errText.substring(0, 150)}`,
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Network test failed: ${err.message}`,
    });
  }
});

// POST /api/key/save - Update API key in .env and reload rotator
router.post('/key/save', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'apiKey string is required.' });
    }

    const trimmedKey = apiKey.trim();
    process.env.GEMINI_API_KEY_1 = trimmedKey;

    // Update .env file on disk
    const envPath = './.env';
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
    if (envContent.includes('GEMINI_API_KEY_1=')) {
      envContent = envContent.replace(/GEMINI_API_KEY_1=.*/, `GEMINI_API_KEY_1=${trimmedKey}`);
    } else {
      envContent += `\nGEMINI_API_KEY_1=${trimmedKey}\n`;
    }
    fs.writeFileSync(envPath, envContent, 'utf-8');

    // Reload rotator
    keyRotator['keys'] = [{ key: trimmedKey, index: 0, isRateLimited: false, rateLimitResetTime: 0, failureCount: 0, successCount: 0 }];

    return res.json({
      success: true,
      message: 'Gemini API key saved to .env and activated successfully!',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/memories/reprocess - Re-run AI categorization on memories
router.post('/memories/reprocess', async (req: Request, res: Response) => {
  try {
    const memories = sqliteStore.getAllMemories(200);
    let count = 0;
    for (const mem of memories) {
      if (mem.category === 'Uncategorized' || mem.category === 'Ideas & Notes') {
        const aiResult = await geminiService.analyzeMemory(mem.original_content, mem.type);
        if (aiResult) {
          mem.title = aiResult.title || mem.title;
          mem.category = aiResult.categories[0] || 'General';
          mem.summary = aiResult.summary || mem.summary;
          mem.concepts = aiResult.concepts;
          mem.tags = aiResult.tags;
          mem.updated_at = new Date().toISOString();
          sqliteStore.saveMemory(mem);
          count++;
        }
      }
    }
    return res.json({ success: true, reprocessedCount: count });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/multiverse/round - Trigger live 4-Gemini Agent council discussion round
router.post('/multiverse/round', async (req: Request, res: Response) => {
  try {
    const { topic } = req.body || {};
    const messages = await multiverseService.runLiveCouncilRound(topic);
    return res.json({ success: true, messages });
  } catch (err: any) {
    console.error('Multiverse round error:', err);
    return res.status(500).json({ error: err.message || 'Multiverse council round failed.' });
  }
});

// GET /api/multiverse/agents - Get metadata for 4 Gemini persona agents
router.get('/multiverse/agents', (req: Request, res: Response) => {
  return res.json({ agents: multiverseService.getAgentConfigs() });
});

// POST /api/tts - Synthesize search match script with Gemini key rotator
router.post('/tts', async (req: Request, res: Response) => {
  try {
    const payload = req.body || {};
    const result = await ttsService.generateSpeechScript(payload);
    return res.json(result);
  } catch (err: any) {
    console.error('TTS endpoint error:', err);
    return res.status(500).json({ error: err.message || 'TTS synthesis failed.' });
  }
});

// GET /api/health - Health status & key rotator logs
router.get('/health', (req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    app: 'MIND Personal AI Second Brain',
    activeKeys: keyRotator.activeKeyCount,
    keyLogs: keyRotator.getLogs().slice(0, 15),
    timestamp: new Date().toISOString(),
  });
});
