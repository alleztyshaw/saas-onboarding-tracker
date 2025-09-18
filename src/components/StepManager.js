import React, { useState } from 'react';
import { Plus, Edit3, Trash2, GripVertical, ArrowLeft, Save, X } from 'lucide-react';

const StepManager = ({ 
  stepTemplate, 
  onUpdateSteps, 
  onBack, 
  supabase 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [newStep, setNewStep] = useState({ 
    title: '', 
    estimatedDays: 1, 
    owner: 'customer', 
    description: '' 
  });
  const [draggedStep, setDraggedStep] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [hoveredStep, setHoveredStep] = useState(null);

  // Add new step
  const addNewStep = async () => {
    if (!newStep.title) return;
    
    try {
      const maxOrder = Math.max(...stepTemplate.map(step => step.order), 0);
      const stepData = {
        order: maxOrder + 1,
        title: newStep.title,
        description: newStep.description,
        estimated_days: parseInt(newStep.estimatedDays),
        owner: newStep.owner
      };
      
      const result = await supabase.from('step_templates').insert(stepData).execute();
      
      if (result && result[0]) {
        const updatedSteps = [...stepTemplate, result[0]].sort((a, b) => a.order - b.order);
        onUpdateSteps(updatedSteps);
      }
      
      setNewStep({ title: '', estimatedDays: 1, owner: 'customer', description: '' });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to add step:', error);
      alert('Failed to add step');
    }
  };

  // Update existing step
  const updateStep = async (stepId, updates) => {
    try {
      await supabase.from('step_templates').update(updates).eq('id', stepId).execute();
      
      const updatedTemplate = stepTemplate.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      );
      onUpdateSteps(updatedTemplate);
      setEditingStep(null);
    } catch (error) {
      console.error('Failed to update step:', error);
      alert('Failed to update step');
    }
  };

  // Delete step
  const deleteStep = async (stepId) => {
    if (!window.confirm('Are you sure you want to delete this step?')) return;
    
    try {
      await supabase.from('step_templates').delete().eq('id', stepId).execute();
      
      const updatedTemplate = stepTemplate.filter(step => step.id !== stepId);
      onUpdateSteps(updatedTemplate);
    } catch (error) {
      console.error('Failed to delete step:', error);
      alert('Failed to delete step');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, step) => {
    setDraggedStep(step);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (!draggedStep) return;

    const currentIndex = stepTemplate.findIndex(step => step.id === draggedStep.id);
    if (currentIndex === dropIndex) {
      setDraggedStep(null);
      setDragOverIndex(null);
      return;
    }

    const newSteps = [...stepTemplate];
    const [movedStep] = newSteps.splice(currentIndex, 1);
    newSteps.splice(dropIndex, 0, movedStep);

    // Update order values
    const updatedSteps = newSteps.map((step, index) => ({
      ...step,
      order: index + 1
    }));

    onUpdateSteps(updatedSteps);

    // Update all orders in database
    try {
      for (const step of updatedSteps) {
        await supabase.from('step_templates').update({ order: step.order }).eq('id', step.id).execute();
      }
    } catch (error) {
      console.error('Failed to update step order:', error);
    }

    setDraggedStep(null);
    setDragOverIndex(null);
  };

  const getOwnerIcon = (owner) => {
    return owner === 'customer' 
      ? <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
      : <span className="w-3 h-3 bg-purple-500 rounded-full"></span>;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Tracker
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Onboarding Steps</h1>
              <p className="text-gray-600">Configure your master onboarding process</p>
            </div>
          </div>
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Step
          </button>
        </div>
      </div>

      {/* Add New Step Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Onboarding Step</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Step Title</label>
                <input
                  type="text"
                  value={newStep.title}
                  onChange={(e) => setNewStep({...newStep, title: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., API Integration Setup"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newStep.description}
                  onChange={(e) => setNewStep({...newStep, description: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Detailed description..."
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Estimated Days</label>
                  <input
                    type="number"
                    min="1"
                    value={newStep.estimatedDays}
                    onChange={(e) => setNewStep({...newStep, estimatedDays: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Owner</label>
                  <select
                    value={newStep.owner}
                    onChange={(e) => setNewStep({...newStep, owner: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="customer">Customer</option>
                    <option value="product_team">Product Team</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={addNewStep}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Step
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setNewStep({ title: '', estimatedDays: 1, owner: 'customer', description: '' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Step Modal */}
      {editingStep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Step</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Step Title</label>
                <input
                  type="text"
                  value={editingStep.title}
                  onChange={(e) => setEditingStep({...editingStep, title: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={editingStep.description}
                  onChange={(e) => setEditingStep({...editingStep, description: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Estimated Days</label>
                  <input
                    type="number"
                    min="1"
                    value={editingStep.estimated_days}
                    onChange={(e) => setEditingStep({...editingStep, estimated_days: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Owner</label>
                  <select
                    value={editingStep.owner}
                    onChange={(e) => setEditingStep({...editingStep, owner: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="customer">Customer</option>
                    <option value="product_team">Product Team</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => updateStep(editingStep.id, editingStep)}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingStep(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Steps List */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Onboarding Step Templates ({stepTemplate.length})</h3>
          <div className="text-sm text-gray-600">
            Drag to reorder • Hover for actions
          </div>
        </div>
        
        {stepTemplate.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Steps Configured</h4>
            <p className="text-gray-600 mb-4">Start by adding your first onboarding step.</p>
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" />
              Add First Step
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {stepTemplate.map((step, index) => (
              <div 
                key={step.id} 
                className={`group flex gap-4 p-4 rounded-lg border-2 transition-all cursor-move ${
                  dragOverIndex === index ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:shadow-md'
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, step)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onMouseEnter={() => setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                <div className="flex flex-col items-center">
                  <GripVertical 
                    className={`w-6 h-6 text-gray-400 transition-opacity ${
                      hoveredStep === step.id || draggedStep?.id === step.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`} 
                  />
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        Step {step.order}
                      </span>
                      <h4 className="font-semibold text-gray-900">{step.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {getOwnerIcon(step.owner)}
                      <span className="text-sm text-gray-600">
                        {step.owner === 'customer' ? 'Customer' : 'Product Team'}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{step.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Estimated: {step.estimated_days} day{step.estimated_days > 1 ? 's' : ''}</span>
                    </div>
                    
                    <div className={`flex gap-2 transition-opacity ${
                      hoveredStep === step.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      <button
                        onClick={() => setEditingStep(step)}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteStep(step.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Step Management Tips</h4>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Drag steps to reorder them based on your process flow</li>
          <li>• Customer steps require action from the customer</li>
          <li>• Product Team steps are handled internally</li>
          <li>• Changes here apply to all future customers</li>
        </ul>
      </div>
    </div>
  );
};

export default StepManager;
