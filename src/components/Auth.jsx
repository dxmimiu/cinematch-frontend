import React, { useState } from 'react';
import axios from 'axios';

export default function Auth({ onLoginSuccess }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState(''); 
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  
  // ✅ เพิ่ม State สำหรับจัดการเปิด-ปิดรหัสผ่าน
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (isLoginMode) {
        // --- 1. โหมดเข้าสู่ระบบ (Login) ---
        const res = await axios.post('http://172.20.10.2:5000/api/login', { email, password });
        localStorage.setItem('cinematch_token', res.data.token); 
        
        onLoginSuccess(res.data.user, 'login');
      } else {
        // --- 2. โหมดสมัครสมาชิก (Register) ---
        const res = await axios.post('http://172.20.10.2:5000/api/register', { name, email, password });
        localStorage.setItem('cinematch_token', res.data.token); 
        
        onLoginSuccess(res.data.user, 'register'); 
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-[0_10px_40px_rgba(33,1,0,0.05)] border border-[#FECE79]/40">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-[#8C0902] tracking-wider mb-2">CINEMATCH</h1>
          <p className="text-[#B14A36] font-medium text-sm">เข้าสู่ระบบเพื่อบันทึกความชอบของคุณ</p>
        </div>

        <div className="flex bg-[#FFFDF9] border border-[#FECE79] rounded-xl p-1 shadow-inner mb-6">
          <button 
            type="button"
            onClick={() => { setIsLoginMode(true); setErrorMsg(''); setSuccessMsg(''); }} 
            className={`flex-1 py-2.5 rounded-lg text-sm font-extrabold transition-all ${isLoginMode ? 'bg-[#8C0902] text-white shadow-md' : 'text-[#B14A36] hover:bg-[#FECE79]/30'}`}
          >
            เข้าสู่ระบบ
          </button>
          <button 
            type="button"
            onClick={() => { setIsLoginMode(false); setErrorMsg(''); setSuccessMsg(''); }} 
            className={`flex-1 py-2.5 rounded-lg text-sm font-extrabold transition-all ${!isLoginMode ? 'bg-[#8C0902] text-white shadow-md' : 'text-[#B14A36] hover:bg-[#FECE79]/30'}`}
          >
            สมัครสมาชิก
          </button>
        </div>

        {errorMsg && <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm font-bold rounded-xl text-center">{errorMsg}</div>}
        {successMsg && <div className="mb-4 p-3 bg-green-100 text-green-700 text-sm font-bold rounded-xl text-center">{successMsg}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginMode && (
            <div>
              <label className="block text-xs font-extrabold text-[#B14A36] uppercase mb-1.5">ชื่อ</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="John Doe" className="w-full bg-[#FFFDF9] border-2 border-[#FECE79] focus:border-[#E6A341] rounded-xl px-4 py-3.5 text-[#210100] font-medium outline-none transition-all shadow-sm" />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-extrabold text-[#B14A36] uppercase mb-1.5">ที่อยู่อีเมล</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="example@email.com" className="w-full bg-[#FFFDF9] border-2 border-[#FECE79] focus:border-[#E6A341] rounded-xl px-4 py-3.5 text-[#210100] font-medium outline-none transition-all shadow-sm" />
          </div>
          
          <div>
            <label className="block text-xs font-extrabold text-[#B14A36] uppercase mb-1.5">รหัสผ่าน</label>
            {/* ✅ สร้าง wrapper เป็น relative เพื่อวางปุ่มตาทับลงไป */}
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} // เปลี่ยน type ตาม state
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                placeholder="••••••••" 
                className="w-full bg-[#FFFDF9] border-2 border-[#FECE79] focus:border-[#E6A341] rounded-xl px-4 py-3.5 pr-12 text-[#210100] font-medium outline-none transition-all shadow-sm" // เพิ่ม pr-12 เพื่อไม่ให้ตัวหนังสือชนกับรูปตา
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#B14A36] hover:text-[#8C0902] transition-colors focus:outline-none"
              >
                {/* สลับไอคอนเปิด-ปิดตา */}
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-[#8C0902] hover:bg-[#210100] text-white font-extrabold py-4 rounded-xl transition-all shadow-md mt-4 flex justify-center items-center gap-2">
            {isLoading && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
            {isLoginMode ? 'เข้าสู่ระบบ' : 'สร้างบัญชีใหม่'}
          </button>
        </form>
      </div>
    </div>
  );
}