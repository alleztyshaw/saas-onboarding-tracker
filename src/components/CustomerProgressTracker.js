import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, User, Users, AlertCircle, Calendar, ArrowRight, Play, CheckSquare } from 'lucide-react';

const CustomerProgressTracker = ({ 
  customers, 
  stepTemplate, 
  supabase, 
  onBack 
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSteps, setCustomerSteps] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customers.length > 0 && !selectedCustomer) {
      setSelectedCustomer(customers[0]);
    }
  }, [customers, selectedCustomer]);

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerSteps(selectedCustomer.id);
    }
  }, [selectedCustomer, stepTemplate]);

  const loadCustomerSteps = async (customerId) => {
    setLoading(true);
    try {
      // First, get existing customer steps
      const existingSteps = await supabase.from('customer_steps')
        .select()
        .execute();

      // Filter for this customer
      const customerSpecificSteps = (existingSteps || [])
        .filter(step => step.customer_id === customerId);

      // If no steps exist for this customer, create them from template
      if (customerSpecificSteps.length === 0 && stepTemplate.length > 0) {
        await initializeCustomerSteps(customerId);
        return; // This will trigger another loadCustomerSteps call
      }

      // Map existing steps with template data
      const stepsWithTemplate = stepTemplate.map(template => {
        const customerStep = customerSpecificSteps.find(cs => cs.template_id === template.id);
        return {
          id: template.id,
          order: template.order,
          title: template.title,
          description: template.description,
          estimatedDays: template.estimated_days,
          owner: template.owner,
          status: customerStep?.status || 'pending',
          startedDate: customerStep?.started_date,
          completedDate: customerStep?.completed_date,
          customerStepId: customerStep?.id
        };
      }).sort((a, b) => a.order - b.order);

      setCustomerSteps(stepsWithTemplate);
    } catch (error) {
      console.error('Failed to load customer steps:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeCustomerSteps = async (customerId) => {
    try {
      const customerStepInstances = stepTemplate.map(template => ({
        customer_id: customerId,
        template_id: template.id,
        status: 'pending'
      }));

      await supabase.from('customer_steps').insert(customerStepInstances).execute();
      
      // Reload after initialization
      setTimeout(() => loadCustomerSteps(customerId), 500);
    } catch (error) {
      console.error('Failed to initialize customer steps:', error);
    }
  };

  const updateStepStatus = async (step, newStatus) => {
    try {
      const updates = { 
        status: newStatus,
        ...(newStatus === 'in_progress' && { started_date: new Date().toISOString().split('T')[0] }),
        ...(newStatus === 'completed' && { 
          completed_date: new Date().toISOString().split('T')[0],
          started_date: step.startedDate || new Date().toISOString().split('T')[0]
        })
      };

      if (step.customerStepId) {
        // Update existing record
        await supabase.from('customer_steps')
          .update(updates)
          .eq('id', step.customerStepId)
          .execute();
      } else {
        // Create new record
        const newRecord = {
          customer_id: selectedCustomer.id,
          template_id: step.id,
          ...updates
        };
        await supabase.from('customer_steps').insert(newRecord).execute();
      }

      // Reload customer steps
      loadCustomerSteps(selectedCustomer.id);
    } catch (error) {
      console.error('Failed to update step status:', error);
      alert('Failed to update step status');
    }
  };

  const calculateProgress = () => {
    if (!customerSteps.length) return 0;
    const completedSteps = customerSteps.filter(step => step.status === 'completed').length;
    return Math.round((completedSteps / customerSteps.length) * 100);
  };

  const getCurrentStep = () => {
    return customerSteps.find(step => step.status === 'in_progress') || 
           customerSteps.find(step => step.status === 'pending');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-6 h-6 text-blue-500" />;
      default:
        return <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>;
    }
  };

  const getOwnerIcon = (owner) => {
    return owner === 'customer' 
      ? <User className="w-4 h-4 text-blue-600" />
      : <Users className="w-4 h-4 text-purple-600" />;
  };

  const progress = calculateProgress();
  const currentStep = getCurrentStep();

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customer progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Progress Tracking</h1>
            <p className="text-gray-600">Monitor individual customer onboarding journeys</p>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to Overview
          </button>
        </div>

        {/* Customer Selector */}
        <div className="flex gap-4 mb-6 overflow-x-auto">
          {customers.map(customer => (
            <button
              key={customer.id}
              onClick={() => setSelectedCustomer(customer)}
              className={`p-4 rounded-lg border-2 transition-colors min-w-64 ${
                selectedCustomer && selectedCustomer.id === customer.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">{customer.name}</div>
              <div className="text-sm text-gray-600">{customer.email}</div>
              <div className="text-xs text-gray-500 mt-1">Started: {customer.signup_date}</div>
            </button>
          ))}
        </div>

        {/* Progress Overview */}
        {selectedCustomer && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{selectedCustomer.name} - Onboarding Progress</h2>
              <span className="text-2xl font-bold text-blue-600">{progress}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            {currentStep && (
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold">Next Step: {currentStep.title}</h3>
                </div>
                <p className="text-gray-600 mb-3">{currentStep.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>Estimated: {currentStep.estimatedDays} day{currentStep.estimatedDays > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getOwnerIcon(currentStep.owner)}
                      <span className={currentStep.owner === 'customer' ? 'text-blue-600' : 'text-purple-600'}>
                        {currentStep.owner === 'customer' ? 'Customer Action Required' : 'Product Team Action Required'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {currentStep.status === 'pending' && (
                      <button
                        onClick={() => updateStepStatus(currentStep, 'in_progress')}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        Start Step
                      </button>
                    )}
                    {currentStep.status === 'in_progress' && (
                      <button
                        onClick={() => updateStepStatus(currentStep, 'completed')}
                        className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                      >
                        <CheckSquare className="w-3 h-3" />
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detailed Timeline */}
      {selectedCustomer && customerSteps.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-6">Onboarding Timeline</h3>
          <div className="space-y-4">
            {customerSteps.map((step, index) => (
              <div 
                key={step.id} 
                className={`flex gap-4 p-4 rounded-lg border-2 transition-colors ${
                  step.status === 'completed' ? 'border-green-200 bg-green-50' :
                  step.status === 'in_progress' ? 'border-blue-200 bg-blue-50' :
                  'border-gray-200 bg-white'
                }`}
              >
                <div className="flex flex-col items-center">
                  {getStatusIcon(step.status)}
                  {index < customerSteps.length - 1 && (
                    <div className={`w-0.5 h-8 mt-2 ${
                      step.status === 'completed' ? 'bg-green-300' : 'bg-gray-300'
                    }`}></div>
                  )}
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
                      <span>Est. {step.estimatedDays} day{step.estimatedDays > 1 ? 's' : ''}</span>
                      {step.completedDate && (
                        <span className="text-green-600 font-medium">Completed: {step.completedDate}</span>
                      )}
                      {step.startedDate && step.status === 'in_progress' && (
                        <span className="text-blue-600 font-medium">Started: {step.startedDate}</span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {step.status === 'pending' && (
                        <button
                          onClick={() => updateStepStatus(step, 'in_progress')}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          Start
                        </button>
                      )}
                      {step.status === 'in_progress' && (
                        <button
                          onClick={() => updateStepStatus(step, 'completed')}
                          className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                        >
                          <CheckSquare className="w-3 h-3" />
                          Complete
                        </button>
                      )}
                      {step.status === 'completed' && step.startedDate && step.completedDate && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">
                          ✓ Done
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {customers.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Customers Yet</h3>
          <p className="text-gray-600">Add customers to start tracking their onboarding progress.</p>
        </div>
      )}
    </div>
  );
};

export default CustomerProgressTracker;
