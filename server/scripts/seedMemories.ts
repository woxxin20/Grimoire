import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { MemoryNode, MemoryType } from '../../src/types/memory.js';

const storageDir = './data/storage';
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}
const dbFilePath = path.join(storageDir, 'mind_data.json');

console.log('[SeedScript] Batch generating 1,000 rich structured memories...');

let data: any = {
  memories: {},
  graph_nodes: {},
  graph_edges: {},
  search_sessions: {},
};

if (fs.existsSync(dbFilePath)) {
  try {
    data = JSON.parse(fs.readFileSync(dbFilePath, 'utf-8'));
  } catch (e) {}
}

const categories = [
  {
    name: 'Artificial Intelligence',
    topics: [
      'RuVector High Performance Vector Store',
      'Gemini Embedding 2 Multimodal Representation',
      'RAG Hybrid Vector and Keyword Retrieval',
      'Autonomous Agent Swarm Orchestration',
      'Prompt Engineering System Prompts',
      'Transformer Attention Mechanism Math',
      'LLM Fine-tuning LORA Adapters',
      'Vector Cosine Similarity Re-ranking',
      'Context-Aware Search Session Memory',
      'Local Ollama and Quantized GGUF Models',
    ],
    type: 'text' as MemoryType,
  },
  {
    name: 'Programming & Web',
    topics: [
      'React 19 Server Components and Actions',
      'TypeScript Strict Type Guard Utilities',
      'Vite HMR Fast Build Architecture',
      'Tailwind CSS Obsidian Dark Glassmorphism',
      'Express REST API Route Controller Pattern',
      'Node.js Async Context Execution',
      'WebSockets Real-time Graph Synchronization',
      'Zustand Global State Management',
      'Framer Motion Smooth Canvas Transitions',
      'GraphQL Schema Directive Federation',
    ],
    type: 'code' as MemoryType,
  },
  {
    name: 'Android & Kotlin',
    topics: [
      'Kotlin Coroutines Flow and Channel Operators',
      'Jetpack Compose Dynamic UI Layout Math',
      'Hilt Dependency Injection Singleton Modules',
      'Room Database Vector Index Caching',
      'MVVM Clean Architecture Repository Pattern',
      'Kotlin Multiplatform KMP Shared Business Logic',
      'Android NDK C++ Performance Bindings',
      'Retrofit OkHttp Network Interceptors',
      'WorkManager Background Job Scheduler',
      'Android Material 3 Dynamic Color Palette',
    ],
    type: 'code' as MemoryType,
  },
  {
    name: 'Information Security',
    topics: [
      'Gemini API Key Rotation and Failover Manager',
      'OAuth 2.0 PKCE Authorization Code Grant',
      'JWT Bearer Token Refresh Rotation',
      'AES-256 GCM Local File Encryption',
      'Docker Container Non-Root Security User',
      'SSRF Mitigation URL Whitelist Validator',
      'Content Security Policy CSP Headers',
      'Argon2id Hashing Password Storage',
      'Linux IPTables Firewall Rule Hardening',
      'Zero Trust Private Network Architecture',
    ],
    type: 'text' as MemoryType,
  },
  {
    name: 'Creative & Music',
    topics: [
      'Cinematic Dark Synthwave Bassline Prompt',
      'Female Stutter Vocal Chopped Audio Effect',
      'FL Studio 24 Audio Processing Pipeline',
      'FLUX Image Generation Prompt Styles',
      'Midjourney v6 Photorealistic Lighting Prompt',
      'Synthesizer Sub-Bass Waveform Modulation',
      'Ambient Chillout Atmospheric Pads',
      'Suno AI Lyric Generation Structure',
      'Film Scoring Orchestral Brass Stabs',
      'Reverb Decay and Equalizer Sound Design',
    ],
    type: 'text' as MemoryType,
  },
  {
    name: 'Culture & Devotional',
    topics: [
      'Gujarati Devotional Blessing Ram Bhagawan Jai',
      'Sanskrit Shloka Karma Yoga Philosophy',
      'Bhagavad Gita Chapter 2 Verse 47 Insight',
      'Daily Meditation Mindfulness Practice',
      'Traditional Heritage Wisdom Quotes',
      'Sanskrit Stotram Chanting Cadence',
      'Ancient Indian Architecture Geometry',
      'Gujarati Proverbs and Folk Wisdom',
      'Peaceful Mind Meditation Notes',
      'Universal Harmony and Spiritual Gratitude',
    ],
    type: 'text' as MemoryType,
  },
  {
    name: 'Business & Ideas',
    topics: [
      'SaaS Micro-Subscription Business Model',
      'AI Second Brain Monetization Strategy',
      'Product-Led Growth PLG Onboarding Flow',
      'Customer Lifetime Value LTV CAC Math',
      'Niche B2B Workflow Automation Startup',
      'Freemium Tier Limits and Conversion Rate',
      'Organic SEO Content Strategy Engine',
      'Investor Seed Pitch Deck Outline',
      'Stripe Payment Gateway Integration Pattern',
      'Customer Retention Feedback Loop Architecture',
    ],
    type: 'text' as MemoryType,
  },
  {
    name: 'Research & Science',
    topics: [
      'Quantum Computing Qubit Entanglement Paper',
      'Neuroscience Human Memory Consolidation',
      'Graph Theory Shortest Path Dijkstra Algorithm',
      'Statistical Hypothesis Testing P-Value Math',
      'Deep Learning Loss Function Gradient Descent',
      'Synthetic Data Generation Benchmarks',
      'Cognitive Psychology Second Brain Theory',
      'Distributed Systems Raft Consensus Protocol',
      'High-Throughput Disk I/O Performance Benchmark',
      'Biomedical AI Protein Folding AlphaFold Notes',
    ],
    type: 'text' as MemoryType,
  },
  {
    name: 'Computer & Files',
    topics: [
      'C:\\Projects\\PersonalMind\\server\\index.ts',
      'C:\\Projects\\MyApp\\app\\src\\main\\java\\MainActivity.kt',
      'C:\\Projects\\AiEngine\\models\\ruvector_config.json',
      'C:\\Projects\\MusicPrompts\\cinematic_dark_bass.prompt',
      'C:\\Projects\\AndroidApp\\build.gradle.kts',
      'C:\\Projects\\Scripts\\backup_mind_database.ps1',
      'C:\\Projects\\Docker\\docker-compose.yml',
      'C:\\Projects\\Docs\\architecture_diagram.drawio',
      'C:\\Projects\\WebSite\\src\\components\\MindGraph.tsx',
      'C:\\Projects\\Tests\\unit_tests_key_rotator.test.ts',
    ],
    type: 'local_path' as MemoryType,
  },
  {
    name: 'Research & Web',
    topics: [
      'https://github.com/google-gemini/gemini-api',
      'https://ruvector.io/docs/quickstart',
      'https://react.dev/reference/react/useActionState',
      'https://tailwindcss.com/docs/dark-mode',
      'https://vitejs.dev/guide/features.html',
      'https://kotlinlang.org/docs/coroutines-overview.html',
      'https://expressjs.com/en/4x/api.html',
      'https://arxiv.org/abs/2312.11805',
      'https://huggingface.co/models',
      'https://developer.android.com/jetpack/compose',
    ],
    type: 'url' as MemoryType,
  },
];

function generateVector(text: string, dim = 768): number[] {
  const vec = new Array(dim).fill(0);
  const words = text.toLowerCase().match(/\b[a-z0-9_-]{2,}\b/g) || [];
  if (words.length === 0) {
    vec[0] = 1.0;
    return vec;
  }
  for (let i = 0; i < words.length; i++) {
    let hash = 0;
    for (let c = 0; c < words[i].length; c++) {
      hash = (hash << 5) - hash + words[i].charCodeAt(c);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dim;
    vec[idx] += 1.0 / (i + 1);
  }
  let sum = 0;
  for (let i = 0; i < dim; i++) sum += vec[i] * vec[i];
  const norm = Math.sqrt(sum) || 1.0;
  for (let i = 0; i < dim; i++) vec[i] /= norm;
  return vec;
}

const startTime = Date.now();
let newCount = 0;

for (let i = 1; i <= 1000; i++) {
  const catObj = categories[i % categories.length];
  const topic = catObj.topics[i % catObj.topics.length];
  const memoryId = `mem_seed_${i}_${crypto.randomBytes(3).toString('hex')}`;
  const timestamp = new Date(Date.now() - (1000 - i) * 3600 * 1000).toISOString();

  let originalContent = '';
  let title = `${topic} #${i}`;
  let sourceUrl = null;
  let localPath = null;

  if (catObj.type === 'local_path') {
    localPath = topic;
    originalContent = topic;
    title = topic.split('\\').pop() || topic;
  } else if (catObj.type === 'url') {
    sourceUrl = topic;
    originalContent = topic;
    title = `Documentation: ${topic.replace('https://', '')}`;
  } else if (catObj.type === 'code') {
    originalContent = `// ${topic} Implementation #${i}\nfunction processKnowledgeItem_${i}() {\n  const key = "GEMINI_KEY_${(i % 4) + 1}";\n  return { status: "active", category: "${catObj.name}" };\n}`;
  } else {
    originalContent = `${topic}. Detailed technical and conceptual note #${i} stored in personal mind knowledge engine. Preserved exactly untouched for semantic search and graph exploration.`;
  }

  const hash = crypto.createHash('sha256').update(originalContent).digest('hex');
  const embedding = generateVector(`${title} ${catObj.name} ${topic}`);

  const concepts = [
    topic.split(' ')[0],
    topic.split(' ')[1] || 'Concept',
    catObj.name,
  ];

  const tags = [
    catObj.name.toLowerCase().replace(/\s+&?\s+/g, '-'),
    topic.split(' ')[0].toLowerCase(),
    `item-${i}`,
  ];

  const memory: MemoryNode = {
    id: memoryId,
    type: catObj.type,
    original_content: originalContent,
    title,
    source_url: sourceUrl,
    local_path: localPath,
    file_name: localPath ? title : null,
    mime_type: null,
    category: catObj.name,
    subcategory: topic.split(' ')[0],
    tags,
    keywords: concepts,
    entities: [catObj.name],
    concepts,
    summary: `Automated knowledge entry for ${topic} in category ${catObj.name}.`,
    analysis: `Stored node in personal mind knowledge graph. High semantic relevance for ${catObj.name}.`,
    user_notes: i % 5 === 0 ? 'Important reference note.' : null,
    raw_content: originalContent,
    raw_content_preview: originalContent.substring(0, 200),
    embedding,
    importance_score: (i % 5) + 5,
    confidence_score: 0.95,
    favorite: i % 12 === 0,
    content_hash: hash,
    created_at: timestamp,
    updated_at: timestamp,
  };

  data.memories[memoryId] = memory;
  data.graph_nodes[memoryId] = {
    id: memoryId,
    type: 'memory',
    label: title,
    category: catObj.name,
    memory_id: memoryId,
    created_at: timestamp,
  };

  // Concept nodes
  for (const c of concepts) {
    const cId = `concept:${c.toLowerCase().trim()}`;
    data.graph_nodes[cId] = {
      id: cId,
      type: 'concept',
      label: c,
      category: 'Concept',
      created_at: timestamp,
    };
    data.graph_edges[`edge:${memoryId}->${cId}`] = {
      id: `edge:${memoryId}->${cId}`,
      source_id: memoryId,
      target_id: cId,
      relationship_type: 'RELATED_TO',
      weight: 0.8,
      confidence: 0.9,
      created_at: timestamp,
    };
  }

  // Category node
  const catId = `category:${catObj.name.toLowerCase().trim()}`;
  data.graph_nodes[catId] = {
    id: catId,
    type: 'category',
    label: catObj.name,
    category: 'Category',
    created_at: timestamp,
  };
  data.graph_edges[`edge:${memoryId}->${catId}`] = {
    id: `edge:${memoryId}->${catId}`,
    source_id: memoryId,
    target_id: catId,
    relationship_type: 'PART_OF',
    weight: 1.0,
    confidence: 1.0,
    created_at: timestamp,
  };

  newCount++;
}

// Single Atomic Write to Disk!
fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');

const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`=======================================================`);
console.log(`  ATOMIC SEED SUCCESS! Inserted ${newCount} memories!`);
console.log(`  Total DB Memories: ${Object.keys(data.memories).length}`);
console.log(`  Time Elapsed: ${elapsed} seconds`);
console.log(`=======================================================`);
