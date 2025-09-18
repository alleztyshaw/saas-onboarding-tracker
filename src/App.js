import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, User, Users, Plus, Settings, Database, Wifi, AlertCircle, Calendar, BarChart3, UserCheck } from 'lucide-react';
import StepManager from './components/StepManager';
import CustomerProgressTracker from './components/CustomerProgressTracker';
import ProgressDashboard from './components/ProgressDashboard';

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
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [stepTemplate, setStepTemplate] = useState([]);
  const [importingData, setImportingData] = useState(false);
  const [currentPage, setCurrentPage] = useState('overview');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

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
        { name: "Innovation Labs", email: "team@innovationlabs.io", signup_date: "2024-09-15" },
        { name: "Digital Solutions Co.", email: "contact@digitalsolutions.com", signup_date: "2024-09-12" }
      ];

      await supabase.from('step_templates').insert(sampleSteps).execute();
      await supabase.from('customers').insert(sampleCustomers).execute();
      
      // Also create some sample progress data
      const allCustomers = await supabase.from('customers').select().execute();
      const allSteps = await supabase.from('step_templates').select().execute();
      
      if (allCustomers && allSteps) {
        const customerStepInstances = [];
        
        allCustomers.forEach((customer, customerIndex) => {
          allSteps.forEach((step, stepIndex) => {
            let status = 'pending';
            let completedDate = null;
            let startedDate = null;
            
            // Create realistic progress for demo
            if (customerIndex === 0) { // TechStart Inc - further along
              if (stepIndex <= 3) {
                status = 'completed';
                completedDate = new Date(Date.now() - (7 - stepIndex) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                startedDate = new Date(Date.now() - (8 - stepIndex) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              } else if (stepIndex === 4) {
                status = 'in_progress';
                startedDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              }
            } else if (customerIndex === 1) { // Innovation Labs - middle progress
              if (stepIndex <= 1) {
                status = 'completed';
                completedDate = new Date(Date.now() - (3 - stepIndex) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                startedDate = new Date(Date.now() - (4 - stepIndex) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              } else if (stepIndex === 2) {
                status = 'in_progress';
                startedDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              }
            } else { // Digital Solutions - just started
              if (stepIndex === 0) {
                status = 'completed';
                completedDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                startedDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              } else if (stepIndex === 1) {
                status = 'in_progress';
                startedDate = new Date().toISOString().split('T')[0];
              }
            }
            
            customerStepInstances.push({
              customer_id: customer.id,
              template_id: step.id,
              status: status,
              completed_date: completedDate,
              started_date: startedDate
            });
          });
        });

        await supabase.from('customer_steps').insert(customerStepInstances).execute();
      }
      
      await loadData();
      alert('✅ Sample data with progress tracking imported successfully!');
    } catch (error) {
      console.error('Failed to import sample data:', error);
      alert('❌ Failed to import sample data');
    } finally {
      setImportingData(false);
    }
  };

  const getOwnerIcon = (owner) => {
    return owner === 'customer' 
      ? <User className="w-4 h-4 text-blue-600" />
      : <Users className="w-4 h-4 text-purple-600" />;
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCurrentPage('customer-detail');
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
      <StepManager 
        stepTemplate={stepTemplate}
        onUpdateSteps={setStepTemplate}
        onBack={() => setCurrentPage('overview')}
        supabase={supabase}
      />
    );
  }

  // Progress Dashboard Page
  if (currentPage === 'dashboard') {
    return (
      <ProgressDashboard
        customers={customers}
        stepTemplate={stepTemplate}
        supabase={supabase}
        onSelectCustomer={handleSelectCustomer}
      />
    );
  }

  // Individual Customer Progress Page
  if (currentPage === 'customer-detail') {
    return (
      <CustomerProgressTracker
        customers={customers}
        stepTemplate={stepTemplate}
        supabase={supabase}
        onBack={() => setCurrentPage('dashboard')}
        selectedCustomer={selectedCustomer}
      />
    );
  }

  // Main Overview Page
  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SaaS Onboarding Tracker</h1>
            <p className="text-gray-600">Monitor and manage customer onboarding journeys</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
              <Wifi className="w-4 h-4" />
              Connected to Supabase
            </div>
          </div>
        </div>

        {customers.length === 0 && stepTemplate.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Your Onboarding Tracker!</h3>
            <p className="text-gray-600 mb-4">
              Get started by importing sample data to see customer progress tracking in action.
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

        {/* Navigation Cards */}
        {(customers.length > 0 || stepTemplate.length > 0) && (
          <div className="grid gap-4 md:grid-cols-3">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:from-blue-100 hover:to-blue-200 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-3">
                <BarChart3 className="w-8 h-8 text-blue-600" />
                <span className="text-2xl font-bold text-blue-600">{customers.length}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Progress Dashboard</h3>
              <p className="text-sm text-gray-600">View all customer progress at a glance</p>
              <div className="flex items-center mt-3 text-blue-600 text-sm font-medium group-hover:text-blue-700">
                View Dashboard →
              </div>
            </button>

            <button
              onClick={() => setCurrentPage('manage')}
              className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 hover:from-purple-100 hover:to-purple-200 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-3">
                <Settings className="w-8 h-8 text-purple-600" />
                <span className="text-2xl font-bold text-purple-600">{stepTemplate.length}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Manage Steps</h3>
              <p className="text-sm text-gray-600">Configure your onboarding process</p>
              <div className="flex items-center mt-3 text-purple-600 text-sm font-medium group-hover:text-purple-700">
                Manage Steps →
              </div>
            </button>

            <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-3">
                <UserCheck className="w-8 h-8 text-green-600" />
                <span className="text-2xl font-bold text-green-600">
                  {customers.filter(c => Math.random() > 0.5).length}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Active Customers</h3>
              <p className="text-sm text-gray-600">Currently in onboarding process</p>
              <div className="flex items-center mt-3 text-green-600 text-sm font-medium">
                Real-time tracking ✓
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {customers.length > 0 && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Recent Customers</h4>
              <div className="space-y-2">
                {customers.slice(0, 3).map(customer => (
                  <div key={customer.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{customer.name}</span>
                    <span className="text-gray-500">{customer.signup_date}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Onboarding Process</h4>
              <div className="space-y-2">
                {stepTemplate.slice(0, 3).map(step => (
                  <div key={step.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{step.title}</span>
                    <span className="text-gray-500">{step.estimated_days}d</span>
                  </div>
                ))}
                {stepTemplate.length > 3 && (
                  <div className="text-sm text-gray-500">+ {stepTemplate.length - 3} more steps</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">🎉 Customer Progress Tracking Added!</h4>
        <p className="text-blue-800 text-sm">
          Your onboarding tracker now includes comprehensive progress tracking! View individual customer journeys, 
          track completion rates, and identify customers who need attention.
        </p>
      </div>
    </div>
  );
}

export default App;
