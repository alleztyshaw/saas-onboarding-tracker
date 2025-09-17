// === package.json ===
{
  "name": "saas-onboarding-tracker",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "lucide-react": "^0.263.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}

// === public/index.html ===
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="SaaS Onboarding Progress Tracker" />
    <title>SaaS Onboarding Tracker</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>

// === src/index.js ===
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// === src/App.js ===
import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, User, Users, Plus, Edit3, Calendar, AlertCircle, GripVertical, Settings, ArrowLeft, Trash2, Database, Wifi, WifiOff } from 'lucide-react';

// Supabase configuration
const SUPABASE_URL = 'https://svcxdskpdrfflqkbvxmy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Y3hkc2twZHJmZmxxa2J2eG15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNDQzOTIsImV4cCI6MjA3MzcyMDM5Mn0.IY-U0PQZZJjtkwXqELfrlZnmz_J4AKAwIZHrIJuVFgY';

// Simple Supabase client
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
      })
    };
  }
};

const SaaSOnboardingTracker = () => {
  const [currentPage, setCurrentPage] = useState('tracker');
  const [isConnected, setIsConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [stepTemplate, setStepTemplate] = useState([]);
  const [customerSteps, setCustomerSteps] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [newStep, setNewStep] = useState({ title: '', estimatedDays: 1, owner: 'customer', description: '' });
  const [draggedStep, setDraggedStep] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [hoveredStep, setHoveredStep] = useState(null);
  const [importingData, setImportingData] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load customers
      const customersData = await supabase.from('customers').select().execute();
      setCustomers(customersData || []);
      
      // Load step templates
      const templatesData = await supabase.from('step_templates').select().execute();
      const sortedTemplates = (templatesData || []).sort((a, b) => a.order - b.order);
      setStepTemplate(sortedTemplates);
      
      // Set first customer as selected
      if (customersData && customersData.length > 0) {
        setSelectedCustomer(customersData[0]);
        loadCustomerSteps(customersData[0].id);
      }
      
    } catch (error) {
      console.error('Failed to load data:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerSteps = async (customerId) => {
    try {
      const steps = await supabase.from('customer_steps')
        .select('*,step_templates(id,title,description,estimated_days,owner,order)')
        .execute();
      
      // Filter and format steps for this customer
      const customerSpecificSteps = (steps || [])
        .filter(step => step.customer_id === customerId)
        .map(step => ({
          id: step.template_id,
          order: step.step_templates.order,
          title: step.step_templates.title,
          description: step.step_templates.description,
          estimatedDays: step.step_templates.estimated_days,
          owner: step.step_templates.owner,
          status: step.status,
          startedDate: step.started_date,
          completedDate: step.completed_date,
          customerStepId: step.id
        }))
        .sort((a, b) => a.order - b.order);
      
      setCustomerSteps(customerSpecificSteps);
    } catch (error) {
      console.error('Failed to load customer steps:', error);
    }
  };

  // Import sample data
  const importSampleData = async () => {
    if (!isConnected) return;
    
    setImportingData(true);
    try {
      console.log('Starting sample data import...');
      
      // Check if data already exists
      const existingSteps = await supabase.from('step_templates').select('id').execute();
      const existingCustomers = await supabase.from('customers').select('id').execute();
      
      console.log('Existing data check:', { steps: existingSteps?.length, customers: existingCustomers?.length });
      
      // Sample step templates
      const sampleSteps = [
        { order: 1, title: "Account Setup & Email Verification", description: "Customer verifies email and completes basic account information", estimated_days: 1, owner: "customer" },
        { order: 2, title: "Initial Configuration Call", description: "30-minute onboarding call with Customer Success team to understand requirements", estimated_days: 2, owner: "product_team" },
        { order: 3, title: "Data Integration Setup", description: "Connect customer's existing systems and import initial data", estimated_days: 3, owner: "product_team" },
        { order: 4, title: "Team Training Session", description: "Comprehensive training for up to 10 team members on platform features", estimated_days: 1, owner: "product_team" },
        { order: 5, title: "Custom Workflow Configuration", description: "Customer configures workflows specific to their business processes", estimated_days: 2, owner: "customer" },
        { order: 6, title: "UAT & Feedback", description: "Customer tests all features and provides feedback for final adjustments", estimated_days: 3, owner: "customer" },
        { order: 7, title: "Go-Live Support", description: "Final system checks and go-live support during first week of production use", estimated_days: 2, owner: "product_team" }
      ];

      // Sample customers
      const sampleCustomers = [
        { name: "TechStart Inc.", email: "admin@techstart.com", signup_date: "2024-09-10", estimated_completion: "2024-09-25" },
        { name: "Innovation Labs", email: "team@innovationlabs.io", signup_date: "2024-09-15", estimated_completion: "2024-10-01" }
      ];

      let insertedSteps = [];
      let insertedCustomers = [];

      // Insert step templates if they don't exist
      if (!existingSteps || existingSteps.length === 0) {
        console.log('Inserting step templates...');
        insertedSteps = await supabase.from('step_templates').insert(sampleSteps).execute();
        console.log('Step templates inserted:', insertedSteps);
      } else {
        console.log('Using existing step templates');
        insertedSteps = existingSteps;
      }

      // Insert customers if they don't exist
      if (!existingCustomers || existingCustomers.length === 0) {
        console.log('Inserting customers...');
        insertedCustomers = await supabase.from('customers').insert(sampleCustomers).execute();
        console.log('Customers inserted:', insertedCustomers);
      } else {
        console.log('Using existing customers');
        insertedCustomers = existingCustomers;
      }

      // Get all current data to create customer step instances
      const allSteps = await supabase.from('step_templates').select('*').execute();
      const allCustomers = await supabase.from('customers').select('*').execute();
      
      console.log('All data loaded:', { steps: allSteps?.length, customers: allCustomers?.length });

      if (allSteps && allCustomers && allSteps.length > 0 && allCustomers.length > 0) {
        // Check if customer_steps already exist
        const existingCustomerSteps = await supabase.from('customer_steps').select('id').execute();
        
        if (!existingCustomerSteps || existingCustomerSteps.length === 0) {
          console.log('Creating customer step instances...');
          
          // Create customer step instances for each customer
          const customerStepInstances = [];
          
          allCustomers.forEach((customer, customerIndex) => {
            allSteps.forEach((step, stepIndex) => {
              const status = customerIndex === 0 && stepIndex <= 1 ? 'completed' : 
                           customerIndex === 0 && stepIndex === 2 ? 'in_progress' : 'pending';
              
              customerStepInstances.push({
                customer_id: customer.id,
                template_id: step.id,
                status: status,
                completed_date: status === 'completed' ? '2024-09-12' : null,
                started_date: status === 'in_progress' ? '2024-09-13' : null
              });
            });
          });

          console.log('Inserting customer step instances:', customerStepInstances.length);
          
          // Insert customer step instances
          const insertedCustomerSteps = await supabase.from('customer_steps').insert(customerStepInstances).execute();
          console.log('Customer steps inserted:', insertedCustomerSteps);
        }
        
        // Reload all data
        console.log('Reloading data...');
        await loadData();
        
        console.log('Sample data import completed successfully!');
        alert('✅ Sample data imported successfully!');
      } else {
        throw new Error('Failed to create or retrieve steps and customers');
      }
    } catch (error) {
      console.error('Failed to import sample data:', error);
      alert(`❌ Failed to import sample data: ${error.message}`);
    } finally {
      setImportingData(false);
    }
  };

  // Component functions (getStatusIcon, getOwnerIcon, etc.)
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

  const calculateProgress = () => {
    if (!customerSteps.length) return 0;
    const completedSteps = customerSteps.filter(step => step.status === 'completed').length;
    return Math.round((completedSteps / customerSteps.length) * 100);
  };

  const getCurrentStep = () => {
    return customerSteps.find(step => step.status === 'in_progress') || 
           customerSteps.find(step => step.status === 'pending');
  };

  // Template management functions
  const addNewStep = async () => {
    if (!newStep.title || !isConnected) return;
    
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
        setStepTemplate([...stepTemplate, result[0]]);
      }
      
      setNewStep({ title: '', estimatedDays: 1, owner: 'customer', description: '' });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to add step:', error);
    }
  };

  const updateStep = async (stepId, updates) => {
    if (!isConnected) return;
    
    try {
      await supabase.from('step_templates').update(updates).eq('id', stepId).execute();
      
      const updatedTemplate = stepTemplate.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      );
      setStepTemplate(updatedTemplate);
      setEditingStep(null);
    } catch (error) {
      console.error('Failed to update step:', error);
    }
  };

  const deleteStep = async (stepId) => {
    if (!isConnected) return;
    
    try {
      await supabase.from('step_templates').delete().eq('id', stepId).execute();
      
      const updatedTemplate = stepTemplate.filter(step => step.id !== stepId);
      setStepTemplate(updatedTemplate);
    } catch (error) {
      console.error('Failed to delete step:', error);
    }
  };

  // Customer tracking functions
  const markStepComplete = async (step) => {
    if (!isConnected || !step.customerStepId) return;
    
    try {
      const updates = { 
        status: 'completed', 
        completed_date: new Date().toISOString().split('T')[0] 
      };
      
      await supabase.from('customer_steps').update(updates).eq('id', step.customerStepId).execute();
      
      const updatedSteps = customerSteps.map(s => 
        s.id === step.id ? { ...s, status: 'completed', completedDate: updates.completed_date } : s
      );
      setCustomerSteps(updatedSteps);
    } catch (error) {
      console.error('Failed to mark step complete:', error);
    }
  };

  const startStep = async (step) => {
    if (!isConnected || !step.customerStepId) return;
    
    try {
      const updates = { 
        status: 'in_progress', 
        started_date: new Date().toISOString().split('T')[0] 
      };
      
      await supabase.from('customer_steps').update(updates).eq('id', step.customerStepId).execute();
      
      const updatedSteps = customerSteps.map(s => 
        s.id === step.id ? { ...s, status: 'in_progress', startedDate: updates.started_date } : s
      );
      setCustomerSteps(updatedSteps);
    } catch (error) {
      console.error('Failed to start step:', error);
    }
  };

  // Handle customer selection
  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    if (isConnected) {
      loadCustomerSteps(customer.id);
    }
  };

  const progress = calculateProgress();
  const currentStep = getCurrentStep();

  // Connection status component
  const ConnectionStatus = () => (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
      isConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
    }`}>
      {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
      {isConnected ? 'Connected to Supabase' : 'Connection Error'}
    </div>
  );

  // Sample data import button
  const SampleDataButton = () => {
    const hasData = customers.length > 0 || stepTemplate.length > 0;
    
    if (hasData) return null;
    
    return (
      <div className="flex gap-2">
        <button 
          onClick={importSampleData}
          disabled={importingData}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Database className="w-4 h-4" />
          {importingData ? 'Importing...' : 'Import Sample Data'}
        </button>
        <button 
          onClick={() => window.open('https://svcxdskpdrfflqkbvxmy.supabase.co/project/default/editor', '_blank')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Open Supabase
        </button>
      </div>
    );
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

  if (currentPage === 'manage') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
        {/* Manage Steps Page Content */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentPage('tracker')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Tracker
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manage Onboarding Steps</h1>
                <p className="text-gray-600">Configure the master onboarding process template</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ConnectionStatus />
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Step
              </button>
            </div>
          </div>
        </div>
        {/* Rest of manage page... */}
      </div>
    );
  }

  // Main tracker page
  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SaaS Onboarding Tracker</h1>
            <p className="text-gray-600">Monitor customer onboarding progress in real-time</p>
          </div>
          <div className="flex items-center gap-4">
            <ConnectionStatus />
            <SampleDataButton />
            <button 
              onClick={() => setCurrentPage('manage')}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Manage Steps
            </button>
          </div>
        </div>

        {/* Empty State */}
        {customers.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Yet</h3>
            <p className="text-gray-600 mb-4">
              Your database is empty. Import sample data to see how the tracker works, or start adding your own customers and steps.
            </p>
            <div className="flex justify-center gap-4">
              <SampleDataButton />
              <button 
                onClick={() => setCurrentPage('manage')}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Steps Manually
              </button>
            </div>
          </div>
        )}

        {/* Customer Selector */}
        {customers.length > 0 && (
          <div className="flex gap-4 mb-6">
            {customers.map(customer => (
              <button
                key={customer.id}
                onClick={() => selectCustomer(customer)}
                className={`p-4 rounded-lg border-2 transition-colors ${
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
        )}

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
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customer Steps Timeline */}
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
                    <div className={
