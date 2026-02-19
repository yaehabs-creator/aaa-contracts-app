'use client';

import React from 'react';
import { Search, Filter, Eye, EyeOff } from 'lucide-react';

interface ControlsProps {
  entityTypes: string[];
  selectedEntityTypes: Set<string>;
  onEntityTypeChange: (type: string, selected: boolean) => void;
  minRelationshipWeight: number;
  onMinRelationshipWeightChange: (weight: number) => void;
  showCommunityBoundaries: boolean;
  onShowCommunityBoundariesChange: (show: boolean) => void;
  communityLevels: number[];
  selectedLevel: number | null;
  onLevelChange: (level: number | null) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  totalNodes: number;
  visibleNodes: number;
  totalLinks: number;
  visibleLinks: number;
}

export default function Controls({
  entityTypes,
  selectedEntityTypes,
  onEntityTypeChange,
  minRelationshipWeight,
  onMinRelationshipWeightChange,
  showCommunityBoundaries,
  onShowCommunityBoundariesChange,
  communityLevels,
  selectedLevel,
  onLevelChange,
  searchTerm,
  onSearchChange,
  totalNodes,
  visibleNodes,
  totalLinks,
  visibleLinks,
}: ControlsProps) {
  return (
    <div className="absolute top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg w-80 max-h-96 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Graph Controls</h2>
      
      {/* Search */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          <Search className="inline w-4 h-4 mr-1" />
          Search Entities
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400"
          placeholder="Search by title..."
        />
      </div>

      {/* Entity Type Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          <Filter className="inline w-4 h-4 mr-1" />
          Entity Types
        </label>
        <div className="space-y-1">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={selectedEntityTypes.size === 0}
              onChange={(e) => {
                if (e.target.checked) {
                  entityTypes.forEach(type => onEntityTypeChange(type, false));
                }
              }}
              className="mr-2"
            />
            <span className="text-sm">All Types</span>
          </label>
          {entityTypes.map(type => (
            <label key={type} className="flex items-center">
              <input
                type="checkbox"
                checked={selectedEntityTypes.has(type)}
                onChange={(e) => onEntityTypeChange(type, e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Relationship Weight Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Min Relationship Weight: {minRelationshipWeight}
        </label>
        <input
          type="range"
          min={1}
          max={20}
          step={1}
          value={minRelationshipWeight}
          onChange={(e) => onMinRelationshipWeightChange(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Community Level Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Community Level
        </label>
        <select
          value={selectedLevel === null ? '' : selectedLevel}
          onChange={(e) => onLevelChange(e.target.value === '' ? null : parseInt(e.target.value))}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
        >
          <option value="">All Levels</option>
          {communityLevels.map(level => (
            <option key={level} value={level}>Level {level}</option>
          ))}
        </select>
      </div>

      {/* Community Boundaries Toggle */}
      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={showCommunityBoundaries}
            onChange={(e) => onShowCommunityBoundariesChange(e.target.checked)}
            className="mr-2"
          />
          {showCommunityBoundaries ? (
            <Eye className="w-4 h-4 mr-1" />
          ) : (
            <EyeOff className="w-4 h-4 mr-1" />
          )}
          <span className="text-sm">Show Community Boundaries</span>
        </label>
      </div>

      {/* Statistics */}
      <div className="text-xs text-gray-400 border-t border-gray-600 pt-2">
        <div>Nodes: {visibleNodes} / {totalNodes}</div>
        <div>Links: {visibleLinks} / {totalLinks}</div>
      </div>
    </div>
  );
}