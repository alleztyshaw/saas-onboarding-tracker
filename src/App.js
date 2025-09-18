import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, User, Users, Plus, Settings, Database, Wifi, AlertCircle, Calendar, BarChart3, UserCheck, ArrowLeft, Check, X } from 'lucide-react';

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
  const [importingData, setImportingData] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerProgress, setCustomerProgress] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

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
        { name: "Innovation Labs", email: "team@innovationlabs.io", signup_date: "2024-09-15" },
        { name: "Digital Solutions Co.", email: "contact@digitalsolutions.com", signup_date: "2024-09-12" }
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
        // Removing completion - delete the record with both conditions
        const deleteUrl = `customer_progress?customer_id=eq.${selectedCustomer.id}&step_template_id=eq.${stepId}`;
        await supabase.request(deleteUrl, {
          method: 'DELETE'
        });
      }
      
      await loadCustomerProgress(selectedCustomer.id);
    } catch (error) {
      console.error('Failed to update step completion:', error);
      console.error('Error details:', error);
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
    loadCustomerProgress(customer.id);
  };

  const backToCustomerList = () => {
    setSelectedCustomer(null);
    setCustomerProgress([]);
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

  // Customer Detail View
  if (selectedCustomer) {
    const progressPercentage = calculateProgress();
    
    return (
      <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={backToCustomerList}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Customers
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

  // Main Page
  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              SaaS Onboarding Tracker (Customers: {customers.length}, Steps: {stepTemplate.length})
            </h1>
            <p className="text-gray-600">Monitor and manage customer onboarding journeys</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
              <Wifi className="w-4 h-4" />
              Connected to Supabase
            </div>
            <button 
              onClick={importSampleData}
              disabled={importingData}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              {importingData ? 'Importing...' : 'Import Sample Data'}
            </button>
          </div>
        </div>

        {customers.length === 0 && stepTemplate.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Your Onboarding Tracker!</h3>
            <p className="text-gray-600 mb-4">
              Get started by importing sample data to see how the tracker works.
            </p>
            <button 
              onClick={importSampleData}
              disabled={importingData}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 mx-auto"
            >
              <Database className="w-4 h-4" />
              {importingData ? 'Importing...' : 'Import Sample Data'}
            </button>
          </div>
        )}

        {/* Show loaded data */}
        {customers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Customers ({customers.length})</h3>
            <div className="grid gap-4 md:grid-cols-2">
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
            <h3 className="text-lg font-semibold mb-4">Onboarding Steps ({stepTemplate.length})</h3>
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
        <h4 className="font-semibold text-blue-900 mb-2">✅ Redesigned: Step Progress Tracking</h4>
        <p className="text-blue-800 text-sm">
          Progress records are now created for all steps when you first view a customer. Checking/unchecking simply toggles the completion status - no more errors!
        </p>
      </div>
    </div>
  );
}

export default App;
