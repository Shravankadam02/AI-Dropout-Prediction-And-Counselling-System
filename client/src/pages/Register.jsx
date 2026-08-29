import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaGraduationCap } from 'react-icons/fa';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function Register() {
  const [form, setForm] = useState({
    username: '', password: '', confirmPassword: '', role: 'student', studentId: '', mentorCode: '', counsellorCode: '', phone: '', location: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', {
        username: form.username,
        password: form.password,
        role: form.role,
        studentId: form.role === 'student' ? form.studentId : undefined,
        mentorCode: form.role === 'mentor' ? form.mentorCode : undefined,
        counsellorCode: form.role === 'counsellor' ? form.counsellorCode : undefined,
        phone: form.role === 'counsellor' ? form.phone : undefined,
        location: form.role === 'counsellor' ? form.location : undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center bg-white p-10 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-sm w-full">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <p className="text-xl font-bold text-slate-900 mb-2">Account Created!</p>
          <p className="text-sm text-slate-500">Redirecting you to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full font-sans bg-white">
      {/* Left Panel - Visuals */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-slate-900 p-12 relative overflow-hidden">
        {/* Abstract Background Gradients */}
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-600/30 blur-[100px]"></div>
          <div className="absolute bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[100px]"></div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center backdrop-blur-sm border border-indigo-500/20">
            <FaGraduationCap size={22} />
          </div>
          <span className="text-lg font-bold text-white tracking-wide">AI Dropout Prediction and Counselling System</span>
        </div>

        <div className="relative z-10 max-w-xl">
          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-[1.15] mb-6 tracking-tight">
            Join the future of student success.
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Create an account to access predictive insights, manage interventions, and track progress seamlessly.
          </p>
        </div>
        
        <div className="relative z-10 flex items-center gap-4 text-slate-500 text-sm font-medium">
          <p>&copy; {new Date().getFullYear()} AI Dropout Prediction and Counselling System</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white relative overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm border border-indigo-100">
              <FaGraduationCap size={26} />
            </div>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Create an Account</h2>
            <p className="text-slate-500 mt-2 font-medium">Join as a student or mentor</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">I am a</label>
              <div className="relative">
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl pl-4 pr-10 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition shadow-sm bg-slate-50/50 focus:bg-white appearance-none cursor-pointer"
                >
                  <option value="student">Student</option>
                  <option value="mentor">Mentor</option>
                  <option value="counsellor">Counsellor</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {form.role === 'student' ? 'Email or Username' : 'Email'}
              </label>
              <input
                type="text"
                autoComplete="email"
                value={form.username}
                onChange={update('username')}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition shadow-sm bg-slate-50/50 focus:bg-white"
                placeholder={form.role === 'student' ? 'student@example.com' : `${form.role}@example.com`}
                required
              />
            </div>

            {form.role === 'student' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Student ID</label>
                <input
                  type="text"
                  placeholder="e.g. IT-2024001"
                  value={form.studentId}
                  onChange={update('studentId')}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition shadow-sm bg-slate-50/50 focus:bg-white"
                  required
                />
                <p className="text-[11px] text-slate-500 font-medium mt-1.5 ml-1">Must match the ID your institute assigned you.</p>
              </div>
            )}

            {form.role === 'mentor' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Mentor Code</label>
                <input
                  type="text"
                  placeholder="e.g. M001"
                  value={form.mentorCode}
                  onChange={update('mentorCode')}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition shadow-sm bg-slate-50/50 focus:bg-white"
                  required
                />
                <p className="text-[11px] text-slate-500 font-medium mt-1.5 ml-1">Provided by your administrator.</p>
              </div>
            )}

            {form.role === 'counsellor' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Counsellor Code</label>
                  <input
                    type="text"
                    placeholder="e.g. C001"
                    value={form.counsellorCode}
                    onChange={update('counsellorCode')}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition shadow-sm bg-slate-50/50 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 mt-4">Contact Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +1 234 567 8900"
                    value={form.phone}
                    onChange={update('phone')}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition shadow-sm bg-slate-50/50 focus:bg-white"
                    required
                  />
                  <p className="text-[11px] text-slate-500 font-medium mt-1.5 ml-1">Students will see this number to contact you.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 mt-4">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Gangapur Road, CIDCO"
                    value={form.location}
                    onChange={update('location')}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition shadow-sm bg-slate-50/50 focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-500 font-medium mt-1.5 ml-1">Helps students find nearby counsellors.</p>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={update('password')}
                  className="w-full border border-slate-300 rounded-xl pl-4 pr-11 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition shadow-sm bg-slate-50/50 focus:bg-white"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={update('confirmPassword')}
                  className="w-full border border-slate-300 rounded-xl pl-4 pr-11 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition shadow-sm bg-slate-50/50 focus:bg-white"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white text-base font-semibold py-3.5 rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/20 disabled:opacity-50 transition-all duration-200 mt-2"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-600 font-medium mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline underline-offset-4 transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}