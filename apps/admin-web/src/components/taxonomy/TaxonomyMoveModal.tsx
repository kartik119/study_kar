import React, { useState } from 'react';
import { X, AlertCircle, ArrowRightLeft } from 'lucide-react';

interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  itemName: string;
  itemCode: string;
  targetParents: Array<{ id: string; nameEn: string; code: string }>;
  currentParentId?: string;
  onConfirm: (targetParentId: string, reason?: string) => Promise<void>;
}

export const TaxonomyMoveModal: React.FC<MoveModalProps> = ({
  isOpen,
  onClose,
  title,
  itemName,
  itemCode,
  targetParents,
  currentParentId,
  onConfirm,
}) => {
  const [targetParentId, setTargetParentId] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validTargets = targetParents.filter((tp) => tp.id !== currentParentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetParentId) {
      setError('Please select a destination target parent');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(targetParentId, reason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to move taxonomy record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b pb-3 dark:border-gray-700">
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <ArrowRightLeft className="h-5 w-5" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200">
            Moving <span className="font-semibold">{itemName}</span> ({itemCode}) to a new parent. All associated child items and taxonomy mappings will automatically re-link to the new parent path.
          </div>

          {error && (
            <div className="flex items-center space-x-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Destination Parent <span className="text-red-500">*</span>
            </label>
            <select
              value={targetParentId}
              onChange={(e) => setTargetParentId(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">-- Choose New Parent --</option>
              {validTargets.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.nameEn} ({tp.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Reason for Move / Audit Note
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="e.g. Restructuring syllabus hierarchy for 2026 exams"
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
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
              disabled={isSubmitting || !targetParentId}
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Moving...' : 'Confirm Move'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
