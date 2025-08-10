import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useData } from '../../contexts/DataContext';
import { Plan } from '../../types';
import { List, Edit, Trash2, Plus, Star } from 'lucide-react';

export const PlanManager: React.FC = () => {
  const { plans, addPlan, updatePlan, deletePlan } = useData();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Plan Manager</h2>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <Plus size={16} />
          Add Plan
        </Button>
      </div>

      <div className="grid gap-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
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
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  onEdit,
  onDelete,
  onTogglePopular,
}) => {
  return (
    <Card className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <List className="text-blue-600" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
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
  );
};

interface PlanFormProps {
  plan?: Plan;
  onSubmit: (plan: Omit<Plan, 'id'>) => Promise<void> | void;
  onCancel: () => void;
}

const PlanForm: React.FC<PlanFormProps> = ({ plan, onSubmit, onCancel }) => {
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
      default: return 3;
    }
  };

  const handleTypeChange = (type: string) => {
    const defaultHours = getDefaultDurationHours(type);
    setFormData({
      ...formData,
      type: type as any,
      durationHours: defaultHours,
      duration: formData.duration || `${defaultHours} ${defaultHours === 1 ? 'Hour' : 'Hours'}`
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure durationHours is valid
    if (!formData.durationHours || formData.durationHours <= 0) {
      alert('Duration hours must be greater than 0');
      return;
    }

    // Prepare the complete form data
    const planData = {
      ...formData,
      dataAmount: formData.isUnlimited ? 'Unlimited' : formData.dataAmount,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSubmit(planData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {plan ? 'Edit Plan' : 'Add New Plan'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Plan Name"
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
              placeholder="e.g., Quick Browse"
              required
            />

            <Input
              label="Duration"
              value={formData.duration}
              onChange={(value) => setFormData({ ...formData, duration: value })}
              placeholder="e.g., 3 Hours"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="3-hour">3-Hour</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <Input
              label="Duration Hours (for system calculation)"
              type="number"
              value={formData.durationHours.toString()}
              onChange={(value) => setFormData({ ...formData, durationHours: parseInt(value) || 0 })}
              placeholder="3"
              required
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isUnlimited"
                checked={formData.isUnlimited}
                onChange={(e) => setFormData({ ...formData, isUnlimited: e.target.checked })}
              />
              <label htmlFor="isUnlimited" className="text-sm text-gray-700">
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
              />
              <label htmlFor="popular" className="text-sm text-gray-700">
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