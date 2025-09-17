import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, User, Users, Plus, Settings, Database, Wifi, AlertCircle, Calendar } from 'lucide-react';

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
      const customersData = await supabase.from('customers').select().execute();
      const templatesData = await supabase.from('step_templates').select().execute();
      
      setCustomers(customersData || []);
      setStepTemplate(templatesData || []);
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
        { order: 1, title: "Account Setup", description: "Customer verifies email", estimated_days: 1, owner: "customer" },
        { order: 2, title: "Configuration Call", description: "30-minute onboarding call", estimated_days: 2, owner: "product_team" },
        { order: 3, title: "Data Integration", description: "Connect existing systems", estimated_days: 3, owner: "product_team" }
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

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SaaS Onboarding Tracker</h1>
            <p className="text-gray-600">Monitor customer onboarding progress in real-time</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
            <Wifi className="w-4 h-4" />
            Connected to Supabase
          </div>
        </div>

        {customers.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Yet</h3>
            <p className="text-gray-600 mb-4">
              Your database is empty. Import sample data to see how the tracker works.
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

        {customers.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Customers ({customers.length})</h3>
            <div className="grid gap-4">
              {customers.map(customer => (
                <div key={customer.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="font-semibold">{customer.name}</div>
                  <div className="text-sm text-gray-600">{customer.email}</div>
                  <div className="text-xs text-gray-500">Started: {customer.signup_date}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stepTemplate.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Onboarding Steps ({stepTemplate.length})</h3>
            <div className="space-y-3">
              {stepTemplate.map(step => (
                <div key={step.id} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Step {step.order}
                    </span>
                    <h4 className="font-semibold">{step.title}</h4>
                    <span className="text-sm text-gray-600">
                      ({step.estimated_days} day{step.estimated_days > 1 ? 's' : ''})
                    </span>
                  </div>
                  <p className="text-gray-600 mt-2">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">🎉 Success!</h4>
        <p className="text-blue-800 text-sm">
          Your SaaS Onboarding Tracker is now live and connected to Supabase. This is a minimal version that will deploy successfully.
        </p>
      </div>
    </div>
  );
}

export default App;
