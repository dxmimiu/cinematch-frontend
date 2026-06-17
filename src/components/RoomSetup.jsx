import React, { useState } from 'react';

export default function RoomSetup({ onNext }) {
  const [nameInput, setNameInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleCreateRoom = () => {
    const finalName = nameInput.trim() !== "" ? nameInput : "Host Player";
    // อัปเดต: สุ่มรหัส PIN 5 หลัก (10000 - 99999)
    const generatedPin = Math.floor(10000 + Math.random() * 90000).toString();
    
    localStorage.setItem('cinematch_room', JSON.stringify({
      pin: generatedPin,
      hostName: finalName,
      guestName: null,
      status: 'waiting'
    }));

    onNext(finalName, 'host', generatedPin);
  };

  const handleJoinRoom = () => {
    // อัปเดต: เช็กว่ากรอกครบ 5 หลักหรือยัง
    if (pinInput.length !== 5) {
      setErrorMsg("กรุณากรอกรหัส PIN ให้ครบ 5 หลักครับ");
      return;
    }
    
    const roomData = JSON.parse(localStorage.getItem('cinematch_room'));
    if (roomData && roomData.pin === pinInput) {
      const finalName = nameInput.trim() !== "" ? nameInput : "Guest Player";
      
      roomData.guestName = finalName;
      roomData.status = 'joined';
      localStorage.setItem('cinematch_room', JSON.stringify(roomData));
      
      onNext(finalName, 'guest', pinInput);
    } else {
      setErrorMsg("ไม่พบรหัสห้องนี้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-16 px-6 animate-fade-in">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#210100] mb-3 tracking-tight">ห้องจับคู่ภาพยนตร์ (Duo Mode)</h1>
      </div>

      <div className="max-w-md mx-auto bg-white p-6 rounded-2xl border border-[#FECE79]/40 mb-12 shadow-[0_4px_20px_rgba(33,1,0,0.03)]">
        <label className="block text-xs font-black text-[#B14A36] uppercase mb-2.5">ชื่อของคุณ</label>
        <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="w-full bg-[#FFFDF9] border border-[#FECE79] rounded-xl px-4 py-3.5 text-[#210100] outline-none focus:border-[#E6A341] transition-all font-medium" />
      </div>

      <div className="flex flex-col md:flex-row gap-8 max-w-3xl mx-auto">
        <div className="bg-white p-8 rounded-3xl border border-[#FECE79]/40 flex-1 text-center flex flex-col shadow-[0_4px_25px_rgba(33,1,0,0.04)]">
          <h2 className="text-xl font-extrabold text-[#210100] mb-1.5">สร้างห้องใหม่ (Host)</h2>
          <p className="text-sm text-[#B14A36] font-medium mb-10">ระบบจะสร้างรหัส PIN ให้คุณแชร์ให้เพื่อน</p>
          <button onClick={handleCreateRoom} className="mt-auto w-full bg-[#8C0902] text-white font-bold py-4 rounded-2xl hover:bg-[#210100] transition-all active:scale-[0.98] shadow-md shadow-[#8C0902]/20">สร้างห้อง (Create Room)</button>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-[#FECE79]/40 flex-1 text-center flex flex-col shadow-[0_4px_25px_rgba(33,1,0,0.04)]">
          <h2 className="text-xl font-extrabold text-[#210100] mb-1.5">เข้าร่วมห้อง (Guest)</h2>
          <p className="text-sm text-[#B14A36] font-medium mb-4">ใส่รหัส PIN 5 หลักจากเพื่อนของคุณ</p>
          
          {/* อัปเดต: เปลี่ยน maxLength เป็น 5 */}
          <input type="text" maxLength="5" value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))} placeholder="*****" className="w-full bg-[#FFFDF9] border border-[#FECE79] focus:border-[#E6A341] rounded-2xl px-4 py-3.5 mb-2 text-center tracking-[0.4em] font-black text-2xl outline-none transition-all shadow-inner" />
          
          <div className="h-5 mb-3 w-full text-[#8C0902] text-xs font-bold animate-pulse">{errorMsg}</div>
          <button onClick={handleJoinRoom} className="w-full bg-[#B14A36] hover:bg-[#8C0902] text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] shadow-md">เข้าร่วมห้อง (Join)</button>
        </div>
      </div>
    </div>
  );
}