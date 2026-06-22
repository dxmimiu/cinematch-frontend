import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function RoomSync({ username, role, roomPin, onNext, onLeave }) {
  const [roomStatus, setRoomStatus] = useState('waiting');
  const [guestName, setGuestName] = useState(null);
  const [hostName, setHostName] = useState(role === 'host' ? username : null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('cinematch_token');
    
    // ตั้งเวลาให้หน้าเว็บยิงไปถามเซิร์ฟเวอร์ทุกๆ 3 วินาที (Polling)
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`http://172.20.10.2:5000/api/rooms/status/${roomPin}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setRoomStatus(res.data.status);
        if (res.data.guestName) setGuestName(res.data.guestName);
        if (res.data.hostName) setHostName(res.data.hostName);

        // ถ้าระบบประมวลผลเสร็จแล้ว (จากฝั่งโฮสต์กด)
        if (res.data.status === 'completed' && res.data.results) {
          // เซฟผลลัพธ์ลง LocalStorage แล้วไปหน้า Result
          localStorage.setItem('cinematch_duo_results', JSON.stringify(res.data.results));
          clearInterval(interval);
          onNext(); 
        }

      } catch (err) {
        console.error("Sync Error:", err);
        // ถ้าห้องหายไปแล้ว
        if (err.response?.status === 404) {
          clearInterval(interval);
          toast.error("ห้องนี้ถูกปิดไปแล้ว");
          onLeave();
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [roomPin, onNext, onLeave]);

  // ฟังก์ชันนี้เฉพาะ Host เท่านั้นที่จะกดได้
  const handleStartMatch = async () => {
    setIsProcessing(true);
    const token = localStorage.getItem('cinematch_token');
    
    try {
      const res = await axios.post(`http://172.20.10.2:5000/api/rooms/match/${roomPin}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // นำผลลัพธ์ที่ได้จากการคำนวณเก็บไว้ แล้วไปหน้าต่อไป
      localStorage.setItem('cinematch_duo_results', JSON.stringify(res.data));
      onNext(); 
    } catch (err) {
      toast.error('ประมวลผลไม่สำเร็จ กรุณาลองใหม่');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-6 animate-fade-in relative overflow-hidden">
      
      {/* ปุ่มออก */}
      <button onClick={onLeave} className="absolute top-8 left-8 text-[#B14A36] hover:text-[#8C0902] font-bold flex items-center gap-2 z-20">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        ออกจากห้อง
      </button>

      {/* อนิเมชันเรดาร์ */}
      <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center mb-12">
        <div className="absolute inset-0 rounded-full border-2 border-[#FECE79]/30"></div>
        <div className="absolute inset-4 rounded-full border-2 border-[#FECE79]/20"></div>
        <div className="absolute inset-8 rounded-full border-2 border-[#FECE79]/10"></div>
        <div className="absolute inset-0 rounded-full bg-[#E6A341]/10 animate-ping opacity-75"></div>
        
        {/* ตรงกลางเรดาร์ */}
        <div className="z-10 bg-white border-4 border-[#8C0902] w-24 h-24 rounded-full shadow-[0_0_30px_rgba(140,9,2,0.3)] flex flex-col items-center justify-center">
          <span className="text-[10px] font-black text-[#B14A36] uppercase tracking-wider mb-1">PIN</span>
          <span className="text-xl font-black text-[#8C0902] tracking-widest">{roomPin}</span>
        </div>
      </div>

      <div className="text-center z-10 w-full max-w-md">
        <h2 className="text-2xl font-black text-[#210100] mb-2">
          {roomStatus === 'waiting' ? 'กำลังรอเพื่อนเข้าร่วม...' : 'เชื่อมต่อสำเร็จ!'}
        </h2>
        <p className="text-[#B14A36] font-medium text-sm mb-8">
          {roomStatus === 'waiting' ? 'ส่งรหัส PIN 6 หลักให้เพื่อนกรอกเพื่อเข้าร่วมห้อง' : 'ระบบกำลังผสานรสนิยมของคุณทั้งคู่'}
        </p>

        {/* กล่องแสดงชื่อคนในห้อง */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-md border-2 border-[#FECE79]/30 mb-8">
          <div className="flex flex-col items-center w-1/2">
            <div className="w-12 h-12 rounded-full bg-[#FECE79]/30 border-2 border-[#E6A341] flex items-center justify-center text-[#8C0902] font-black text-xl mb-2">
              {hostName ? hostName.charAt(0).toUpperCase() : '?'}
            </div>
            <span className="text-xs font-black text-[#210100] line-clamp-1 px-2">{hostName || 'Host'}</span>
            <span className="text-[9px] font-bold text-[#8C0902] mt-0.5 bg-[#FECE79]/40 px-2 py-0.5 rounded-full">HOST</span>
          </div>

          <div className="shrink-0 text-[#E6A341] animate-pulse">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
          </div>

          <div className="flex flex-col items-center w-1/2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black mb-2 transition-all duration-500 ${guestName ? 'bg-[#FECE79]/30 border-2 border-[#E6A341] text-[#8C0902]' : 'bg-gray-100 border-2 border-dashed border-gray-300 text-gray-400'}`}>
              {guestName ? guestName.charAt(0).toUpperCase() : '?'}
            </div>
            <span className="text-xs font-black text-[#210100] line-clamp-1 px-2">{guestName || 'รอการเชื่อมต่อ...'}</span>
            {guestName && <span className="text-[9px] font-bold text-[#210100]/60 mt-0.5 bg-gray-100 px-2 py-0.5 rounded-full">GUEST</span>}
          </div>
        </div>

        {/* ปุ่มควบคุม (จะแสดงตามสถานะห้องและผู้ใช้) */}
        {role === 'host' ? (
          <button 
            onClick={handleStartMatch} 
            disabled={roomStatus !== 'ready' || isProcessing}
            className={`w-full py-4 rounded-xl font-black text-white shadow-md flex justify-center items-center gap-2 transition-all ${roomStatus === 'ready' && !isProcessing ? 'bg-[#8C0902] hover:bg-[#210100] animate-pulse hover:animate-none' : 'bg-gray-300 cursor-not-allowed'}`}
          >
            {isProcessing && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
            {isProcessing ? 'กำลังวิเคราะห์...' : roomStatus === 'ready' ? 'เริ่มประมวลผลคู่ Duo Match!' : 'รอเพื่อนเข้าห้อง...'}
          </button>
        ) : (
          <div className="w-full bg-[#FFFDF9] border-2 border-[#FECE79] border-dashed rounded-xl py-4 text-[#B14A36] font-bold text-sm flex justify-center items-center gap-2">
            <span className="w-4 h-4 border-2 border-[#B14A36]/30 border-t-[#B14A36] rounded-full animate-spin"></span>
            รอ Host กดเริ่มประมวลผล...
          </div>
        )}
      </div>

    </div>
  );
}