import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, User, Users, Plus, Settings, Database, Wifi, AlertCircle, Calendar, BarChart3, UserCheck } from 'lucide-react';

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
      console.log('Templates data type:', typeof templatesData);
      console.log('Templates is array?', Array.isArray(templatesData));
      console.log('Templates length:', templatesData?.length);
      
      setCustomers(customersData || []);
      const sortedTemplates = (templatesData || []).sort((a, b) => a.order - b.order);
      console.log('Sorted templates:', sortedTemplates);
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
      console.log('Starting sample data import...');
      
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

      console.log('Inserting steps and customers...');
      await supabase.from('step_templates').insert(sampleSteps).execute();
      await supabase.from('customers').insert(sampleCustomers).execute();
      
      console.log('Getting fresh data for customer_steps creation...');
      const allCustomers = await supabase.from('customers').select().execute();
      const allSteps = await supabase.from('step_templates').select().execute();
      
      console.log('Found customers:', allCustomers?.length);
      console.log('Found steps:', allSteps?.length);
      
      if (allCustomers && allSteps && allCustomers.length > 0 && allSteps.length > 0) {
        console.log('Creating customer step instances...');
        const customerStepInstances = [];
        
        allCustomers.forEach((customer, customerIndex) => {
          console.log(`Processing customer ${customerIndex + 1}: ${customer.name} (ID: ${customer.id})`);
          
          allSteps.forEach((step, stepIndex) => {
            let status = 'pending';
            let completedDate = null;
            let startedDate = null;
            
            // Create realistic progress for demo
            if (customerIndex === 0) { // First customer - further along
              if (stepIndex <= 2) {
                status = 'completed';
                completedDate = '2024-09-12';
                startedDate = '2024-09-11';
              } else if (stepIndex === 3) {
                status = 'in_progress';
                startedDate = '2024-09-17';
              }
            } else if (customerIndex === 1) { // Second customer - middle progress
              if (stepIndex <= 1) {
                status = 'completed';
                completedDate = '2024-09-16';
                startedDate = '2024-09-15';
              } else if (stepIndex === 2) {
                status = 'in_progress';
                startedDate = '2024-09-17';
              }
            } else { // Third customer - just started
              if (stepIndex === 0) {
                status = 'completed';
                completedDate = '2024-09-13';
                startedDate = '2024-09-12';
              } else if (stepIndex === 1) {
                status = 'in_progress';
                startedDate = '2024-09-18';
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

        console.log(`Inserting ${customerStepInstances.length} customer step records...`);
        console.log('Sample records:', customerStepInstances.slice(0, 3));
        
        try {
          // First, check if we can read from the table
          console.log('Testing read access to customer_steps...');
          const testRead = await supabase.from('customer_steps').select().execute();
          console.log('Read test result:', testRead);
          console.log('Current customer_steps count:', testRead?.length || 0);
          
          // Try inserting just one record first
          console.log('Trying to insert one record...');
          const singleRecord = customerStepInstances[0];
          console.log('Single record to insert:', singleRecord);
          
          const singleResult = await supabase.from('customer_steps').insert([singleRecord]).execute();
          console.log('Single insert result:', singleResult);
          
          // If that works, try inserting all
          if (singleResult) {
            console.log('Single insert worked, trying batch insert...');
            const batchResult = await supabase.from('customer_steps').insert(customerStepInstances.slice(1)).execute();
            console.log('Batch insert result:', batchResult);
          }
          
          // Check final count
          const finalRead = await supabase.from('customer_steps').select().execute();
          console.log('Final customer_steps count:', finalRead?.length || 0);
          
        } catch (insertError) {
          console.error('Customer steps insert failed:', insertError);
          console.error('Insert error message:', insertError.message);
          throw new Error(`Customer steps insert failed: ${insertError.message}`);
        }
      }
      
      await loadData();
      alert('✅ Sample data with progress tracking imported successfully!');
    } catch (error) {
      console.error('Failed to import sample data:', error);
      console.error('Error details:', error.message);
      alert(`❌ Failed to import sample data: ${error.message}`);
    } finally {
      setImportingData(false);
    }
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
        <h4 className="font-semibold text-blue-900 mb-2">🎯 Debug Mode</h4>
        <p className="text-blue-800 text-sm">
          This simplified version should show you the debug counter and load your data. 
          Once this works, we can add back the progress tracking components!
        </p>
      </div>
    </div>
  );
}

export default App;
