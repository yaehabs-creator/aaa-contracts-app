import React, { useState, useRef, useEffect } from 'react';
import { EditorCategory } from '../../services/adminEditorService';

interface CategoryItemProps {
  category: EditorCategory;
  isSelected: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onRename: (newName: string) => Promise<boolean>;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

/**
 * CategoryItem Component
 * Single category row with inline editing, drag handle, and delete button
 */
export const CategoryItem: React.FC<CategoryItemProps> = ({
  category,
  isSelected,
  isDragging,
  isDragOver,
  onSelect,
  onRename,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(category.name);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Update edit value when category name changes
  useEffect(() => {
    setEditValue(category.name);
  }, [category.name]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    const trimmedValue = editValue.trim();
    
    if (!trimmedValue) {
      setEditValue(category.name);
      setIsEditing(false);
      return;
    }

    if (trimmedValue === category.name) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    const success = await onRename(trimmedValue);
    setIsSaving(false);

    if (success) {
      setIsEditing(false);
    } else {
      setEditValue(category.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditValue(category.name);
      setIsEditing(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete category "${category.name}"?\n\nClauses in this category will be unassigned.`)) {
      onDelete();
    }
  };

  return (
    <div
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onSelect}
      className={`
        group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer
        transition-all duration-150
        ${isSelected ? 'bg-aaa-blue text-white' : 'hover:bg-slate-100'}
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isDragOver ? 'ring-2 ring-aaa-blue ring-offset-2' : ''}
      `}
    >
      {/* Drag Handle */}
      <div
        className={`
          flex-shrink-0 cursor-grab active:cursor-grabbing
          ${isSelected ? 'text-white/60' : 'text-aaa-muted'}
        `}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Category Name */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className={`
              w-full px-2 py-1 text-sm rounded border
              ${isSaving ? 'opacity-50' : ''}
              ${isSelected ? 'bg-white/20 border-white/30 text-white placeholder-white/50' : 'bg-white border-aaa-border text-aaa-text'}
              focus:outline-none focus:ring-2 focus:ring-aaa-blue/20
            `}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm font-medium truncate block">{category.name}</span>
        )}
      </div>

      {/* Clause Count Badge */}
      <div
        className={`
          flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold
          ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-aaa-muted'}
        `}
      >
        {category.clause_count || 0}
      </div>

      {/* Action Buttons */}
      <div className={`flex-shrink-0 flex items-center gap-1 ${isEditing ? 'hidden' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
        {/* Edit Button */}
        <button
          onClick={handleStartEdit}
          className={`
            p-1 rounded hover:bg-black/10 transition-colors
            ${isSelected ? 'text-white/80 hover:text-white' : 'text-aaa-muted hover:text-aaa-blue'}
          `}
          title="Rename category"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          className={`
            p-1 rounded hover:bg-red-500/20 transition-colors
            ${isSelected ? 'text-white/80 hover:text-red-200' : 'text-aaa-muted hover:text-red-500'}
          `}
          title="Delete category"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default CategoryItem;
