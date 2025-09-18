import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, User, Users, Plus, Settings, Database, Wifi, AlertCircle, Calendar, ArrowLeft, Edit3, Trash2, GripVertical, Save, X } from 'lucide-react';

// Supabase configuration
const SUPABASE_URL = 'https://svcxdskpdrfflqkbvxmy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Y3hkc2twZHJmZmxxa2J2eG15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNDQzOTIsImV4cCI6MjA3MzcyMDM5Mn0.IY-U0PQZZJjtkwXqELfrlZnmz_J4AKAwIZHrIJuVFgY';

const supabase = {
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY,
  
  async request(endpoint, options = {}) {
    const url = `${this.url}/rest/v1/${endpoint}`;
    const headers = {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers
    };
    
    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (error) {
      console.error('Supabase request failed:', error);
      throw error;
    }
  },

  from(table) {
    return {
      select: () => ({
        async execute() {
          return supabase.request(`${table}?order=created_at.asc`);
        }
      }),
      insert: (data) => ({
        async execute() {
          return supabase.request(table, {
            method: 'POST',
            body: JSON.stringify(Array.isArray(data) ? data : [data])
          });
        }
      }),
      update: (data) => ({
        eq: (column, value) => ({
          async execute() {
            return supabase.request(`${table}?${column}=eq.${value}`, {
              method: 'PATCH',
              body: JSON.stringify(data)
            });
          }
        })
      }),
      delete: () => ({
        eq: (column, value) => ({
          async execute() {
            return supabase.request(`${table}?${column}=eq.${value}`, {
              method: 'DELETE'
            });
          }
        })
      })
    };
  }
};

function App() {
  const [currentPage, setCurrentPage] = useState('tracker');
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [stepTemplate, setStepTemplate] = useState([]);
  const [importingData, setImportingData] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [newStep, setNewStep] = useState({ title: '', estimatedDays: 1, owner: 'customer', description: '' });
  const [draggedStep, setDraggedStep] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [hoveredStep, setHoveredStep] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const customersData = await supabase.from('customers').select().execute();
      const templatesData = await supabase.from('step_templates').select().execute();
      
      setCustomers(customersData || []);
      const sortedTemplates = (templatesData || []).sort((a, b) => a.order - b.order);
      setStepTemplate(sortedTemplates);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const importSampleData = async () => {
    setImportingData(true);
    try {
      const sampleSteps = [
        { order: 1, title: "Account Setup & Email Verification", description: "Customer verifies email and completes basic account information", estimated_days: 1, owner: "customer" },
        { order: 2, title: "Initial Configuration Call", description: "30-minute onboarding call with Customer Success team to understand requirements", estimated_days: 2, owner: "product_team" },
        { order: 3, title: "Data Integration Setup", description: "Connect customer's existing systems and import initial data", estimated_days: 3, owner: "product_team" },
        { order: 4, title: "Team Training Session", description: "Comprehensive training for up to 10 team members on platform features", estimated_days: 1, owner: "product_team" },
        { order: 5, title: "Custom Workflow Configuration", description: "Customer configures workflows specific to their business processes", estimated_days: 2, owner: "customer" },
        { order: 6, title: "UAT & Feedback", description: "Customer tests all features and provides feedback for final adjustments", estimated_days: 3, owner: "customer" },
        { order: 7, title: "Go-Live Support", description: "Final system checks and go-live support during first week of production use", estimated_days: 2, owner: "product_team" }
      ];

      const sampleCustomers = [
        { name: "TechStart Inc.", email: "admin@techstart.com", signup_date: "2024-09-10" },
        { name: "Innovation Labs", email: "team@innovationlabs.io", signup_date: "2024-09-15" }
      ];

      await supabase.from('step_templates').insert(sampleSteps).execute();
      await supabase.from('customers').insert(sampleCustomers).execute();
      
      await loadData();
      alert('✅ Sample data imported successfully!');
    } catch (error) {
      console.error('Failed to import sample data:', error);
      alert('❌ Failed to import sample data');
    } finally {
      setImportingData(false);
    }
  };

  // Step management functions
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
        setStepTemplate([...stepTemplate, result[0]].sort((a, b) => a.order - b.order));
      }
      
      setNewStep({ title: '', estimatedDays: 1, owner: 'customer', description: '' });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to add step:', error);
      alert('Failed to add step');
    }
  };

  const updateStep = async (stepId, updates) => {
    try {
      await supabase.from('step_templates').update(updates).eq('id', stepId).execute();
      
      const updatedTemplate = stepTemplate.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      );
      setStepTemplate(updatedTemplate);
      setEditingStep(null);
    } catch (error) {
      console.error('Failed to update step:', error);
      alert('Failed to update step');
    }
  };

  const deleteStep = async (stepId) => {
    if (!window.confirm('Are you sure you want to delete this step?')) return;
    
    try {
      await supabase.from('step_templates').delete().eq('id', stepId).execute();
      
      const updatedTemplate = stepTemplate.filter(step => step.id !== stepId);
      setStepTemplate(updatedTemplate);
    } catch (error) {
      console.error('Failed to delete step:', error);
      alert('Failed to delete step');
    }
  };

  // Drag and drop functions
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

    setStepTemplate(updatedSteps);

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
      ? <User className="w-4 h-4 text-blue-600" />
      : <Users className="w-4 h-4 text-purple-600" />;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your data from Supabase...</p>
        </div>
      </div>
    );
  }

  // Step Management Page
  if (currentPage === 'manage') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentPage('tracker')}
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
                <Wifi className="w-4 h-4" />
                Connected
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
                    placeholder="Detailed description of what this step involves..."
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
              <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Steps Configured</h4>
              <p className="text-gray-600 mb-4">Start by adding your first onboarding step or import sample data.</p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add First Step
                </button>
                <button 
                  onClick={importSampleData}
                  disabled={importingData}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Database className="w-4 h-4" />
                  {importingData ? 'Importing...' : 'Import Sample Steps'}
                </button>
              </div>
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
  }  // Main Tracker Page
  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SaaS Onboarding Tracker</h1>
            <p className="text-gray-600">Monitor customer onboarding progress in real-time</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
              <Wifi className="w-4 h-4" />
              Connected to Supabase
            </div>
            <button 
              onClick={() => setCurrentPage('manage')}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Manage Steps
            </button>
          </div>
        </div>

        {customers.length === 0 && stepTemplate.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Your Onboarding Tracker!</h3>
            <p className="text-gray-600 mb-4">
              Get started by importing sample data or setting up your onboarding steps.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={importSampleData}
                disabled={importingData}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Database className="w-4 h-4" />
                {importingData ? 'Importing...' : 'Import Sample Data'}
              </button>
              <button 
                onClick={() => setCurrentPage('manage')}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Setup Steps
              </button>
            </div>
          </div>
        )}

        {customers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Customers ({customers.length})</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {customers.map(customer => (
                <div key={customer.id} className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="font-semibold">{customer.name}</div>
                  <div className="text-sm text-gray-600">{customer.email}</div>
                  <div className="text-xs text-gray-500 mt-1">Started: {customer.signup_date}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stepTemplate.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Onboarding Process ({stepTemplate.length} steps)</h3>
              <button 
                onClick={() => setCurrentPage('manage')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Edit Steps →
              </button>
            </div>
            <div className="space-y-3">
              {stepTemplate.map((step, index) => (
                <div key={step.id} className="flex gap-4 p-4 border rounded-lg bg-white">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
                      {step.order}
                    </div>
                    {index < stepTemplate.length - 1 && (
                      <div className="w-0.5 h-6 bg-gray-300 mt-2"></div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">{step.title}</h4>
                      <div className="flex items-center gap-2">
                        {getOwnerIcon(step.owner)}
                        <span className="text-sm text-gray-600">
                          {step.owner === 'customer' ? 'Customer' : 'Product Team'}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{step.description}</p>
                    <div className="text-xs text-gray-500">
                      Estimated: {step.estimated_days} day{step.estimated_days > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">🎉 Step Management Added!</h4>
        <p className="text-blue-800 text-sm">
          You can now configure your onboarding process! Use "Manage Steps" to add, edit, reorder, and delete steps. 
          All changes automatically save to your Supabase database.
        </p>
      </div>
    </div>
  );
}

export default App;
