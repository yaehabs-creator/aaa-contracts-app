import React, { useState, useEffect } from 'react';
import { SectionItem, ItemType } from '../types';

interface ItemEditorModalProps {
  onClose: () => void;
  onSave: (item: SectionItem) => void;
  item?: SectionItem | null;
  mode: 'create' | 'edit';
}

export const ItemEditorModal: React.FC<ItemEditorModalProps> = ({ onClose, onSave, item, mode }) => {
  const [itemType, setItemType] = useState<ItemType>(ItemType.PARAGRAPH);
  const [heading, setHeading] = useState('');
  const [text, setText] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldValue, setFieldValue] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageTitle, setImageTitle] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (item && mode === 'edit') {
      setItemType(item.itemType);
      setHeading(item.heading || '');
      setText(item.text || '');
      setFieldKey(item.fieldKey || '');
      setFieldValue(item.fieldValue || '');
      setImageUrl(item.imageUrl || '');
      setImageAlt(item.imageAlt || '');
      setImageTitle(item.imageTitle || '');
    } else {
      // Reset for create mode
      setItemType(ItemType.PARAGRAPH);
      setHeading('');
      setText('');
      setFieldKey('');
      setFieldValue('');
      setImageUrl('');
      setImageAlt('');
      setImageTitle('');
    }
  }, [item, mode]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (itemType === ItemType.PARAGRAPH) {
      if (!text.trim()) {
        newErrors.text = 'Text is required for paragraphs';
      }
    } else if (itemType === ItemType.FIELD) {
      if (!fieldKey.trim()) {
        newErrors.fieldKey = 'Field key is required';
      }
      if (!fieldValue.trim()) {
        newErrors.fieldValue = 'Field value is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const newItem: SectionItem = {
      itemType,
      orderIndex: item?.orderIndex || 0,
      ...(itemType === ItemType.PARAGRAPH
        ? {
            heading: heading.trim() || undefined,
            text: text.trim()
          }
        : itemType === ItemType.FIELD
        ? {
            fieldKey: fieldKey.trim(),
            fieldValue: fieldValue.trim()
          }
        : itemType === ItemType.IMAGE
        ? {
            imageUrl: imageUrl.trim(),
            imageAlt: imageAlt.trim() || undefined,
            imageTitle: imageTitle.trim() || undefined,
            heading: imageTitle.trim() || undefined
          }
        : {})
    };

    onSave(newItem);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-10 py-8 border-b border-aaa-border bg-slate-50/50">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-aaa-blue tracking-tighter">
              {mode === 'edit' ? 'Edit Item' : 'Add Item'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-aaa-bg rounded-xl transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-aaa-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-10 py-8">
          {/* Item Type Toggle */}
          <div className="mb-8">
            <label className="block text-[10px] font-black text-aaa-blue uppercase tracking-widest mb-4">
              Item Type
            </label>
            <div className="flex bg-white border border-aaa-border p-1.5 rounded-2xl shadow-sm">
              <button
                onClick={() => {
                  setItemType(ItemType.PARAGRAPH);
                  setErrors({});
                }}
                className={`flex-1 px-6 py-3 rounded-xl text-xs font-black transition-all ${
                  itemType === ItemType.PARAGRAPH
                    ? 'bg-aaa-blue text-white shadow-lg'
                    : 'text-aaa-muted hover:text-aaa-blue'
                }`}
              >
                Paragraph
              </button>
              <button
                onClick={() => {
                  setItemType(ItemType.FIELD);
                  setErrors({});
                }}
                className={`flex-1 px-6 py-3 rounded-xl text-xs font-black transition-all ${
                  itemType === ItemType.FIELD
                    ? 'bg-aaa-blue text-white shadow-lg'
                    : 'text-aaa-muted hover:text-aaa-blue'
                }`}
              >
                Field
              </button>
            </div>
          </div>

          {/* Paragraph Mode */}
          {itemType === ItemType.PARAGRAPH && (
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-aaa-blue uppercase tracking-widest mb-2">
                  Heading (Optional)
                </label>
                <input
                  type="text"
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  placeholder="Enter heading..."
                  className="w-full px-4 py-3 bg-white border border-aaa-border rounded-xl text-sm font-medium focus:border-aaa-blue focus:ring-2 focus:ring-aaa-blue/5 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-aaa-blue uppercase tracking-widest mb-2">
                  Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter paragraph text..."
                  rows={8}
                  className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-mono focus:ring-2 focus:ring-aaa-blue/5 outline-none custom-scrollbar ${
                    errors.text ? 'border-red-500' : 'border-aaa-border focus:border-aaa-blue'
                  }`}
                />
                {errors.text && (
                  <p className="mt-2 text-xs text-red-500 font-semibold">{errors.text}</p>
                )}
              </div>
            </div>
          )}

          {/* Field Mode */}
          {itemType === ItemType.FIELD && (
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-aaa-blue uppercase tracking-widest mb-2">
                  Field Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fieldKey}
                  onChange={(e) => setFieldKey(e.target.value)}
                  placeholder="e.g., Date, Parties, Contract Price"
                  className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-medium focus:ring-2 focus:ring-aaa-blue/5 outline-none ${
                    errors.fieldKey ? 'border-red-500' : 'border-aaa-border focus:border-aaa-blue'
                  }`}
                />
                {errors.fieldKey && (
                  <p className="mt-2 text-xs text-red-500 font-semibold">{errors.fieldKey}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-aaa-blue uppercase tracking-widest mb-2">
                  Field Value <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  placeholder="Enter field value..."
                  rows={6}
                  className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-mono focus:ring-2 focus:ring-aaa-blue/5 outline-none custom-scrollbar ${
                    errors.fieldValue ? 'border-red-500' : 'border-aaa-border focus:border-aaa-blue'
                  }`}
                />
                {errors.fieldValue && (
                  <p className="mt-2 text-xs text-red-500 font-semibold">{errors.fieldValue}</p>
                )}
              </div>
            </div>
          )}

          {/* Image Mode */}
          {itemType === ItemType.IMAGE && (
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-aaa-blue uppercase tracking-widest mb-2">
                  Image URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg or data:image/..."
                  className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-medium focus:ring-2 focus:ring-aaa-blue/5 outline-none ${
                    errors.imageUrl ? 'border-red-500' : 'border-aaa-border focus:border-aaa-blue'
                  }`}
                />
                {errors.imageUrl && (
                  <p className="mt-2 text-xs text-red-500 font-semibold">{errors.imageUrl}</p>
                )}
                <p className="mt-2 text-xs text-aaa-muted">
                  You can paste a URL or use a data URL (base64 encoded image)
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-aaa-blue uppercase tracking-widest mb-2">
                  Image Title (Optional)
                </label>
                <input
                  type="text"
                  value={imageTitle}
                  onChange={(e) => setImageTitle(e.target.value)}
                  placeholder="e.g., Annex 1, Annex 2"
                  className="w-full px-4 py-3 bg-white border border-aaa-border rounded-xl text-sm font-medium focus:border-aaa-blue focus:ring-2 focus:ring-aaa-blue/5 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-aaa-blue uppercase tracking-widest mb-2">
                  Alt Text (Optional)
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Description of the image for accessibility"
                  className="w-full px-4 py-3 bg-white border border-aaa-border rounded-xl text-sm font-medium focus:border-aaa-blue focus:ring-2 focus:ring-aaa-blue/5 outline-none"
                />
              </div>

              {imageUrl && (
                <div className="mt-6 p-4 bg-aaa-bg/30 rounded-2xl border border-aaa-border/50">
                  <div className="text-[10px] font-black text-aaa-muted uppercase tracking-widest mb-3">
                    Preview
                  </div>
                  <div className="relative w-full">
                    <img
                      src={imageUrl}
                      alt={imageAlt || imageTitle || 'Preview'}
                      className="max-w-full h-auto rounded-xl border border-aaa-border"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'text-red-500 text-sm p-4';
                        errorDiv.textContent = 'Failed to load image. Please check the URL.';
                        target.parentElement?.appendChild(errorDiv);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-10 py-8 border-t border-aaa-border bg-slate-50/50 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-white border border-aaa-border text-aaa-muted rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-aaa-bg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-3 bg-aaa-blue text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-aaa-hover transition-all shadow-lg"
          >
            {mode === 'edit' ? 'Update Item' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
};
