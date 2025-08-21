import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useData } from '../../contexts/DataContext';
import { Plan } from '../../types';
import { List, Edit, Trash2, Plus, Star, GripVertical } from 'lucide-react';

export const PlanManager: React.FC = () => {
  const { plans, addPlan, updatePlan, deletePlan } = useData();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [draggedPlan, setDraggedPlan] = useState<string | null>(null);
  const [dragOverPlan, setDragOverPlan] = useState<string | null>(null);
  const [localPlans, setLocalPlans] = useState<Plan[]>([]);

  // Initialize local plans when plans change
  React.useEffect(() => {
    setLocalPlans(plans);
  }, [plans]);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, planId: string) => {
    setDraggedPlan(planId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', planId);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, planId: string) => {
    e.preventDefault();
    if (draggedPlan && draggedPlan !== planId) {
      setDragOverPlan(planId);
    }
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverPlan(null);
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent, targetPlanId: string) => {
    e.preventDefault();
    if (!draggedPlan || draggedPlan === targetPlanId) return;

    try {
      // Get current plan order
      const currentPlans = [...localPlans];
      const draggedIndex = currentPlans.findIndex(p => p.id === draggedPlan);
      const targetIndex = currentPlans.findIndex(p => p.id === targetPlanId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      // Reorder plans
      const [draggedPlanData] = currentPlans.splice(draggedIndex, 1);
      
      // Insert at the target position
      if (targetIndex >= currentPlans.length) {
        // If target is beyond the end, append to the end
        currentPlans.push(draggedPlanData);
      } else {
        // Insert at the target position
        currentPlans.splice(targetIndex, 0, draggedPlanData);
      }

      // Update local state immediately for visual feedback
      setLocalPlans(currentPlans);

      // Update order in database
      await updatePlanOrderInDatabase(currentPlans);
      
      console.log('Plan reordered:', { 
        from: draggedIndex, 
        to: targetIndex, 
        plan: draggedPlanData.name,
        newOrder: currentPlans.map((p, i) => ({ name: p.name, order: i }))
      });
      
    } catch (error) {
      console.error('Error reordering plans:', error);
      // Revert local state if database update fails
      setLocalPlans([...plans]);
    } finally {
      setDraggedPlan(null);
      setDragOverPlan(null);
    }
  };

  // Function to update plan order in database
  const updatePlanOrderInDatabase = async (reorderedPlans: Plan[]) => {
    try {
      // Update each plan's order field
      const updates = reorderedPlans.map((plan, index) => ({
        id: plan.id,
        order: index
      }));

      // Use the updatePlan function to update each plan
      for (const update of updates) {
        await updatePlan(update.id, { order: update.order });
      }

      console.log('Plan order updated in database successfully');
    } catch (error) {
      console.error('Failed to update plan order in database:', error);
      throw error;
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedPlan(null);
    setDragOverPlan(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Plan Manager</h2>
          <p className="text-sm text-gray-600 mt-1">
            Drag and drop plans to reorder them. The order affects how they appear to users.
          </p>
          {localPlans.length !== plans.length && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Order Changed:</strong> Plans have been reordered. 
                <button 
                  onClick={() => setLocalPlans([...plans])}
                  className="ml-2 text-blue-600 hover:text-blue-800 underline"
                >
                  Reset to original order
                </button>
              </p>
            </div>
          )}
          {plans.some(plan => plan.type === 'custom') && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> To use custom plans, you need to update your database schema. 
                Run this SQL: <code className="bg-yellow-100 px-2 py-1 rounded">ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_type_check;</code>
              </p>
            </div>
          )}
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <Plus size={16} />
          Add Plan
        </Button>
      </div>

      <div className="grid gap-4">
        {localPlans.map((plan, index) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            index={index}
            isDragging={draggedPlan === plan.id}
            isDragOver={dragOverPlan === plan.id}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onEdit={setEditingPlan}
            onDelete={(id) => setDeleteConfirm(id)}
            onTogglePopular={(id, popular) => updatePlan(id, { popular })}
          />
        ))}
      </div>

      {showAddForm && (
        <PlanForm
          onSubmit={async (planData) => {
            try {
              await addPlan(planData);
              setShowAddForm(false);
            } catch (error) {
              // Error already handled in DataContext with alert
              console.error('Plan creation failed:', error);
            }
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingPlan && (
        <PlanForm
          plan={editingPlan}
          onSubmit={(planData) => {
            updatePlan(editingPlan.id, planData);
            setEditingPlan(null);
          }}
          onCancel={() => setEditingPlan(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-4 text-center">Delete Plan</h3>
            <p className="text-gray-600 mb-6 text-center">
              Are you sure you want to delete this plan? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  deletePlan(deleteConfirm);
                  setDeleteConfirm(null);
                }}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

interface PlanCardProps {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onDelete: (id: string) => void;
  onTogglePopular: (id: string, popular: boolean) => void;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, planId: string) => void;
  onDragOver: (e: React.DragEvent, planId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, targetPlanId: string) => void;
  onDragEnd: () => void;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  index,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onEdit,
  onDelete,
  onTogglePopular,
}) => {
  return (
    <div
      className={`transition-all duration-200 ${isDragging ? 'opacity-50 scale-95' : ''} ${isDragOver ? 'border-2 border-blue-500 rounded-3xl bg-blue-50' : ''}`}
      draggable={!isDragging}
      onDragStart={(e: React.DragEvent) => onDragStart(e, plan.id)}
      onDragOver={(e: React.DragEvent) => onDragOver(e, plan.id)}
      onDragLeave={onDragLeave}
      onDrop={(e: React.DragEvent) => onDrop(e, plan.id)}
      onDragEnd={onDragEnd}
    >
      <Card className="p-6 cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Drag Handle */}
            <div className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 transition-colors">
              <GripVertical size={20} />
            </div>
            
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <List className="text-blue-600" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium transition-all duration-200 ${
                  isDragging ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'
                }`}>
                  #{index + 1}
                </span>
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                {plan.popular && (
                  <Star className="text-yellow-500 fill-current" size={16} />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span>Duration: {plan.duration}</span>
                <span>Type: {plan.type}</span>
                <span>Price: ₦{plan.price.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs ${
              plan.popular 
                ? 'bg-yellow-100 text-yellow-700' 
                : 'bg-gray-100 text-gray-700'
            }`}>
              {plan.popular ? 'Popular' : 'Standard'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTogglePopular(plan.id, !plan.popular)}
            >
              {plan.popular ? 'Remove Popular' : 'Mark Popular'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(plan)}
              className="flex items-center gap-1"
            >
              <Edit size={16} />
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(plan.id)}
              className="flex items-center gap-1"
            >
              <Trash2 size={16} />
              Delete
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Data Amount</p>
            <p className="font-semibold text-gray-900">
              {plan.dataAmount}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Duration</p>
            <p className="font-semibold text-gray-900">{plan.duration}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Price</p>
            <p className="font-semibold text-gray-900">₦{plan.price.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Type</p>
            <p className="font-semibold text-gray-900 capitalize">{plan.type}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

interface PlanFormProps {
  plan?: Plan;
  onSubmit: (plan: Omit<Plan, 'id'>) => Promise<void> | void;
  onCancel: () => void;
}

const PlanForm: React.FC<PlanFormProps> = ({ plan, onSubmit, onCancel }) => {
  const { plans } = useData(); // Added plans to access existing plans for validation
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    duration: plan?.duration || '',
    durationHours: plan?.durationHours || 3,
    price: plan?.price || 0,
    dataAmount: plan?.dataAmount || '',
    type: plan?.type || '3-hour' as const,
    popular: plan?.popular || false,
    isUnlimited: plan?.isUnlimited || false,
  });

  // Auto-calculate duration hours based on type if not manually set
  const getDefaultDurationHours = (type: string): number => {
    switch (type) {
      case '3-hour': return 3;
      case 'daily': return 24;
      case 'weekly': return 168; // 24 * 7
      case 'monthly': return 720; // 24 * 30
      case 'custom': return formData.durationHours || 1; // Keep current value or default to 1
      default: return 3;
    }
  };

  // Format duration description for custom plans
  const formatCustomDuration = (hours: number): string => {
    if (hours < 24) {
      return `${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
    } else if (hours < 168) { // Less than a week
      const days = Math.floor(hours / 24);
      return `${days} ${days === 1 ? 'Day' : 'Days'}`;
    } else if (hours < 720) { // Less than a month
      const weeks = Math.floor(hours / 168);
      return `${weeks} ${weeks === 1 ? 'Week' : 'Weeks'}`;
    } else {
      const months = Math.floor(hours / 720);
      return `${months} ${months === 1 ? 'Month' : 'Months'}`;
    }
  };

  const handleTypeChange = (type: string) => {
    const defaultHours = getDefaultDurationHours(type);
    const newDuration = type === 'custom' ? formData.duration : formatCustomDuration(defaultHours);
    
    // Auto-generate name for custom plans if name is empty or generic
    let newName = formData.name;
    if (type === 'custom' && (!formData.name || formData.name === 'Quick Browse' || formData.name === '')) {
      newName = `${formatCustomDuration(formData.durationHours || 1)} Plan`;
    }
    
    setFormData({
      ...formData,
      type: type as any,
      durationHours: type === 'custom' ? formData.durationHours : defaultHours,
      duration: newDuration,
      name: newName
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure durationHours is valid
    if (!formData.durationHours || formData.durationHours <= 0) {
      alert('Duration hours must be greater than 0');
      return;
    }

    // For custom plans, ensure duration description is meaningful
    if (formData.type === 'custom' && (!formData.duration || formData.duration.trim() === '')) {
      alert('Please provide a meaningful duration description for custom plans (e.g., "5 Hours", "2 Days")');
      return;
    }

    // For custom plans, ensure name is descriptive and unique
    if (formData.type === 'custom') {
      if (!formData.name || formData.name.trim() === '') {
        alert('Custom plans must have a descriptive name (e.g., "5-Hour Plan", "Weekend Special")');
        return;
      }
      
      // Check if name already exists
      const existingPlan = plans.find(p => p.name.toLowerCase() === formData.name.toLowerCase());
      if (existingPlan && !plan) { // Only check for new plans, not when editing
        alert('A plan with this name already exists. Please choose a different name.');
        return;
      }
    }

    // Prepare the complete form data
    const planData = {
      ...formData,
      dataAmount: formData.isUnlimited ? 'Unlimited' : formData.dataAmount,
      isActive: true,
      order: plans.length, // Add new plans at the end
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSubmit(planData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            {plan ? 'Edit Plan' : 'Add New Plan'}
          </h3>

          {formData.type === 'custom' && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Database Update Required:</strong> To use custom plans, you need to update your database schema. 
                Run this SQL command in your Supabase SQL editor:
              </p>
              <code className="block mt-2 bg-yellow-100 px-3 py-2 rounded text-xs font-mono">
                ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_type_check;
              </code>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Plan Name"
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
              placeholder={formData.type === 'custom' ? "e.g., 5-Hour Plan, Weekend Special" : "e.g., Quick Browse"}
              required
            />

            <Input
              label="Duration"
              value={formData.duration}
              onChange={(value) => setFormData({ ...formData, duration: value })}
              placeholder="e.g., 3 Hours, 2 Days, Custom Duration"
              required
            />

            <Input
              label="Price (₦)"
              type="number"
              value={formData.price.toString()}
              onChange={(value) => setFormData({ ...formData, price: parseFloat(value) || 0 })}
              placeholder="250.00"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Plan Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                required
              >
                <option value="3-hour">3-Hour</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <Input
              label="Duration Hours (for system calculation)"
              type="number"
              value={formData.durationHours.toString()}
              onChange={(value) => {
                const hours = parseInt(value) || 0;
                setFormData({ 
                  ...formData, 
                  durationHours: hours,
                  // Auto-format duration description for custom plans
                  duration: formData.type === 'custom' ? formatCustomDuration(hours) : formData.duration
                });
              }}
              placeholder={formData.type === 'custom' ? "e.g., 10" : "3"}
              required
            />
            {formData.type === 'custom' && (
              <p className="text-sm text-gray-600 -mt-2">
                Enter the exact number of hours for this custom plan
              </p>
            )}
            {formData.type !== 'custom' && (
              <p className="text-sm text-gray-600 -mt-2">
                System will auto-calculate based on plan type
              </p>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isUnlimited"
                checked={formData.isUnlimited}
                onChange={(e) => setFormData({ ...formData, isUnlimited: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="isUnlimited" className="text-sm text-gray-900 font-medium">
                Unlimited Data
              </label>
            </div>

            {!formData.isUnlimited && (
              <Input
                label="Data Amount (GB)"
                value={formData.dataAmount}
                onChange={(value) => setFormData({ ...formData, dataAmount: value })}
                placeholder="e.g., 2"
                required={!formData.isUnlimited}
              />
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="popular"
                checked={formData.popular}
                onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="popular" className="text-sm text-gray-900 font-medium">
                Mark as popular plan
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                {plan ? 'Update' : 'Add'} Plan
              </Button>
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};