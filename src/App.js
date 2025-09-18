import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, User, Users, Plus, Settings, Database, Wifi, AlertCircle, Calendar, BarChart3, UserCheck, ArrowLeft, Check, X, GripVertical, Trash2 } from 'lucide-react';

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
      select: (columns = '*') => ({
        eq: (column, value) => ({
          async execute() {
            return supabase.request(`${table}?${column}=eq.${value}&select=${columns}&order=created_at.asc`);
          }
        }),
        async execute() {
          return supabase.request(`${table}?select=${columns}&order=created_at.asc`);
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
      }),
      upsert: (data) => ({
        async execute() {
          return supabase.request(table, {
            method: 'POST',
            headers: { 'Prefer': 'resolution=merge-duplicates' },
            body: JSON.stringify(Array.isArray(data) ? data : [data])
          });
        }
      })
    };
  }
};

function App() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [stepTemplate, setStepTemplate] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerProgress, setCustomerProgress] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, customer-detail, step-management
  const [draggedStep, setDraggedStep] = useState(null);
  const [hoveredStep, setHoveredStep] = useState(null);
  const [newStep, setNewStep] = useState({ title: '', description: '', estimated_days: 1, owner: 'customer' });
  const [isAddingStep, setIsAddingStep] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading data from Supabase...');
      
      const customersData = await supabase.from('customers').select().execute();
      const templatesData = await supabase.from('step_templates').select().execute();
      
      console.log('Raw customers response:', customersData);
      console.log('Raw templates response:', templatesData);
      
      setCustomers(customersData || []);
      const sortedTemplates = (templatesData || []).sort((a, b) => a.order - b.order);
      setStepTemplate(sortedTemplates);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerProgress = async (customerId) => {
    try {
      setLoadingProgress(true);
      console.log('Loading progress for customer:', customerId);
      
      const progressData = await supabase.from('customer_progress')
        .select()
        .eq('customer_id', customerId)
        .execute();
      
      console.log('Progress data:', progressData);
      setCustomerProgress(progressData || []);
    } catch (error) {
      console.error('Failed to load customer progress:', error);
    } finally {
      setLoadingProgress(false);
    }
  };

  const toggleStepCompletion = async (stepId, isCompleted) => {
    try {
      if (isCompleted) {
        // Adding completion
        const progressData = {
          customer_id: selectedCustomer.id,
          step_template_id: stepId,
          completed: true,
          completed_at: new Date().toISOString()
        };
        await supabase.from('customer_progress').upsert(progressData).execute();
      } else {
        // Removing completion - delete the record
        await supabase.from('customer_progress')
          .delete()
          .eq('customer_id', selectedCustomer.id)
          .eq('step_template_id', stepId)
          .execute();
      }
      
      await loadCustomerProgress(selectedCustomer.id);
    } catch (error) {
      console.error('Failed to update step completion:', error);
      alert('❌ Failed to update step completion');
    }
  };

  const getStepCompletion = (stepId) => {
    const progress = customerProgress.find(p => p.step_template_id === stepId);
    return progress?.completed || false;
  };

  const calculateProgress = () => {
    if (stepTemplate.length === 0) return 0;
    const completedSteps = stepTemplate.filter(step => getStepCompletion(step.id)).length;
    return Math.round((completedSteps / stepTemplate.length) * 100);
  };

  const getOwnerIcon = (owner) => {
    return owner === 'customer' 
      ? <User className="w-4 h-4 text-blue-600" />
      : <Users className="w-4 h-4 text-purple-600" />;
  };

  const viewCustomerDetail = (customer) => {
    setSelectedCustomer(customer);
    setCurrentView('customer-detail');
    loadCustomerProgress(customer.id);
  };

  const viewStepManagement = () => {
    setCurrentView('step-management');
  };

  const backToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedCustomer(null);
    setCustomerProgress([]);
  };

  // Step Management Functions
  const handleDragStart = (e, step) => {
    setDraggedStep(step);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetStep) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoveredStep(targetStep.id);
  };

  const handleDragLeave = () => {
    setHoveredStep(null);
  };

  const handleDrop = async (e, targetStep) => {
    e.preventDefault();
    setHoveredStep(null);
    
    if (!draggedStep || draggedStep.id === targetStep.id) {
      setDraggedStep(null);
      return;
    }

    try {
      // Reorder the steps
      const newSteps = [...stepTemplate];
      const draggedIndex = newSteps.findIndex(s => s.id === draggedStep.id);
      const targetIndex = newSteps.findIndex(s => s.id === targetStep.id);
      
      // Remove dragged step and insert at target position
      newSteps.splice(draggedIndex, 1);
      newSteps.splice(targetIndex, 0, draggedStep);
      
      // Update order values
      const updatedSteps = newSteps.map((step, index) => ({
        ...step,
        order: index + 1
      }));
      
      setStepTemplate(updatedSteps);
      
      // Update in database
      for (const step of updatedSteps) {
        await supabase.from('step_templates')
          .update({ order: step.order })
          .eq('id', step.id)
          .execute();
      }
      
    } catch (error) {
      console.error('Failed to reorder steps:', error);
      alert('❌ Failed to reorder steps');
      await loadData(); // Reload to get correct order
    }
    
    setDraggedStep(null);
  };

  const addNewStep = async () => {
    if (!newStep.title.trim() || !newStep.description.trim()) {
      alert('Please fill in both title and description');
      return;
    }

    try {
      const stepData = {
        ...newStep,
        order: stepTemplate.length + 1
      };

      await supabase.from('step_templates').insert(stepData).execute();
      await loadData();
      
      setNewStep({ title: '', description: '', estimated_days: 1, owner: 'customer' });
      setIsAddingStep(false);
    } catch (error) {
      console.error('Failed to add step:', error);
      alert('❌ Failed to add step');
    }
  };

  const deleteStep = async (stepId) => {
    if (!confirm('Are you sure you want to delete this step? This will remove it for all customers.')) {
      return;
    }

    try {
      await supabase.from('step_templates').delete().eq('id', stepId).execute();
      await loadData();
    } catch (error) {
      console.error('Failed to delete step:', error);
      alert('❌ Failed to delete step');
    }
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

  // Step Management View
  if (currentView === 'step-management') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={backToDashboard}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Dashboard
              </button>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Onboarding Steps</h1>
          </div>

          {/* Add New Step */}
          <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
            {!isAddingStep ? (
              <button
                onClick={() => setIsAddingStep(true)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add new step
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Step title..."
                  value={newStep.title}
                  onChange={(e) => setNewStep({...newStep, title: e.target.value})}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="Step description..."
                  value={newStep.description}
                  onChange={(e) => setNewStep({...newStep, description: e.target.value})}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                />
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Days:</label>
                    <input
                      type="number"
                      min="1"
                      value={newStep.estimated_days}
                      onChange={(e) => setNewStep({...newStep, estimated_days: parseInt(e.target.value)})}
                      className="w-16 p-1 border rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Owner:</label>
                    <select
                      value={newStep.owner}
                      onChange={(e) => setNewStep({...newStep, owner: e.target.value})}
                      className="p-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="customer">Customer</option>
                      <option value="product_team">Product Team</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addNewStep}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Add Step
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingStep(false);
                      setNewStep({ title: '', description: '', estimated_days: 1, owner: 'customer' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Steps List */}
          <div className="space-y-2">
            {stepTemplate.map((step, index) => (
              <div
                key={step.id}
                draggable
                onDragStart={(e) => handleDragStart(e, step)}
                onDragOver={(e) => handleDragOver(e, step)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, step)}
                onMouseEnter={() => setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
                className={`group flex items-center gap-3 p-4 border rounded-lg bg-white hover:bg-gray-50 transition-all cursor-move ${
                  hoveredStep === step.id && draggedStep ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}
              >
                {/* Drag Handle */}
                <div className={`text-gray-400 transition-opacity ${hoveredStep === step.id ? 'opacity-100' : 'opacity-0'}`}>
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Step Number */}
                <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                  {step.order}
                </div>

                {/* Step Content */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-gray-900">{step.title}</h4>
                    <div className="flex items-center gap-2">
                      {getOwnerIcon(step.owner)}
                      <span className="text-sm text-gray-600">
                        {step.owner === 'customer' ? 'Customer' : 'Product Team'}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-1">{step.description}</p>
                  <div className="text-xs text-gray-500">
                    Estimated: {step.estimated_days} day{step.estimated_days > 1 ? 's' : ''}
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => deleteStep(step.id)}
                  className={`text-red-400 hover:text-red-600 transition-all ${
                    hoveredStep === step.id ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Customer Detail View
  if (currentView === 'customer-detail') {
    const progressPercentage = calculateProgress();
    
    return (
      <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={backToDashboard}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Customer Info & Progress */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedCustomer.name}</h1>
                <p className="text-gray-600">{selectedCustomer.email}</p>
                <p className="text-sm text-gray-500">Started: {selectedCustomer.signup_date}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">{progressPercentage}%</div>
                <div className="text-sm text-gray-500">Complete</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-sm text-gray-600">
              <span>{stepTemplate.filter(step => getStepCompletion(step.id)).length} of {stepTemplate.length} steps completed</span>
              <span>{stepTemplate.length - stepTemplate.filter(step => getStepCompletion(step.id)).length} remaining</span>
            </div>
          </div>

          {/* Loading state */}
          {loadingProgress && (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-gray-600">Loading progress...</p>
            </div>
          )}

          {/* Steps List */}
          {!loadingProgress && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Onboarding Steps</h3>
              {stepTemplate.map((step, index) => {
                const isCompleted = getStepCompletion(step.id);
                
                return (
                  <div key={step.id} className={`flex gap-4 p-4 border rounded-lg transition-all ${
                    isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => toggleStepCompletion(step.id, !isCompleted)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                          isCompleted 
                            ? 'bg-green-500 border-green-500 text-white hover:bg-green-600' 
                            : 'border-gray-300 hover:border-green-500 hover:bg-green-50'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <span className="text-sm font-medium text-gray-600">{step.order}</span>
                        )}
                      </button>
                      {index < stepTemplate.length - 1 && (
                        <div className={`w-0.5 h-6 mt-2 ${isCompleted ? 'bg-green-300' : 'bg-gray-300'}`}></div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className={`font-semibold ${isCompleted ? 'text-green-800' : 'text-gray-900'}`}>
                          {step.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          {getOwnerIcon(step.owner)}
                          <span className="text-sm text-gray-600">
                            {step.owner === 'customer' ? 'Customer' : 'Product Team'}
                          </span>
                        </div>
                      </div>
                      <p className={`text-sm mb-2 ${isCompleted ? 'text-green-700' : 'text-gray-600'}`}>
                        {step.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          Estimated: {step.estimated_days} day{step.estimated_days > 1 ? 's' : ''}
                        </div>
                        {isCompleted && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            Completed
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              SaaS Onboarding Tracker
            </h1>
            <p className="text-gray-600">Monitor and manage customer onboarding journeys</p>
            <div className="flex items-center gap-4 mt-2">
              <div className="text-sm text-gray-500">
                {customers.length} customers • {stepTemplate.length} steps
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
                <Wifi className="w-4 h-4" />
                Connected
              </div>
            </div>
          </div>
          <button 
            onClick={viewStepManagement}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Manage Steps
          </button>
        </div>

        {customers.length === 0 && stepTemplate.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Your Onboarding Tracker!</h3>
            <p className="text-gray-600 mb-4">
              Start by setting up your onboarding steps, then add customers to track their progress.
            </p>
            <button 
              onClick={viewStepManagement}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <Settings className="w-4 h-4" />
              Set Up Steps
            </button>
          </div>
        )}

        {/* Show loaded data */}
        {customers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Customers ({customers.length})</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {customers.map(customer => (
                <div 
                  key={customer.id} 
                  className="p-4 border rounded-lg bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer"
                  onClick={() => viewCustomerDetail(customer)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{customer.name}</div>
                      <div className="text-sm text-gray-600">{customer.email}</div>
                      <div className="text-xs text-gray-500 mt-1">Started: {customer.signup_date}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-blue-600">View Progress →</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stepTemplate.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Onboarding Steps ({stepTemplate.length})</h3>
              <button 
                onClick={viewStepManagement}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Manage Steps →
              </button>
            </div>
            <div className="space-y-3">
              {stepTemplate.slice(0, 3).map((step, index) => (
                <div key={step.id} className="flex gap-4 p-4 border rounded-lg bg-white">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
                      {step.order}
                    </div>
                    {index < Math.min(stepTemplate.length - 1, 2) && (
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
              {stepTemplate.length > 3 && (
                <div className="text-center py-2">
                  <button 
                    onClick={viewStepManagement}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    ... and {stepTemplate.length - 3} more steps
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">🎯 Features Available</h4>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Click on customers to track their progress through onboarding steps</li>
          <li>• Use "Manage Steps" to add, reorder, and delete onboarding steps</li>
          <li>• Drag and drop steps to reorder them (Notion-style interface)</li>
          <li>• Toggle step completion with improved error handling</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
