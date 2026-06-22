import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function RoomSetup({ onNext }) {
  const [mode, setMode] = useState('create'); // 'create' = สร้างห้อง, 'join' = เข้าร่วมห้อง
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // พยายามดึงชื่อจากข้อมูลผู้ใช้ที่ล็อกอินอยู่มาเป็นค่าเริ่มต้น
  useEffect(() => {
    try {
      const token = localStorage.getItem('cinematch_token');
      if (token) {
        // ถอดรหัส token เพื่อเอาชื่อมาโชว์ (ถ้าทำได้) หรือให้กรอกเอง
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const userData = JSON.parse(jsonPayload);
        if (userData.name) setName(userData.name);
      }
    } catch (e) {
      // ปล่อยผ่านให้กรอกชื่อเอง
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("กรุณากรอกชื่อของคุณ");

    setIsLoading(true);
    const token = localStorage.getItem('cinematch_token');
    
    // ดึงคะแนนนิสัยของตัวเองจากเครื่อง
    const storedPrefs = JSON.parse(localStorage.getItem('cinematch_preferences') || '{}');
    const genreWeights = storedPrefs.genreWeights || {};

    try {
      if (mode === 'create') {
        // ยิง API สร้างห้อง (เป็น Host)
        const res = await axios.post('http://172.20.10.2:5000/api/rooms/create', 
          { hostName: name, genreWeights },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('สร้างห้องสำเร็จ!');
        onNext(name, 'host', res.data.pin); // ส่งชื่อ, บทบาท, และรหัส PIN ไปหน้า RoomSync
      } else {
        // ยิง API เข้าร่วมห้อง (เป็น Guest)
        if (!pin.trim() || pin.length !== 6) return toast.error("กรุณากรอกรหัส PIN 6 หลักให้ถูกต้อง");
        
        await axios.post('http://172.20.10.2:5000/api/rooms/join', 
          { pin, guestName: name, genreWeights },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('เข้าร่วมห้องสำเร็จ!');
        onNext(name, 'guest', pin);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border-2 border-[#FECE79]/40 relative overflow-hidden">
        
        <button onClick={() => window.location.reload()} className="absolute top-6 left-6 text-[#B14A36] hover:text-[#8C0902]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>

        <div className="text-center mb-8 mt-2">
          <span className="bg-[#FECE79]/30 text-[#8C0902] text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase">
            Duo Match
          </span>
          <h1 className="text-2xl font-black text-[#210100] mt-4 mb-2">จับคู่หาหนังที่ใช่</h1>
          <p className="text-[#B14A36] text-sm font-medium">สร้างห้อง หรือใส่รหัสเพื่อเชื่อมต่อกับเพื่อน</p>
        </div>

        <div className="flex bg-[#FFFDF9] border-2 border-[#FECE79]/50 rounded-xl p-1 shadow-inner mb-6">
          <button type="button" onClick={() => setMode('create')} className={`flex-1 py-3 rounded-lg text-sm font-black transition-all ${mode === 'create' ? 'bg-[#8C0902] text-white shadow-md' : 'text-[#B14A36] hover:bg-[#FECE79]/30'}`}>สร้างห้องใหม่</button>
          <button type="button" onClick={() => setMode('join')} className={`flex-1 py-3 rounded-lg text-sm font-black transition-all ${mode === 'join' ? 'bg-[#8C0902] text-white shadow-md' : 'text-[#B14A36] hover:bg-[#FECE79]/30'}`}>เข้าร่วมห้อง</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-[#B14A36] uppercase mb-1.5 ml-1">ชื่อที่ใช้แสดง</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="กรอกชื่อของคุณ" className="w-full bg-[#FFFDF9] border-2 border-[#FECE79] focus:border-[#E6A341] rounded-xl px-4 py-3.5 text-[#210100] font-bold outline-none transition-all shadow-sm text-center" required />
          </div>

          {mode === 'join' && (
            <div className="animate-fade-in">
              <label className="block text-xs font-black text-[#B14A36] uppercase mb-1.5 ml-1">รหัสห้อง (PIN)</label>
              <input type="text" value={pin} onChange={(e) => setPin(e.target.value)} maxLength="6" placeholder="รหัส 6 หลักจากเพื่อน" className="w-full bg-[#FFFDF9] border-2 border-[#FECE79] focus:border-[#E6A341] rounded-xl px-4 py-3.5 text-[#8C0902] font-black text-2xl tracking-widest outline-none transition-all shadow-sm text-center uppercase" required />
            </div>
          )}

          <button type="submit" disabled={isLoading} className="w-full bg-[#8C0902] hover:bg-[#210100] text-white font-black py-4 rounded-xl transition-all shadow-md mt-6 flex justify-center items-center gap-2">
            {isLoading && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
            {mode === 'create' ? 'ยืนยันการสร้างห้อง' : 'กดเพื่อเข้าร่วม'}
          </button>
        </form>

      </div>
    </div>
  );
}