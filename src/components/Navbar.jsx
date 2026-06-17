import React from 'react';

export default function Navbar({ currentStep, setStep, onLogout, username }) {
  return (
    <nav className="bg-white border-b border-[#FECE79]/40 sticky top-0 z-40 shadow-xs px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* โลโก้แอป กดแล้วกลับหน้าหลัก */}
        <div onClick={() => setStep(5)} className="text-2xl font-black text-[#8C0902] tracking-wider cursor-pointer">
          CINEMATCH
        </div>

        {/* แถบเมนูตรงกลาง */}
        <div className="hidden md:flex items-center gap-8 font-extrabold text-sm">
          <button onClick={() => setStep(5)} className={`transition-colors ${currentStep === 5 ? 'text-[#8C0902] underline underline-offset-8 decoration-2' : 'text-[#210100]/60 hover:text-[#8C0902]'}`}>
            หน้าหลัก
          </button>
          <button onClick={() => setStep(4)} className={`transition-colors ${currentStep === 4 ? 'text-[#8C0902] underline underline-offset-8 decoration-2' : 'text-[#210100]/60 hover:text-[#8C0902]'}`}>
            ภาพยนตร์
          </button>
          <button onClick={() => setStep(1)} className={`transition-colors ${currentStep === 1 || currentStep === 2 || currentStep === 3 ? 'text-[#8C0902] underline underline-offset-8 decoration-2' : 'text-[#210100]/60 hover:text-[#8C0902]'}`}>
            ห้องจับคู่ (Duo)
          </button>
          <button onClick={() => setStep(6)} className={`transition-colors ${currentStep === 6 ? 'text-[#8C0902] underline underline-offset-8 decoration-2' : 'text-[#210100]/60 hover:text-[#8C0902]'}`}>
            คอลเลกชัน
          </button>
        </div>

        {/* ข้อมูลโปรไฟล์และปุ่ม Logout */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#FECE79]/20 px-4 py-2 rounded-full border border-[#FECE79]/40">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-[#210100] max-w-30 truncate" title={username}>
              {username}
            </span>
          </div>
          <button onClick={onLogout} className="text-xs font-black text-[#8C0902] hover:text-[#210100] transition-colors border-b-2 border-transparent hover:border-current">
            ออกจากระบบ
          </button>
        </div>

      </div>
    </nav>
  );
}