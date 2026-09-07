export type MemoryType =
  | 'text'
  | 'url'
  | 'file'
  | 'image'
  | 'audio'
  | 'video'
  | 'local_path'
  | 'json'
  | 'code';

export type RelationshipType =
  | 'RELATED_TO'
  | 'SAME_TOPIC'
  | 'SAME_PROJECT'
  | 'SAME_TOOL'
  | 'EXTENDS'
  | 'CONTRADICTS'
  | 'REFERENCES'
  | 'INSPIRED_BY'
  | 'DEPENDS_ON'
  | 'ALTERNATIVE_TO'
  | 'DUPLICATE_OF'
  | 'PART_OF'
  | 'CREATED_FROM';

export interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  relationship_type: RelationshipType;
  weight: number;
  confidence: number;
  target_title?: string;
  target_type?: string;
  target_category?: string;
  created_at?: string;
}

export interface MemoryNode {
  id: string;
  type: MemoryType;
  original_content: string;
  title: string;
  source_url?: string | null;
  local_path?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  category: string;
  subcategory?: string | null;
  tags: string[];
  keywords: string[];
  entities: string[];
  concepts: string[];
  summary: string;
  analysis: string;
  user_notes?: string | null;
  raw_content: string;
  raw_content_preview: string;
  embedding?: number[] | null;
  importance_score: number;
  confidence_score: number;
  favorite: boolean;
  content_hash?: string;
  created_at: string;
  updated_at: string;

  // Graph context when fetched with details
  relationships?: GraphEdge[];
}

export interface MemorySearchResult extends MemoryNode {
  mind_match_score: number; // 0 - 100 percentage Mind Match
  match_reason: string;
  distance?: number;
}

export interface NodeSearchResult {
  id: string;
  label: string;
  type: 'concept' | 'category' | 'memory' | 'technology';
  category?: string;
  storage_location: string;
  connected_nodes: Array<{
    id: string;
    label: string;
    relationship_type: string;
  }>;
  match_score: number;
}

export interface SearchResponse {
  query: string;
  query_understanding?: {
    intent: string;
    expanded_query: string;
    entities: string[];
    concepts: string[];
    categories: string[];
    keywords: string[];
  };
  primary_match: MemorySearchResult | null;
  strong_matches: MemorySearchResult[];
  connected_memories: MemorySearchResult[];
  matched_nodes?: NodeSearchResult[];
  possible_matches: MemorySearchResult[];
  related_concepts: string[];
  total_results: number;
}

export interface GraphVisualizationData {
  nodes: Array<{
    id: string;
    label: string;
    type: 'memory' | 'concept' | 'category' | 'project' | 'technology' | 'url' | 'file';
    category?: string;
    importance?: number;
    memoryType?: MemoryType;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label: string;
    weight: number;
  }>;
}

export interface AIUnderstandingResult {
  title: string;
  memory_type: MemoryType;
  categories: string[];
  subcategories: string[];
  tags: string[];
  keywords: string[];
  entities: string[];
  concepts: string[];
  frameworks: string[];
  technologies: string[];
  summary: string;
  analysis: string;
  importance_score: number;
  confidence_score: number;
  relationships: Array<{
    target_id_or_title: string;
    relationship_type: RelationshipType;
    confidence: number;
    reason: string;
  }>;
}
