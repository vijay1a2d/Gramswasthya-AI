import React, { useState, useEffect } from 'react';
import { Apple, Activity, AlertTriangle, FileText, Download, Target, CalendarDays, ChevronRight } from 'lucide-react';
import VoiceDietAssistant from '../components/VoiceDietAssistant';

export default function DietPlan() {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientContext, setPatientContext] = useState(null);
  const [dietPlan, setDietPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load patients on mount
  useEffect(() => {
    fetch('http://localhost:8000/api/patients/')
      .then(res => res.json())
      .then(data => setPatients(data.patients || []))
      .catch(err => console.error(err));
  }, []);

  // Detailed fetch when patient selected to show health summary
  useEffect(() => {
    if (!selectedPatientId) {
      setPatientContext(null);
      setDietPlan(null);
      return;
    }

    fetch(`http://localhost:8000/api/patients/${selectedPatientId}`)
      .then(res => res.json())
      .then(data => setPatientContext(data))
      .catch(err => console.error(err));
  }, [selectedPatientId]);

  const generatePlan = async () => {
    if (!selectedPatientId) return;
    setIsLoading(true);
    setError(null);
    setDietPlan(null);

    try {
      const res = await fetch('http://localhost:8000/api/diet-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: selectedPatientId, language: 'English' })
      });
      if (!res.ok) throw new Error("Failed to generate diet plan");
      const data = await res.json();
      setDietPlan(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 print-hide-siblings">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Apple className="text-primary" /> AI Voice Dietitian
          </h1>
          <p className="text-gray-500 text-sm mt-1">Personalized, voice-interactive nutritional planning.</p>
        </div>

        {/* Patient Selection Selector */}
        <div className="flex-shrink-0 w-full md:w-80">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Select Patient</label>
          <select 
            value={selectedPatientId} 
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-primary focus:border-primary block p-2.5 shadow-sm"
          >
            <option value="">-- Choose a patient --</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.age}y, {p.gender})</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedPatientId ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500 shadow-sm">
          <Apple size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Select a patient to begin</h3>
          <p className="text-sm">We'll analyze their health profile before generating a plan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Context & Controls */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Health Summary Card */}
            {patientContext && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                
                <div className="flex items-center gap-3 mb-5 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-primary-light/50 text-primary flex items-center justify-center font-bold text-lg">
                    {patientContext.name?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{patientContext.name}</h3>
                    <p className="text-xs text-gray-500">{patientContext.age} yrs • {patientContext.gender} • {patientContext.blood_group || 'O+'}</p>
                  </div>
                </div>

                <div className="space-y-4 relative z-10 text-sm">
                  {patientContext.allergies?.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-red-500 uppercase flex items-center gap-1 mb-1">
                        <AlertTriangle size={12} /> Allergies
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {patientContext.allergies.map((a, i) => (
                          <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs border border-red-100">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {patientContext.chronic_conditions?.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-orange-500 uppercase flex items-center gap-1 mb-1">
                        <Activity size={12} /> Conditions
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {patientContext.chronic_conditions.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs border border-orange-100">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {(!patientContext.allergies?.length && !patientContext.chronic_conditions?.length) && (
                     <p className="text-sm text-gray-500 italic">No significant allergies or chronic conditions reported.</p>
                  )}
                </div>

                <div className="mt-6 pt-5 border-t border-gray-100 relative z-10">
                  <button 
                    onClick={generatePlan}
                    disabled={isLoading}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <FileText size={18} />}
                    {isLoading ? 'Analyzing Context...' : dietPlan ? 'Regenerate Plan' : 'Generate Diet Plan'}
                  </button>
                </div>
              </div>
            )}

            {/* Voice Assistant Widget */}
            {dietPlan && (
              <div className="h-[450px]">
                <VoiceDietAssistant 
                  patientId={selectedPatientId} 
                  currentPlan={dietPlan} 
                  onPlanUpdate={(newPlan) => setDietPlan(newPlan)} 
                />
              </div>
            )}

          </div>

          {/* Right Column: Diet Plan Result */}
          <div className="lg:col-span-2">
            
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 mb-6 flex gap-3">
                <AlertTriangle size={20} className="shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {!dietPlan && !isLoading && !error && (
               <div className="bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 p-8">
                  <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
                     <Target size={32} className="text-gray-300" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-600 mb-2">Awaiting Generation</h3>
                  <p className="text-sm text-center max-w-sm">
                     Click "Generate Diet Plan" to use AI to build a personalized, culturally-appropriate meal plan based on the patient's records.
                  </p>
               </div>
            )}

            {isLoading && (
               <div className="bg-white rounded-2xl border border-gray-100 h-full min-h-[400px] flex flex-col items-center justify-center p-8 space-y-6">
                  <div className="relative w-24 h-24">
                     <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                     <div className="absolute inset-2 bg-primary/40 rounded-full animate-pulse"></div>
                     <div className="absolute inset-4 bg-primary rounded-full flex items-center justify-center shadow-lg">
                        <Apple className="text-white" size={24} />
                     </div>
                  </div>
                  <div className="text-center">
                     <h3 className="text-lg font-semibold text-gray-900 mb-2">Synthesizing Nutritional Plan</h3>
                     <p className="text-sm text-gray-500">Cross-referencing allergies, conditions, and vitals...</p>
                  </div>
               </div>
            )}

            {dietPlan && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print-area">
                
                {/* Plan Header */}
                <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 border-b border-gray-100 flex justify-between items-start">
                  <div>
                     <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Apple className="text-primary" /> Personalized Diet Plan
                     </h2>
                     <p className="text-sm text-gray-600 mt-1">For {patientContext?.name} • Generated {new Date().toLocaleDateString()}</p>
                  </div>
                  <button onClick={handlePrint} className="p-2 bg-white text-gray-600 hover:text-primary rounded-lg shadow-sm border border-gray-100 hover:border-primary/30 transition-colors">
                     <Download size={18} />
                  </button>
                </div>

                <div className="p-6 space-y-8">
                  
                  {/* Targets & Avoids */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* Nutritional Goals */}
                     <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100/50">
                        <h4 className="flex items-center gap-2 font-semibold text-blue-900 mb-4 text-sm uppercase tracking-wide">
                           <Target size={16} /> Daily Targets
                        </h4>
                        <div className="space-y-3 text-sm">
                           <div className="flex justify-between items-center pb-2 border-b border-blue-100/50">
                              <span className="text-gray-600">Calories</span>
                              <span className="font-semibold text-gray-900">{dietPlan.nutritional_goals?.calories || 'Standard'}</span>
                           </div>
                           <div className="flex justify-between items-center pb-2 border-b border-blue-100/50">
                              <span className="text-gray-600">Protein</span>
                              <span className="font-semibold text-gray-900">{dietPlan.nutritional_goals?.protein || 'Standard'}</span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-gray-600">Focus</span>
                              <span className="font-medium text-blue-700 text-right max-w-[150px] leading-tight">{dietPlan.nutritional_goals?.key_focus || 'Balanced'}</span>
                           </div>
                        </div>
                     </div>

                     {/* Foods to Avoid */}
                     <div className="bg-red-50/50 rounded-xl p-5 border border-red-100/50">
                        <h4 className="flex items-center gap-2 font-semibold text-red-900 mb-3 text-sm uppercase tracking-wide">
                           <AlertTriangle size={16} /> Strictly Avoid
                        </h4>
                        <ul className="space-y-2">
                           {dietPlan.foods_to_avoid?.map((food, i) => (
                              <li key={i} className="text-sm text-red-800 flex items-start gap-2">
                                 <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
                                 <span>{food}</span>
                              </li>
                           )) || <li className="text-sm text-gray-500">None specified</li>}
                        </ul>
                     </div>
                  </div>

                  {/* Daily Meal Plan */}
                  <div>
                     <h3 className="font-bold text-gray-900 mb-5 text-lg border-b pb-2">Daily Meal Routine</h3>
                     
                     <div className="relative border-l-2 border-gray-100 ml-3 md:ml-4 space-y-6 pb-2">
                        
                        {Object.entries(dietPlan.diet_plan || {}).map(([meal, desc], i) => {
                           // Icon/Color logic based on meal name
                           let colorClass = "bg-yellow-100 text-yellow-600 border-yellow-200";
                           let mealLabel = meal.replace('_', ' ').toUpperCase();
                           
                           if (meal === 'lunch') colorClass = "bg-orange-100 text-orange-600 border-orange-200";
                           if (meal === 'dinner') colorClass = "bg-indigo-100 text-indigo-600 border-indigo-200";
                           if (meal.includes('evening') || meal.includes('morning')) colorClass = "bg-teal-100 text-teal-600 border-teal-200";

                           return (
                              <div key={i} className="relative pl-6 md:pl-8">
                                 {/* Timeline Dot */}
                                 <span className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-white ${colorClass.split(' ')[0]}`}></span>
                                 
                                 <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                                    <h4 className={`text-xs font-bold tracking-wider mb-2 inline-block px-2 py-0.5 rounded uppercase border ${colorClass}`}>{mealLabel}</h4>
                                    <p className="text-gray-700 text-sm leading-relaxed">{desc}</p>
                                 </div>
                              </div>
                           )
                        })}
                     </div>
                  </div>

                  {/* Special Notes & Weekly */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
                     <div className="md:col-span-2">
                        <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-2 text-sm">
                           <FileText size={16} className="text-primary"/> Physician Notes
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 italic">
                           "{dietPlan.special_notes}"
                        </p>
                     </div>
                     <div className="md:col-span-1">
                        <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-3 text-sm">
                           <CalendarDays size={16} className="text-green-600"/> Weekly Mix
                        </h4>
                        <ul className="space-y-2">
                           {dietPlan.weekly_suggestions?.map((sug, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                 <ChevronRight size={14} className="mt-0.5 text-green-500 shrink-0" />
                                 <span className="leading-tight">{sug}</span>
                              </li>
                           ))}
                        </ul>
                     </div>
                  </div>

                </div>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
