import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function RoomSync({ currentUser, onNext, onLeave, role, roomPin }) {
  const [hostName, setHostName] = useState(role === 'host' ? currentUser?.name : "Host");
  const [guestName, setGuestName] = useState(role === 'guest' ? currentUser?.name : null);
  const [roomStatus, setRoomStatus] = useState('waiting');

  useEffect(() => {
    const fetchRoomStatus = async () => {
      try {
        const token = localStorage.getItem('cinematch_token');
        // ยิงไปถาม Server ว่าห้องนี้สถานะเป็นไงบ้าง ใครเข้าหรือยัง
        const res = await axios.get(`http://localhost:5000/api/room-status/${roomPin}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const { status, host, guest } = res.data;
        setRoomStatus(status);
        if (host) setHostName(host);
        if (guest) setGuestName(guest);

        // ถ้าสถานะเป็น started ให้ไปหน้าถัดไป
        if (status === 'started') {
          onNext();
        }
      } catch (err) {
        // ถ้ารีเฟรชแล้วไม่เจอห้อง (โดนลบ)
        if (role === 'guest') {
          toast.error("โฮสต์ปิดห้องไปแล้วครับ");
          onLeave();
        }
      }
    };

    const interval = setInterval(fetchRoomStatus, 1000); // ดึงข้อมูลทุก 1 วินาที
    return () => clearInterval(interval);
  }, [roomPin, role, onNext, onLeave]);

  const handleStartMatch = async () => {
    const token = localStorage.getItem('cinematch_token');
    await axios.post('http://localhost:5000/api/start-room', { pin: roomPin }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    onNext();
  };

  const handleLeaveRoom = async () => {
    const token = localStorage.getItem('cinematch_token');
    await axios.delete(`http://localhost:5000/api/leave-room/${roomPin}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    onLeave();
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 px-6 flex flex-col items-center animate-fade-in pb-20">
      <div className="text-center mb-12">
        <p className="text-[#B14A36] font-extrabold text-sm mb-2">รหัสสำหรับเข้าห้อง (PIN)</p>
        <div className="bg-white border-4 border-[#FECE79] px-12 py-4 rounded-3xl shadow-[0_8px_30px_rgba(230,163,65,0.2)]">
          <h1 className="text-5xl md:text-6xl font-black text-[#8C0902] tracking-[0.2em]">{roomPin}</h1>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-2xl mb-12 relative">
        <div className="bg-white p-8 rounded-3xl border-2 border-[#E6A341] w-full text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-[#FECE79]/40 text-[#8C0902] text-3xl font-black rounded-full flex items-center justify-center mb-4 border border-[#E6A341]/50">
            {hostName?.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-xl font-black text-[#210100] mb-1">{hostName}</h2>
          <p className="text-xs text-[#B14A36] font-extrabold uppercase">โฮสต์ห้อง</p>
        </div>

        <div className="text-[#FECE79] font-black text-xl italic px-2 z-10 md:absolute">VS</div>

        <div className={`bg-white p-8 rounded-3xl border w-full text-center flex flex-col items-center transition-all ${guestName ? 'border-[#E6A341]' : 'border-[#FECE79]/40 border-dashed opacity-70'}`}>
          {guestName ? (
            <>
              <div className="w-20 h-20 bg-[#FECE79]/40 text-[#8C0902] text-3xl font-black rounded-full flex items-center justify-center mb-4 border border-[#E6A341]/50">{guestName.charAt(0).toUpperCase()}</div>
              <h2 className="text-xl font-black text-[#210100] mb-1">{guestName}</h2>
              <p className="text-xs text-[#B14A36] font-extrabold uppercase">ผู้เข้าร่วม</p>
            </>
          ) : (
            <div className="py-10 flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-[#FECE79] border-t-[#8C0902] rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-bold text-[#B14A36]">รอเพื่อนเข้าร่วม...</p>
            </div>
          )}
        </div>
      </div>

      <div className="w-full flex flex-col items-center gap-4 mt-4">
        {role === 'host' ? (
          <button onClick={handleStartMatch} disabled={!guestName} className={`font-extrabold py-4 px-16 rounded-2xl w-full max-w-sm ${guestName ? 'bg-[#8C0902] text-white hover:bg-[#210100]' : 'bg-gray-200 text-gray-400'}`}>
            เริ่มประมวลผลจับคู่ (Start Match)
          </button>
        ) : (
          <p className="text-[#8C0902] font-bold">รอโฮสต์กดเริ่มประมวลผล...</p>
        )}
        <button onClick={handleLeaveRoom} className="text-[#B14A36] font-bold text-sm underline mt-4">ออกจากห้อง</button>
      </div>
    </div>
  );
}