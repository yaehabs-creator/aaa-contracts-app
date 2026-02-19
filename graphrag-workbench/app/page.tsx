'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import GraphVisualizer from '@/components/GraphVisualizer';
import Inspector from '@/components/Inspector';
import ChatPanel from '@/components/ChatPanel';
import CorpusPanel from '@/components/CorpusPanel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
// SettingsModal removed
import { GraphDataLoader, GraphData, type Community } from '../lib/graphData';
import { ForceSimulation3D, GraphLayout, Node3D, defaultForceConfig } from '../lib/forceSimulation';

export default function Home() {
  const [layout, setLayout] = useState<GraphLayout | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  // track corpus presence implicitly; no explicit corpusState passed to visualizer
  
  // Selection state
  const [selectedNode, setSelectedNode] = useState<Node3D | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node3D | null>(null);
  
  // Filter states
  const [selectedEntityTypes] = useState<Set<string>>(new Set());
  const [minRelationshipWeight] = useState<number>(1);
  // showCommunityBoundaries state removed
  const [inspectorMode, setInspectorMode] = useState<boolean>(false);
  const [selectedLevel] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [leftTab, setLeftTab] = useState<'corpus' | 'chat' | 'inspector'>('corpus');
  const [lastNonInspectorTab, setLastNonInspectorTab] = useState<'corpus' | 'chat'>('corpus');
  const [ragHighlightedNodeIds] = useState<Set<string>>(new Set());
  
  // Settings modal removed
  
  // Simulation instance not kept in state
  
  // Ref for search input to enable focus
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Check corpus state and load data intelligently
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // First check if we have any corpus data
        setStatus('Checking for indexed data...');
        const corpusRes = await fetch('/api/corpus/state', { cache: 'no-store' });
        if (corpusRes.ok) {
          const corpus = await corpusRes.json();
          
          // If no uploads or no output stats, show getting started instead of loading
          const hasUploads = corpus.uploads && corpus.uploads.length > 0;
          const hasIndex = corpus.outputStats && ((corpus.outputStats.entities ?? 0) + (corpus.outputStats.relationships ?? 0) + (corpus.outputStats.communities ?? 0) + (corpus.outputStats.text_units ?? 0) > 0);
          
          if (!hasUploads || !hasIndex) {
            setLoading(false);
            return; // Show getting started card
          }
        }

        setStatus('Loading JSON data files...');

        const loader = new GraphDataLoader('/api/data');
        const graphData = await loader.loadGraphData();

        setStatus('Processing graph structure...');
        
        const newSimulation = new ForceSimulation3D(defaultForceConfig);
        const layout = await newSimulation.generateLayout(graphData);
        
        // not retaining simulation in state

        setStatus('Rendering visualization...');
        
        setLayout(layout);
        setGraphData(graphData);
        setLoading(false);

      } catch (error) {
        console.error('Error loading graph data:', error);
        setLoading(false);
        // Don't set error - just fall back to no data state
      }
    };

    loadData();
  }, []);

  // Hot-reload graph data when the corpus pipeline finishes
  const reloadGraphData = useCallback(async () => {
    try {
      setStatus('Reloading graph data...');
      const loader = new GraphDataLoader('/api/data');
      const newGraph = await loader.loadGraphData();
      const sim = new ForceSimulation3D(defaultForceConfig);
      const newLayout = await sim.generateLayout(newGraph);
      // not retaining simulation in state
      setLayout(newLayout);
      setGraphData(newGraph);
      setStatus('Graph reloaded');
    } catch (err) {
      console.warn('Hot reload failed:', err);
    }
  }, []);

  useEffect(() => {
    const handler = () => reloadGraphData();
    window.addEventListener('graph-data-updated', handler);
    const clearHandler = () => {
      setGraphData(null);
      setLayout(null);
      setStatus('No graph loaded');
      setSelectedNode(null);
    };
    window.addEventListener('graph-data-cleared', clearHandler);
    return () => {
      window.removeEventListener('graph-data-updated', handler);
      window.removeEventListener('graph-data-cleared', clearHandler);
    };
  }, [reloadGraphData]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC to unselect node
      if (event.key === 'Escape') {
        setSelectedNode(null);
      }
      
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux) to focus search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Cmd+Backspace (Mac) or Ctrl+Backspace (Windows/Linux) to clear search
      if ((event.metaKey || event.ctrlKey) && event.key === 'Backspace') {
        event.preventDefault();
        setSearchTerm('');
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Auto-switch to Inspector on node select; restore previous tab on deselect
  useEffect(() => {
    if (selectedNode) {
      if (leftTab !== 'inspector') {
        if (leftTab === 'corpus' || leftTab === 'chat') {
          setLastNonInspectorTab(leftTab)
        }
        setLeftTab('inspector')
      }
    } else {
      // Restore last non-inspector tab when node deselected
      setLeftTab(lastNonInspectorTab)
    }
    // Only react to selection changes; allow manual tab changes while selected
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode])

  // settings-related handlers removed

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  const filteredLayout = useMemo(() => {
    if (!layout || !graphData) return null;

    let filteredNodes = layout.nodes;
    let filteredLinks = layout.links;

    // Apply entity type filter
    if (selectedEntityTypes.size > 0) {
      filteredNodes = filteredNodes.filter(node => selectedEntityTypes.has(node.type));
    }

    // Apply level filter
    if (selectedLevel !== null) {
      filteredNodes = filteredNodes.filter(node => node.communityLevel === selectedLevel);
    }

    // DON'T filter by search term here - pass to GraphVisualizer instead
    // This prevents nodes from being removed and repositioned

    // Filter links based on visible nodes and weight
    const visibleNodeIds = new Set(filteredNodes.map(node => node.id));
    filteredLinks = filteredLinks.filter(link => 
      link.weight >= minRelationshipWeight &&
      visibleNodeIds.has(link.source.id) && 
      visibleNodeIds.has(link.target.id)
    );

    return {
      nodes: filteredNodes,
      links: filteredLinks,
      communities: layout.communities,
    };
  }, [layout, graphData, selectedEntityTypes, selectedLevel, minRelationshipWeight]);

  const connectedLinks = useMemo(() => {
    if (!selectedNode || !filteredLayout) return [];
    return filteredLayout.links.filter(link => 
      link.source.id === selectedNode.id || link.target.id === selectedNode.id
    );
  }, [selectedNode, filteredLayout]);

  // When chat updates highlights, reflect them (unused handler removed)

  // Helper function to get complete subtree under the L0 parent of selected community
  const getCompleteHierarchyTree = useCallback((selectedCommunity: Community, allCommunities: Community[]) => {
    if (!selectedCommunity || !allCommunities || allCommunities.length === 0) {
      return [];
    }

      // debug log removed in production sweep

    // Create efficient lookup maps
    const communityByHumanIdMap = new Map<string, Community>(allCommunities.map(c => [String(c.human_readable_id), c]));
    
    // Build parent-child map
    const childrenByParentId = new Map<string, Community[]>();
    allCommunities.forEach(community => {
      if (community.parent !== undefined) {
        const parentId = String(community.parent);
        if (!childrenByParentId.has(parentId)) {
          childrenByParentId.set(parentId, []);
        }
        childrenByParentId.get(parentId)!.push(community);
      }
    });

    try {
      // Step 1: Find the L0 root by walking up the tree
      let currentCommunity: Community | undefined = selectedCommunity;
      const pathToRoot = [currentCommunity];
      
      while (currentCommunity && currentCommunity.parent !== undefined) {
        const parentId = String(currentCommunity.parent);
        const parentCommunity = communityByHumanIdMap.get(parentId);
        
        if (!parentCommunity) break;
        
        pathToRoot.unshift(parentCommunity);
        currentCommunity = parentCommunity;
        
        // Safety check to prevent infinite loops
        if (pathToRoot.length > 10) break;
      }
      
      // The first item should be the L0 root
      const rootCommunity = pathToRoot[0];
      // debug log removed in production sweep
      
      // Step 2: Collect entire subtree under this L0 root
      const subtreeCommunities = new Set<string>();
      const queue: Community[] = [rootCommunity];
      const visited = new Set<string>();
      
      while (queue.length > 0) {
        const community = queue.shift()!;
        
        if (!community || visited.has(community.id)) continue;
        
        visited.add(community.id);
        subtreeCommunities.add(community.id);
        
        // Add all children to queue
        const children = childrenByParentId.get(String(community.human_readable_id)) || [];
        
        // Also check the children array if available
        community.children.forEach((childHumanId: string) => {
          const childCommunity = communityByHumanIdMap.get(String(childHumanId));
          if (childCommunity && !children.some(c => c.id === childCommunity.id)) {
            children.push(childCommunity);
          }
        });
        
        children.forEach(childCommunity => {
          if (!visited.has(childCommunity.id)) {
            queue.push(childCommunity);
          }
        });
      }

      const result = allCommunities
        .filter(c => subtreeCommunities.has(c.id))
        .sort((a, b) => (a.level || 0) - (b.level || 0));
      
      // debug log removed in production sweep
      
      return result;
      
    } catch (error) {
      console.warn('Error building community subtree:', error);
      // Fallback to just the selected community
      return [selectedCommunity];
    }
  }, []);

  // Map community levels to human-readable universe terms
  const getLevelLabel = useCallback((level: number): string => {
    const levelMap: Record<number, string> = {
      0: 'Sector',
      1: 'System', 
      2: 'Subsystem',
      3: 'Component',
      4: 'Element'
    };
    return levelMap[level] || `L${level}`;
  }, []);

  // Calculate which communities to show based on selected node and inspector mode
  const visibleCommunities = useMemo(() => {
    if (!layout?.communities) return [];
    
    // Inspector mode shows hierarchy tree when node selected
    if (inspectorMode && selectedNode) {
      // If node has community, show hierarchy tree
      if (selectedNode.community) {
        return getCompleteHierarchyTree(selectedNode.community, layout.communities);
      }
      // If node has no community, show no communities
      return [];
    }
    
    // Default: show all communities
    return layout.communities;
  }, [layout?.communities, selectedNode, inspectorMode, getCompleteHierarchyTree]);

  // Determine effective community mode for components
  const effectiveCommunityMode = inspectorMode && selectedNode ? 'auto' : 'all';

  const handleRetry = () => {
    setError(null);
    window.location.reload();
  };


  // No key management UI in OpenAI-only mode

  return (
    <div className="w-screen h-screen bg-background overflow-hidden relative">
      {/* Main Content */}
      <div className="h-full w-full border-t  overflow-hidden flex">
        {/* Left Panel - Fixed width */}
        <div className="h-full flex flex-col border-r w-[520px] shrink-0 relative z-50 isolate pointer-events-auto">
          <div className="p-2 border-b">
            <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as 'corpus'|'chat'|'inspector')} className="w-full">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="corpus">Corpus</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="inspector">Inspector</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex-1 min-h-0">
            {leftTab === 'corpus' ? (
              <CorpusPanel />
            ) : leftTab === 'chat' ? (
              <ChatPanel />
            ) : (
              <Inspector
                selectedNode={selectedNode}
                connectedLinks={connectedLinks}
                visibleCommunities={visibleCommunities}
                communityMode={effectiveCommunityMode}
                onClose={() => setSelectedNode(null)}
                onNodeSelect={setSelectedNode}
              />
            )}
          </div>
        </div>

        {/* Right Panel - Graph Visualizer with state-aware loading */}
        <div className="flex-1 min-w-0 h-full relative z-0">
          <div className="h-full">
            <GraphVisualizer
              layout={filteredLayout}
              loading={loading}
              error={error}
              status={status}
              onRetry={handleRetry}
              selectedEntityTypes={selectedEntityTypes}
              minRelationshipWeight={minRelationshipWeight}
              showCommunityBoundaries={true}
              visibleCommunities={visibleCommunities}
              communityMode={effectiveCommunityMode}
              selectedLevel={selectedLevel}
              onNodeSelect={setSelectedNode}
              selectedNode={selectedNode}
              ragHighlightedNodeIds={ragHighlightedNodeIds}
              searchTerm={searchTerm}
              onNodeHover={setHoveredNode}
              hoveredNode={hoveredNode}
            />
          </div>
        </div>
      </div>
      
      {/* Floating Search and Settings Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
        <div className="relative">
          <div className="relative">
            <Input
              ref={searchInputRef}
              placeholder="Search entities..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-64 h-10 bg-card/90 backdrop-blur-sm border-border/50 pr-20"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    searchInputRef.current?.focus();
                  }}
                  className="h-6 w-6 p-0 hover:bg-background/20"
                  title="Clear search"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <kbd className="pointer-events-none inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 select-none">
                <span className="text-sm">⌘</span>K
              </kbd>
            </div>
          </div>
        </div>
        
        {/* GitHub Link */}
        <Button
          variant="outline"
          size="sm"
          asChild
          className="h-10 bg-card/90 backdrop-blur-sm border-border/50"
        >
          <a
            href="https://github.com/ChristopherLyon/graphrag-workbench"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span className="text-xs font-medium">GitHub</span>
          </a>
        </Button>

        {/* Isolator Mode Toggle */}
        <div className="flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border/50 rounded-md px-3 h-10">
          <Eye className="h-4 w-4" />
          <Label htmlFor="isolator-mode" className="text-xs font-medium cursor-pointer">
            Community Isolator
          </Label>
          <Switch
            id="isolator-mode"
            checked={inspectorMode}
            onCheckedChange={setInspectorMode}
            className="data-[state=checked]:bg-primary"
          />
        </div>

        {/* Settings removed */}
      </div>
      
      {/* Settings modal removed */}

    </div>
  );
}
