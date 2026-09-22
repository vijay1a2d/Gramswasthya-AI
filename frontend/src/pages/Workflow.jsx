import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { BedDouble, Calendar, Package, Users, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

const BED_DATA = [
  { name: 'District Hosp Kurnool', total: 120, occupied: 87, icu_total: 20, icu_occupied: 14 },
  { name: 'PHC Adoni',             total: 30,  occupied: 18, icu_total: 4,  icu_occupied: 2 },
  { name: 'CHC Nandyal',           total: 50,  occupied: 41, icu_total: 8,  icu_occupied: 6 },
  { name: 'PHC Yemmiganur',        total: 25,  occupied: 10, icu_total: 2,  icu_occupied: 0 },
]

const SUPPLY_DATA = [
  { 
    item: 'ORS Packets', current: 840, demand: 520, status: 'adequate',
    seller: { name: 'Apollo Pharmacy Wholesale', rating: '4.8/5', price: '₹12/unit', delivery: '1-2 Days', phone: '+91 9876543210' } 
  },
  { 
    item: 'Antibiotics', current: 180, demand: 210, status: 'low',
    seller: { name: 'MedPlus B2B', rating: '4.9/5', price: '₹145/strip', delivery: 'Same Day', phone: '+91 9988776655' } 
  },
  { 
    item: 'Malaria RDT Kits', current: 95, demand: 180, status: 'critical',
    seller: { name: 'Kurnool Medical Distributors', rating: '4.5/5', price: '₹40/kit', delivery: 'Same Day', phone: '+91 8877665544' } 
  },
  { 
    item: 'MMR Vaccines', current: 220, demand: 150, status: 'adequate', 
    seller: { name: 'Bharat Biotech Suppliers', rating: '5.0/5', price: '₹300/vial', delivery: 'Cold Chain 2 Days', phone: '+91 7766554433' }
  },
  { 
    item: 'IV Fluids', current: 60, demand: 120, status: 'critical',
    seller: { name: 'Nandyal Pharma Hub', rating: '4.7/5', price: '₹35/bottle', delivery: 'Same Day', phone: '+91 6655443322' } 
  },
  { 
    item: 'Paracetamol', current: 1200, demand: 800, status: 'adequate',
    seller: { name: 'Generic Med India', rating: '4.6/5', price: '₹8/strip', delivery: '1-2 Days', phone: '+91 5544332211' } 
  },
]

const QUEUE_DATA = [
  { doctor: 'Dr. Priya Sharma', specialty: 'General Medicine', waiting: 12, avg_wait: 25, email: 'priya.s@gramswasthya.in', hospital: 'District Hosp Kurnool' },
  { doctor: 'Dr. Rajan Kumar',  specialty: 'Pediatrics',       waiting: 8,  avg_wait: 18, email: 'rajan.k@gramswasthya.in', hospital: 'PHC Adoni' },
  { doctor: 'Dr. Anitha Rao',   specialty: 'Gynecology',       waiting: 6,  avg_wait: 20, email: 'anitha.r@gramswasthya.in', hospital: 'CHC Nandyal' },
  { doctor: 'Dr. Venkat Reddy', specialty: 'Ophthalmology',    waiting: 4,  avg_wait: 15, email: 'venkat.r@gramswasthya.in', hospital: 'PHC Yemmiganur' },
]

const STATUS_STYLE = {
  adequate: 'text-green-600 bg-green-50',
  low:      'text-amber-600 bg-amber-50',
  critical: 'text-red-600 bg-red-50',
}

export default function WorkflowPage() {
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [selectedDoctor, setSelectedDoctor] = useState(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Hospital Workflow Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Bed management · Supply chain · Doctor queues · Resource forecasting</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Beds Available', value: '69', sub: 'of 225 total', icon: BedDouble, color: 'primary' },
          { label: 'Appointments Today', value: '127', sub: '43 teleconsults', icon: Calendar, color: 'blue' },
          { label: 'Supply Alerts', value: '2', sub: 'Critical items', icon: Package, color: 'red' },
          { label: 'Patients in Queue', value: '30', sub: 'Avg wait: 22 min', icon: Users, color: 'amber' },
        ].map(k => (
          <div key={k.label} className="card flex items-start gap-3">
            <div className={`p-2 rounded-lg ${k.color === 'primary' ? 'bg-primary-light text-primary' : k.color === 'blue' ? 'bg-blue-100 text-blue-600' : k.color === 'red' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
              <k.icon size={18} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{k.value}</p>
              <p className="text-xs font-medium text-gray-600">{k.label}</p>
              <p className="text-xs text-gray-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Bed status */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><BedDouble size={15}/>Bed Occupancy</h2>
          <div className="space-y-3">
            {BED_DATA.map(b => {
              const pct = Math.round((b.occupied / b.total) * 100)
              return (
                <div key={b.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">{b.name}</span>
                    <span className="text-xs text-gray-500">{b.occupied}/{b.total} · {pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">ICU: {b.icu_occupied}/{b.icu_total}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Doctor queues */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Users size={15}/>Doctor Queues</h2>
          <div className="space-y-3">
            {QUEUE_DATA.map(q => (
              <button 
                key={q.doctor} 
                onClick={() => setSelectedDoctor(q)}
                className="w-full text-left flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                  {q.doctor.split(' ')[1][0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{q.doctor}</p>
                  <p className="text-xs text-gray-400">{q.specialty}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{q.waiting}</p>
                  <p className="text-xs text-gray-400">{q.avg_wait} min</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Supply chain */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Package size={15}/>Supply Chain — 30-Day Forecast</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Item','Current Stock','30-day Demand','Status','Action'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium pb-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SUPPLY_DATA.map(s => (
                <tr key={s.item} className="border-b border-gray-50">
                  <td className="py-2.5 pr-4 font-medium text-gray-800">{s.item}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{s.current}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{s.demand}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[s.status]}`}>{s.status}</span>
                  </td>
                  <td className="py-2.5">
                    {s.status !== 'adequate' ? (
                      <button 
                        onClick={() => setSelectedSeller(s)}
                        className="text-xs text-primary border border-primary px-2 py-0.5 rounded hover:bg-primary-light transition-colors"
                      >
                        Reorder
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 flex items-center gap-1"><CheckCircle size={12}/>OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seller Details Modal */}
      {selectedSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <h3 className="font-bold text-gray-900 flex items-center gap-2">
                 <Package size={16} className="text-primary"/> 
                 Reorder {selectedSeller.item}
               </h3>
               <button onClick={() => setSelectedSeller(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            
            {/* Reorder Form Content */}
            <div className="p-5 space-y-5">
               {/* Seller info header */}
               <div>
                 <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Recommended Supplier</p>
                 <p className="text-xl font-bold text-gray-900">{selectedSeller.seller.name}</p>
                 <div className="flex items-center gap-3 mt-2">
                   <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                     ★ {selectedSeller.seller.rating}
                   </span>
                   <span className="text-xs text-gray-600 font-medium flex items-center gap-1">
                     <Clock size={12} className="text-gray-400"/> {selectedSeller.seller.delivery}
                   </span>
                 </div>
               </div>
               
               {/* Details grid & Quantity selector */}
               <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-4">
                 <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                   <div>
                     <p className="text-xs text-gray-500 mb-0.5">Unit Price</p>
                     <p className="font-semibold text-gray-900">{selectedSeller.seller.price}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-xs text-gray-500 mb-0.5">Shortfall Qty</p>
                     <p className="font-bold text-red-600">
                       {selectedSeller.demand > selectedSeller.current 
                         ? selectedSeller.demand - selectedSeller.current 
                         : 100} units
                     </p>
                   </div>
                 </div>

                 {/* Custom Quantity Input Component would ideally go here, simplified for now to a standard number input */}
                 <div className="flex items-center justify-between pt-1">
                   <label htmlFor="reorder-qty" className="text-sm font-semibold text-gray-700">Order Quantity:</label>
                   <input 
                     id="reorder-qty" 
                     type="number" 
                     className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-center font-medium focus:ring-primary focus:border-primary focus:outline-none"
                     defaultValue={selectedSeller.demand > selectedSeller.current ? selectedSeller.demand - selectedSeller.current : 100}
                     min="1"
                     onChange={(e) => {
                       // Parse value and calculate total, simplified logic here:
                       const qty = parseInt(e.target.value) || 0;
                       const priceMatch = selectedSeller.seller.price.match(/\d+/);
                       const unitPrice = priceMatch ? parseInt(priceMatch[0]) : 0;
                       const totalEl = document.getElementById('order-total');
                       if (totalEl) totalEl.innerText = `₹${(qty * unitPrice).toLocaleString()}`;
                     }}
                   />
                 </div>
                 
                 <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-800">Total Amount:</p>
                    <p id="order-total" className="text-lg font-bold text-primary">
                      ₹{((selectedSeller.demand > selectedSeller.current ? selectedSeller.demand - selectedSeller.current : 100) * parseInt(selectedSeller.seller.price.match(/\d+/)[0])).toLocaleString()}
                    </p>
                 </div>
                 
                 <div className="pt-2 border-t border-gray-100">
                   <p className="text-xs text-gray-500 mb-1">Contact Support</p>
                   <p className="font-medium text-gray-900 flex items-center gap-1 text-sm">
                     {selectedSeller.seller.phone}
                   </p>
                 </div>
               </div>
               
               {/* Actions */}
               <div className="pt-2 flex gap-3">
                 <button 
                   onClick={() => setSelectedSeller(null)}
                   className="flex-1 py-2.5 rounded-lg font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={() => {
                     const searchQuery = encodeURIComponent(selectedSeller.item);
                     const url = `https://www.1mg.com/search/all?name=${searchQuery}`;
                     
                     const btn = document.getElementById('pay-btn');
                     if(btn) {
                        btn.innerHTML = '<span class="flex items-center gap-2"><div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Redirecting...</span>';
                        btn.disabled = true;
                     }
                     
                     setTimeout(() => {
                         window.open(url, '_blank');
                         setSelectedSeller(null);
                     }, 1000)
                   }}
                   id="pay-btn"
                   className="flex-[2] bg-primary text-white py-2.5 rounded-lg font-medium shadow-sm hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                 >
                   <CheckCircle size={16} /> Order on Partner Store
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Details Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <h3 className="font-bold text-gray-900 flex items-center gap-2">
                 <Users size={16} className="text-primary"/> 
                 Doctor Profile
               </h3>
               <button onClick={() => setSelectedDoctor(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
               {/* Doctor header */}
               <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-full bg-primary-light flex items-center justify-center text-primary text-xl font-bold flex-shrink-0">
                   {selectedDoctor.doctor.split(' ')[1]?.[0] || 'D'}
                 </div>
                 <div>
                   <p className="text-lg font-bold text-gray-900">{selectedDoctor.doctor}</p>
                   <p className="text-sm text-gray-500">{selectedDoctor.specialty}</p>
                 </div>
               </div>
               
               {/* Details */}
               <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                 <div>
                   <p className="text-xs text-gray-500 mb-0.5">Email Address</p>
                   <p className="font-medium text-gray-900 text-sm">{selectedDoctor.email}</p>
                 </div>
                 <div>
                   <p className="text-xs text-gray-500 mb-0.5">Working Hospital</p>
                   <p className="font-medium text-gray-900 text-sm flex items-center gap-1">
                     <BedDouble size={14} className="text-primary"/> {selectedDoctor.hospital}
                   </p>
                 </div>
                 <div>
                   <p className="text-xs text-gray-500 mb-0.5">Current Queue</p>
                   <p className="font-medium text-gray-900 text-sm">
                     {selectedDoctor.waiting} patients ({selectedDoctor.avg_wait} min avg. wait)
                   </p>
                 </div>
               </div>
               
               {/* Actions */}
               <div className="pt-2">
                 <button 
                   onClick={() => setSelectedDoctor(null)}
                   className="w-full bg-primary text-white py-2.5 rounded-lg font-medium shadow-sm hover:bg-primary-dark transition-colors"
                 >
                   Close Profile
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
