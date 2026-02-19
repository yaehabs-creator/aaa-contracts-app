'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, Building2, User, MapPin, Calendar, Circle } from 'lucide-react';
import { Node3D, Link3D } from '../lib/forceSimulation';
import { Community } from '../lib/graphData';

interface InspectorProps {
  selectedNode: Node3D | null;
  connectedLinks: Link3D[];
  visibleCommunities: Community[];
  communityMode: 'off' | 'auto' | 'all';
  onClose: () => void;
  onNodeSelect: (node: Node3D) => void;
}

export default function Inspector({ selectedNode, connectedLinks, visibleCommunities, communityMode, onClose, onNodeSelect }: InspectorProps) {
  // Function to get appropriate icon for entity type
  const getEntityTypeIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'ORGANIZATION':
        return <Building2 className="h-4 w-4" />;
      case 'PERSON':
        return <User className="h-4 w-4" />;
      case 'GEO':
        return <MapPin className="h-4 w-4" />;
      case 'EVENT':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  // Build community hierarchy information (call hooks unconditionally)
  const hierarchyInfo = React.useMemo(() => {
    if (!selectedNode || !selectedNode.community || communityMode === 'off') return null;

    const selectedCommunity = selectedNode.community;
    const parents: Community[] = [];
    const children: Community[] = [];

    // Find direct parent community
    if (selectedCommunity.parent !== null && selectedCommunity.parent !== undefined) {
      const parentId = typeof selectedCommunity.parent === 'string' ? parseInt(selectedCommunity.parent) : selectedCommunity.parent;
      const parentCommunity = visibleCommunities.find(c => c.human_readable_id === parentId);
      if (parentCommunity) {
        parents.push(parentCommunity);
      }
    }

    // Find direct child communities
    visibleCommunities.forEach(community => {
      if (community.parent !== null && community.parent !== undefined) {
        const parentId = typeof community.parent === 'string' ? parseInt(community.parent) : community.parent;
        if (parentId === selectedCommunity.human_readable_id) {
          children.push(community);
        }
      }
    });

    // Also check the children array if available
    if (selectedCommunity.children && Array.isArray(selectedCommunity.children)) {
      selectedCommunity.children.forEach((childHumanId: number) => {
        const childCommunity = visibleCommunities.find(c => c.human_readable_id === childHumanId);
        if (childCommunity && !children.some(c => c.id === childCommunity.id)) {
          children.push(childCommunity);
        }
      });
    }

    return {
      selected: selectedCommunity,
      parents: parents.sort((a, b) => a.level - b.level),
      children: children.sort((a, b) => a.level - b.level)
    };
  }, [selectedNode, visibleCommunities, communityMode]);

  if (!selectedNode) {
    return (
      <div className="w-full h-full bg-background p-6 flex items-center justify-center overflow-hidden">
        <div className="text-center text-muted-foreground">
          <div className="text-lg font-medium mb-2">No Selection</div>
          <p className="text-sm">Click on a node in the graph to view details</p>
        </div>
      </div>
    );
  }

  const connectedNodesMap = new Map<string, { node: Node3D; maxWeight: number }>();
  
  connectedLinks.forEach(link => {
    const otherNode = link.source.id === selectedNode.id ? link.target : link.source;
    const existing = connectedNodesMap.get(otherNode.id);
    if (!existing || link.weight > existing.maxWeight) {
      connectedNodesMap.set(otherNode.id, { node: otherNode, maxWeight: link.weight });
    }
  });
  
  const connectedNodes = Array.from(connectedNodesMap.values())
    .sort((a, b) => b.maxWeight - a.maxWeight)
    .map(item => item.node);
  
  const relationshipsByWeight = connectedLinks.sort((a, b) => b.weight - a.weight);

  // hierarchyInfo computed above

  return (
    <div className="w-full h-full bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 mr-2 ml-6">
            {/* Title and Subtitle */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                {getEntityTypeIcon(selectedNode.type)}
                <h2 className="text-lg font-semibold break-words leading-tight">{selectedNode.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground break-words">
                {selectedNode.community && selectedNode.community.title}
              </p>
            </div>
            
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {selectedNode.degree} connections
              </Badge>
              <Badge variant="outline" className="text-xs">
                {selectedNode.frequency} frequency
              </Badge>
              {selectedNode.community && (
                <>
                  <Badge variant="outline" className="text-xs">
                    Level {selectedNode.community.level}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedNode.community.size} entities
                  </Badge>
                </>
              )}
              <Badge variant="outline" className="text-xs">
                ID: {selectedNode.human_readable_id}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed break-words">
                {selectedNode.description}
              </p>
            </CardContent>
          </Card>

          {/* Community Hierarchy */}
          {hierarchyInfo && communityMode === 'auto' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Community Hierarchy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Parent Communities */}
                  {hierarchyInfo.parents.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        ↑ Parent Communities ({hierarchyInfo.parents.length})
                      </div>
                      <div className="space-y-2">
                        {hierarchyInfo.parents.map((community) => (
                          <div key={community.id} className="flex items-start p-3 rounded-md border bg-accent/10 border-border">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-xs">
                                  L{community.level}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {community.size} entities
                                </span>
                              </div>
                              <div className="font-medium text-sm text-foreground break-words leading-tight">
                                {community.title}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selected Community */}
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      → Current Community
                    </div>
                    <div className="flex items-start p-3 rounded-md border bg-primary/10 border-primary/20">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="text-xs">
                            L{hierarchyInfo.selected.level}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {hierarchyInfo.selected.size} entities
                          </span>
                        </div>
                        <div className="font-medium text-sm text-foreground break-words leading-tight">
                          {hierarchyInfo.selected.title}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Child Communities */}
                  {hierarchyInfo.children.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        ↓ Child Communities ({hierarchyInfo.children.length})
                      </div>
                      <div className="space-y-2">
                        {hierarchyInfo.children.map((community) => (
                          <div key={community.id} className="flex items-start p-3 rounded-md border bg-accent/10 border-border">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  L{community.level}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {community.size} entities
                                </span>
                              </div>
                              <div className="font-medium text-sm text-foreground break-words leading-tight">
                                {community.title}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Strongest Relationships */}
          {relationshipsByWeight.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Strongest Relationships</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {relationshipsByWeight.slice(0, 5).map((link) => {
                    const otherNode = link.source.id === selectedNode.id ? link.target : link.source;
                    return (
                      <div key={link.id} className="space-y-2">
                        <div className="flex items-start justify-between">
                          <button 
                            className="font-medium text-sm break-words leading-tight flex-1 min-w-0 mr-2 text-left hover:text-primary cursor-pointer transition-colors"
                            onClick={() => onNodeSelect(otherNode)}
                          >
                            {otherNode.title}
                          </button>
                          <Badge className="flex-shrink-0">{link.weight}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed break-words whitespace-normal">
                          {link.description}
                        </p>
                        <Separator />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connected Entities */}
          {connectedNodes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Connected Entities ({connectedNodes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {connectedNodes.map((node) => (
                    <button
                      key={node.id} 
                      className="flex items-start justify-between p-2 rounded border w-full text-left hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                      onClick={() => onNodeSelect(node)}
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="font-medium text-sm break-words leading-tight">{node.title}</div>
                        <div className="text-xs text-muted-foreground break-words">{node.type}</div>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {connectedNodesMap.get(node.id)?.maxWeight}
                      </Badge>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
