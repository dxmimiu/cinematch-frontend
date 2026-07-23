import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); 
  const BASE_URL = 'https://cinematch-backend-hdvz.onrender.com';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const res = await axios.post(`${BASE_URL}/api/login`, { email, password });
        localStorage.setItem('cinematch_token', res.data.token);
        toast.success('เข้าสู่ระบบสำเร็จ!');
        onLoginSuccess(res.data.user, 'login');
      } else {
        const res = await axios.post(`${BASE_URL}/api/register`, { name, email, password });
        localStorage.setItem('cinematch_token', res.data.token);
        toast.success('สมัครสมาชิกสำเร็จ!');
        onLoginSuccess(res.data.user, 'register');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-[0_10px_40px_rgba(33,1,0,0.08)] border-2 border-[#FECE79]/30">
        {/* ส่วน Header และปุ่มสลับ Login/Register */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-[#8C0902] mb-2 uppercase tracking-wider">CINEMATCH</h1>
          <p className="text-[#210100]/60 text-sm font-bold">{isLogin ? 'เข้าสู่ระบบเพื่อค้นหาความชอบของคุณ' : 'สร้างบัญชีเพื่อเริ่มต้นใช้งาน'}</p>
        </div>

        <div className="flex bg-[#FECE79]/20 p-1 rounded-full mb-8">
          <button onClick={() => setIsLogin(true)} className={`flex-1 py-3 rounded-full text-sm font-extrabold transition-all ${isLogin ? 'bg-[#8C0902] text-white shadow-md' : 'text-[#8C0902] hover:bg-white/50'}`}>เข้าสู่ระบบ</button>
          <button onClick={() => setIsLogin(false)} className={`flex-1 py-3 rounded-full text-sm font-extrabold transition-all ${!isLogin ? 'bg-[#8C0902] text-white shadow-md' : 'text-[#8C0902] hover:bg-white/50'}`}>สมัครสมาชิก</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-xs font-black text-[#B14A36] mb-1.5 ml-2">ชื่อผู้ใช้</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#FFFDF9] border-2 border-[#FECE79]/50 focus:border-[#8C0902] rounded-xl px-4 py-3.5 outline-none font-medium text-[#210100] transition-colors" placeholder="ชื่อของคุณ" required />
            </div>
          )}
          <div>
            <label className="block text-xs font-black text-[#B14A36] mb-1.5 ml-2">อีเมล</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#FFFDF9] border-2 border-[#FECE79]/50 focus:border-[#8C0902] rounded-xl px-4 py-3.5 outline-none font-medium text-[#210100] transition-colors" placeholder="example@email.com" required />
          </div>
          <div>
            <label className="block text-xs font-black text-[#B14A36] mb-1.5 ml-2">รหัสผ่าน</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} // สลับ type ตาม state
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full bg-[#FFFDF9] border-2 border-[#FECE79]/50 focus:border-[#8C0902] rounded-xl px-4 py-3.5 pr-12 outline-none font-medium text-[#210100] transition-colors" 
                placeholder="••••••••" 
                required 
              />
              {/* ปุ่ม Icon ตาเปิด/ปิด */}
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B14A36] hover:text-[#8C0902] transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                )}
              </button>
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-[#8C0902] hover:bg-[#210100] text-white font-black py-4 rounded-xl transition-all shadow-lg hover:shadow-xl mt-4 disabled:opacity-50">
            {isLoading ? 'กำลังประมวลผล...' : (isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก')}
          </button>
        </form>
      </div>
    </div>
  );
}