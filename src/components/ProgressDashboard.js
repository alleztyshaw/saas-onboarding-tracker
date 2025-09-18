import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, User, Users, ArrowRight, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';

const ProgressDashboard = ({ 
  customers, 
  stepTemplate, 
  supabase, 
  onSelectCustomer 
}) => {
  const [allCustomerProgress, setAllCustomerProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    avgProgress: 0,
    stuckCustomers: 0,
    completedCustomers: 0
  });

  useEffect(() => {
    if (customers.length > 0 && stepTemplate.length > 0) {
      loadAllProgress();
    }
  }, [customers, stepTemplate]);

  const loadAllProgress = async () => {
    setLoading(true);
    try {
      // Get all customer steps
      const allSteps = await supabase.from('customer_steps').select().execute();
      
      const progressData = customers.map(customer => {
        const customerSteps = (allSteps || []).filter(step => step.customer_id === customer.id);
        
        // Map with template data
        const stepsWithTemplate = stepTemplate.map(template => {
          const customerStep = customerSteps.find(cs => cs.template_id === template.id);
          return {
            ...template,
            status: customerStep?.status || 'pending',
            startedDate: customerStep?.started_date,
            completedDate: customerStep?.completed_date
          };
        }).sort((a, b) => a.order - b.order);

        const completedSteps = stepsWithTemplate.filter(step => step.status === 'completed').length;
        const progress = Math.round((completedSteps / stepsWithTemplate.length) * 100);
        const currentStep = stepsWithTemplate.find(step => step.status === 'in_progress') || 
                          stepsWithTemplate.find(step => step.status === 'pending');

        return {
          customer,
          progress,
          completedSteps,
          totalSteps: stepsWithTemplate.length,
          currentStep,
          steps: stepsWithTemplate,
          isStuck: getIsStuck(stepsWithTemplate, customer.signup_date),
          daysActive: getDaysActive(customer.signup_date)
        };
      });

      setAllCustomerProgress(progressData);
      calculateStats(progressData);
    } catch (error) {
      console.error('Failed to load progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIsStuck = (steps, signupDate) => {
    const inProgressStep = steps.find(step => step.status === 'in_progress');
    if (!inProgressStep || !inProgressStep.startedDate) return false;
    
    const daysSinceStarted = getDaysBetween(inProgressStep.startedDate, new Date().toISOString().split('T')[0]);
    return daysSinceStarted > (inProgressStep.estimated_days * 2); // Consider stuck if taking 2x expected time
  };

  const getDaysActive = (signupDate) => {
    return getDaysBetween(signupDate, new Date().toISOString().split('T')[0]);
  };

  const getDaysBetween = (date1, date2) => {
    const diffTime = Math.abs(new Date(date2) - new Date(date1));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateStats = (progressData) => {
    const totalCustomers = progressData.length;
    const avgProgress = totalCustomers > 0 
      ? Math.round(progressData.reduce((sum, p) => sum + p.progress, 0) / totalCustomers)
      : 0;
    const stuckCustomers = progressData.filter(p => p.isStuck).length;
    const completedCustomers = progressData.filter(p => p.progress === 100).length;

    setStats({
      totalCustomers,
      avgProgress,
      stuckCustomers,
      completedCustomers
    });
  };

  const getStatusColor = (progress, isStuck) => {
    if (isStuck) return 'text-red-600 bg-red-50 border-red-200';
    if (progress === 100) return 'text-green-600 bg-green-50 border-green-200';
    if (progress > 50) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  const getProgressColor = (progress) => {
    if (progress === 100) return 'from-green-500 to-green-600';
    if (progress > 75) return 'from-blue-500 to-blue-600';
    if (progress > 50) return 'from-yellow-500 to-yellow-600';
    if (progress > 25) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customer progress data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header & Stats */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Customer Progress Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
              </div>
              <User className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Progress</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgProgress}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Need Attention</p>
                <p className="text-2xl font-bold text-gray-900">{stats.stuckCustomers}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedCustomers}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Customer Progress Cards */}
      <div className="grid gap-4">
        {allCustomerProgress.map(({ customer, progress, completedSteps, totalSteps, currentStep, isStuck, daysActive }) => (
          <div 
            key={customer.id}
            className={`bg-white rounded-lg shadow-sm p-6 border-l-4 transition-all hover:shadow-md cursor-pointer ${
              isStuck ? 'border-red-500' : 
              progress === 100 ? 'border-green-500' : 
              'border-blue-500'
            }`}
            onClick={() => onSelectCustomer && onSelectCustomer(customer)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
                  {isStuck && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Needs Attention
                    </span>
                  )}
                  {progress === 100 && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Completed
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-1">{customer.email}</p>
                <p className="text-xs text-gray-500">Started {daysActive} days ago • {customer.signup_date}</p>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 mb-1">{progress}%</div>
                <div className="text-sm text-gray-500">{completedSteps}/{totalSteps} steps</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className={`bg-gradient-to-r ${getProgressColor(progress)} h-2 rounded-full transition-all duration-500`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            {/* Current Step */}
            {currentStep && (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{currentStep.title}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {currentStep.estimated_days} day{currentStep.estimated_days > 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      {currentStep.owner === 'customer' ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                      {currentStep.owner === 'customer' ? 'Customer' : 'Product Team'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      currentStep.status === 'in_progress' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {currentStep.status === 'in_progress' ? 'In Progress' : 'Pending'}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            )}

            {progress === 100 && (
              <div className="flex items-center justify-center bg-green-50 rounded-lg p-3 text-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span className="font-medium text-sm">Onboarding Complete! 🎉</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {allCustomerProgress.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Customer Data</h3>
          <p className="text-gray-600">Import sample data or add customers to see their progress.</p>
        </div>
      )}
    </div>
  );
};

export default ProgressDashboard;
