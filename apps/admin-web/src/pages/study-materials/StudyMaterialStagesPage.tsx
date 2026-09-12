import React, { useState, useEffect, useCallback } from 'react';
import { AcademicStage, PermissionKey } from '@study-karnataka/shared-types';
import {
  PageHeader,
  Card,
  Button,
  SearchInput,
  Badge,
  StatusBadge,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  Modal,
  FormField,
  Input,
  Checkbox,
} from '@study-karnataka/ui';
import { AcademicStageApi, AcademicStageApiError } from '../../api/academic-stage.api';
import { Plus, Edit2, Trash2, Layers } from 'lucide-react';

export const StudyMaterialStagesPage: React.FC = () => {
  const storedUserRaw = localStorage.getItem('admin_user');
  const user = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  const userPermissions: PermissionKey[] = user?.permissions || [];
  const userRoles: string[] = user?.roles || ['Super Admin'];
  const isSuperAdmin = userRoles.includes('Super Admin');
  const canManage = isSuperAdmin || userPermissions.includes('academic_taxonomy.manage');

  const [stages, setStages] = useState<AcademicStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<AcademicStage | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    nameEn: '',
    nameKn: '',
    descriptionEn: '',
    descriptionKn: '',
    displayOrder: 1,
    isActive: true,
  });

  const loadStages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsForbidden(false);

    try {
      const list = await AcademicStageApi.getAllStages();
      setStages(list);
    } catch (err: any) {
      if (err instanceof AcademicStageApiError && err.status === 403) {
        setIsForbidden(true);
      } else {
        setError(err.message || 'Failed to load stages');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStages();
  }, [loadStages]);

  const openCreateModal = () => {
    setEditingStage(null);
    setFormData({
      code: '',
      nameEn: '',
      nameKn: '',
      descriptionEn: '',
      descriptionKn: '',
      displayOrder: stages.length + 1,
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const openEditModal = (stage: AcademicStage) => {
    setEditingStage(stage);
    setFormData({
      code: stage.code,
      nameEn: stage.nameEn,
      nameKn: stage.nameKn,
      descriptionEn: stage.descriptionEn || '',
      descriptionKn: stage.descriptionKn || '',
      displayOrder: stage.displayOrder,
      isActive: stage.isActive,
    });
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStage) {
        await AcademicStageApi.updateStage(editingStage.id, formData);
      } else {
        await AcademicStageApi.createStage(formData);
      }
      setIsFormOpen(false);
      loadStages();
    } catch (err: any) {
      alert(err.message || 'Failed to save stage');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this stage? This action cannot be undone.')) {
      return;
    }
    try {
      await AcademicStageApi.deleteStage(id);
      loadStages();
    } catch (err: any) {
      alert(err.message || 'Failed to delete stage');
    }
  };

  if (isForbidden) {
    return <ErrorState title="Access Denied" message="You don't have permission to view stages." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study Material Stages"
        description="Manage standalone stages (like Prelims, Mains, Interview) for tagging study materials independently of exams."
        actions={
          canManage && (
            <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
              Add Stage
            </Button>
          )
        }
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState title="Error Loading Stages" message={error} onRetry={loadStages} />
      ) : stages.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-12 h-12 text-gray-400" />}
          title="No Stages Found"
          description="Get started by creating your first standalone stage."
          action={
            canManage && (
              <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
                Add Stage
              </Button>
            )
          }
        />
      ) : (
        <Card className="divide-y divide-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Name (En)</th>
                  <th className="px-6 py-4">Name (Kn)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stages.map((stage) => (
                  <tr key={stage.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{stage.code}</td>
                    <td className="px-6 py-4">{stage.nameEn}</td>
                    <td className="px-6 py-4">{stage.nameKn}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={stage.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canManage && (
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(stage)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(stage.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingStage ? 'Edit Stage' : 'Add New Stage'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Stage Code (Unique ID)">
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g., PRELIMS, MAINS"
              required
            />
          </FormField>
          
          <FormField label="English Name">
            <Input
              value={formData.nameEn}
              onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
              placeholder="e.g., Preliminary Exam"
              required
            />
          </FormField>
          
          <FormField label="Kannada Name">
            <Input
              value={formData.nameKn}
              onChange={(e) => setFormData({ ...formData, nameKn: e.target.value })}
              placeholder="Kannada name"
              required
            />
          </FormField>
          
          <FormField label="English Description (Optional)">
            <Input
              value={formData.descriptionEn}
              onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
            />
          </FormField>
          
          <FormField label="Kannada Description (Optional)">
            <Input
              value={formData.descriptionKn}
              onChange={(e) => setFormData({ ...formData, descriptionKn: e.target.value })}
            />
          </FormField>

          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              id="isActive"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingStage ? 'Save Changes' : 'Create Stage'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
