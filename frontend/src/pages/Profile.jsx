import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGetMyProfile, apiUpdateMyProfile } from '../utils/api';
import { User, Phone, Mail, MapPin, Droplet, Camera, CheckCircle, AlertCircle, Save, QrCode, FileText } from 'lucide-react';

export default function Profile() {
  const { user, login } = useAuth(); // getting login function to update context if needed
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    village: '',
    district: '',
    state: '',
    blood_group: '',
    profile_picture: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await apiGetMyProfile();
      setProfile(data);
      setFormData({
        email: data.email || '',
        phone: data.phone || '',
        village: data.village || '',
        district: data.district || '',
        state: data.state || '',
        blood_group: data.blood_group || '',
        profile_picture: data.profile_picture || ''
      });
    } catch (err) {
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await apiUpdateMyProfile(formData);
      setSuccess('Profile updated successfully!');
      
      // Update local context manually to reflect picture everywhere (if needed)
      // login({ ...user, profile_picture: formData.profile_picture });
      fetchProfile(); // refresh data
    } catch (err) {
      setError('Failed to update profile. Please check your inputs.');
    } finally {
      setSaving(false);
    }
  };

  const handlePictureUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, profile_picture: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading profile...</div>;
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your personal information and contact details</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-primary to-indigo-600 h-32 relative">
          <div className="absolute -bottom-12 left-6">
            <div className="relative group">
              <div className="w-24 h-24 bg-white rounded-full p-1 shadow-md">
                <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                  {formData.profile_picture ? (
                    <img src={formData.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} className="text-gray-400" />
                  )}
                </div>
              </div>
              <button 
                onClick={handlePictureUploadClick}
                type="button" 
                className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg border border-gray-100 text-gray-600 hover:text-primary transition-colors group-hover:scale-105"
                title="Change Photo"
              >
                <Camera size={16} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>
        </div>

        <div className="pt-16 px-6 pb-6">
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
              {profile.age && profile.gender ? (
                <p className="text-sm text-gray-500 capitalize">{profile.age} years · {profile.gender}</p>
              ) : (
                <p className="text-sm text-gray-500 capitalize">{user?.role || profile.role || 'User'}</p>
              )}
              {profile.patient_uid && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                  <FileText size={14} />
                  ID: {profile.patient_uid}
                </div>
              )}
            </div>
            {profile.qr_code_url && (
              <div className="flex flex-col items-center bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                <img src={profile.qr_code_url} alt="Patient QR Code" className="w-24 h-24 object-contain rounded-lg border border-gray-50" />
                <span className="text-[10px] font-medium text-gray-400 mt-1 uppercase tracking-wider flex items-center gap-1">
                  <QrCode size={10} /> Scan Info
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 flex items-center gap-3 border border-red-100">
              <AlertCircle size={18} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 text-green-700 flex items-center gap-3 border border-green-100">
              <CheckCircle size={18} />
              <span className="text-sm font-medium">{success}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Contact Details</h3>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="email" 
                      name="email"
                      value={formData.email} 
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Number</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      name="phone"
                      value={formData.phone} 
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white"
                      placeholder="Enter mobile number"
                    />
                  </div>
                </div>
                
                {user?.role === 'patient' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Blood Group</label>
                    <div className="relative">
                      <Droplet size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" />
                      <select 
                        name="blood_group"
                        value={formData.blood_group} 
                        onChange={handleChange}
                        className="w-full border border-gray-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white"
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Address</h3>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Village / City</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      name="village"
                      value={formData.village} 
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white"
                      placeholder="Your village or city"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">District</label>
                  <input 
                    type="text" 
                    name="district"
                    value={formData.district} 
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white"
                    placeholder="Your district"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                  <input 
                    type="text" 
                    name="state"
                    value={formData.state} 
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 focus:bg-white"
                    placeholder="Your state"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button 
                type="submit" 
                disabled={saving}
                className="btn-primary"
              >
                {saving ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
