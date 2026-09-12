import React, { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown, ArrowUpDown, AlertCircle } from 'lucide-react';

interface ReorderItem {
  id: string;
  nameEn: string;
  code: string;
  displayOrder: number;
}

interface ReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: ReorderItem[];
  onConfirm: (reorderedItems: Array<{ id: string; displayOrder: number }>) => Promise<void>;
}

export const TaxonomyReorderModal: React.FC<ReorderModalProps> = ({
  isOpen,
  onClose,
  title,
  items,
  onConfirm,
}) => {
  const [list, setList] = useState<ReorderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setList([...items].sort((a, b) => a.displayOrder - b.displayOrder));
  }, [items, isOpen]);

  if (!isOpen) return null;

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...list];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setList(updated);
  };

  const moveDown = (index: number) => {
    if (index === list.length - 1) return;
    const updated = [...list];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setList(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const reorderedPayload = list.map((item, idx) => ({
        id: item.id,
        displayOrder: idx + 1,
      }));
      await onConfirm(reorderedPayload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save display order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b pb-3 dark:border-gray-700">
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <ArrowUpDown className="h-5 w-5" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Use the up and down buttons to adjust the display order of items within this category tier.
          </p>

          {error && (
            <div className="flex items-center space-x-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto rounded-lg border divide-y dark:border-gray-700 dark:divide-gray-700">
            {list.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750">
                <div className="flex items-center space-x-3">
                  <span className="w-6 text-center text-sm font-semibold text-gray-500">{idx + 1}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{item.nameEn}</div>
                    <div className="text-xs text-gray-500 font-mono">{item.code}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="rounded p-1 text-gray-500 hover:bg-gray-200 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={idx === list.length - 1}
                    className="rounded p-1 text-gray-500 hover:bg-gray-200 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Order...' : 'Save Display Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
