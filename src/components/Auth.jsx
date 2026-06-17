import React, { useState } from 'react';
import axios from 'axios';

export default function Auth({ onLoginSuccess }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState(''); // เพิ่มช่องชื่อ
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
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
        // --- โหมด Login ---
        const res = await axios.post('http://localhost:5000/api/login', { email, password });
        localStorage.setItem('cinematch_token', res.data.token); // เก็บ Token
        onLoginSuccess(res.data.user);
      } else {
        // --- โหมด Register ---
        await axios.post('http://localhost:5000/api/register', { name, email, password });
        setSuccessMsg('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
        setIsLoginMode(true); 
        setPassword(''); 
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
          <button onClick={() => {setIsLoginMode(true); setErrorMsg(''); setSuccessMsg('');}} className={`flex-1 py-2.5 rounded-lg text-sm font-extrabold transition-all ${isLoginMode ? 'bg-[#8C0902] text-white shadow-md' : 'text-[#B14A36] hover:bg-[#FECE79]/30'}`}>เข้าสู่ระบบ</button>
          <button onClick={() => {setIsLoginMode(false); setErrorMsg(''); setSuccessMsg('');}} className={`flex-1 py-2.5 rounded-lg text-sm font-extrabold transition-all ${!isLoginMode ? 'bg-[#8C0902] text-white shadow-md' : 'text-[#B14A36] hover:bg-[#FECE79]/30'}`}>สมัครสมาชิก</button>
        </div>

        {errorMsg && <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm font-bold rounded-xl text-center">{errorMsg}</div>}
        {successMsg && <div className="mb-4 p-3 bg-green-100 text-green-700 text-sm font-bold rounded-xl text-center">{successMsg}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginMode && (
            <div>
              <label className="block text-xs font-extrabold text-[#B14A36] uppercase mb-1.5">ชื่อ-นามสกุล</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="John Doe" className="w-full bg-[#FFFDF9] border-2 border-[#FECE79] focus:border-[#E6A341] rounded-xl px-4 py-3.5 text-[#210100] font-medium outline-none transition-all shadow-sm" />
            </div>
          )}
          <div>
            <label className="block text-xs font-extrabold text-[#B14A36] uppercase mb-1.5">ที่อยู่อีเมล</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="example@email.com" className="w-full bg-[#FFFDF9] border-2 border-[#FECE79] focus:border-[#E6A341] rounded-xl px-4 py-3.5 text-[#210100] font-medium outline-none transition-all shadow-sm" />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-[#B14A36] uppercase mb-1.5">รหัสผ่าน</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="w-full bg-[#FFFDF9] border-2 border-[#FECE79] focus:border-[#E6A341] rounded-xl px-4 py-3.5 text-[#210100] font-medium outline-none transition-all shadow-sm" />
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