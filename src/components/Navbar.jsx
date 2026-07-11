import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// คอมโพเนนต์แถบเมนูด้านบน (รองรับ Responsive มือถือและ Desktop)
// รับค่า prop 4 ตัว:
// currentStep: ตัวเลขสถานะหน้าจอที่เปิดอยู่ตอนนี้ (เพื่อใช้ทำไฮไลต์ขีดเส้นใต้เมนู)
// setStep: ฟังก์ชันสำหรับเปลี่ยนหน้าจอ
// onLogout: ฟังก์ชันสำหรับกดออกจากระบบ
// username: ชื่อผู้ใช้งานที่ดึงมาจากฐานข้อมูลเพื่อนำมาแสดงผล
export default function Navbar({ currentStep, setStep, onLogout, username }) {
  // ✅ เพิ่ม State สำหรับเปิด/ปิดเมนูในมือถือ
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-[#FECE79]/40 sticky top-0 z-40 shadow-xs px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
        
        <div className="flex items-center justify-between w-full md:w-auto">
          {/* โลโก้แอปพลิเคชัน: เมื่อคลิกจะสั่งให้ setStep(5) เพื่อกลับไปหน้า Home ทันที */}
          <div onClick={() => setStep(5)} className="text-2xl font-black text-[#8C0902] tracking-wider cursor-pointer">
            CINEMATCH
          </div>

          {/* ✅ ปุ่มแฮมเบอร์เกอร์ (แสดงเฉพาะบนมือถือ) */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="md:hidden text-[#8C0902] p-2 focus:outline-none"
            aria-label="Toggle Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* ✅ แถบเมนูตรงกลาง (ปรับ Responsive: กาง/หุบตาม isMenuOpen) */}
        <div className={`${isMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 font-extrabold text-sm w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0 border-[#FECE79]/20`}>
          
          {/* เมนูหน้าหลัก */}
          <button 
            onClick={() => { setStep(5); setIsMenuOpen(false); }} 
            className={`transition-colors w-full text-left md:w-auto py-1 ${currentStep === 5 ? 'text-[#8C0902] md:underline underline-offset-8 decoration-2' : 'text-[#210100]/60 hover:text-[#8C0902]'}`}
          >
            หน้าหลัก
          </button>
          
          {/* เมนู AI Search */}
          <button 
            onClick={() => { setStep(4); setIsMenuOpen(false); }} 
            className={`transition-colors w-full text-left md:w-auto py-1 ${currentStep === 4 ? 'text-[#8C0902] md:underline underline-offset-8 decoration-2' : 'text-[#210100]/60 hover:text-[#8C0902]'}`}
          >
            AI Search
          </button>
          
          {/* เมนูโหมดห้องจับคู่ */}
          <button 
            onClick={() => { setStep(1); setIsMenuOpen(false); }} 
            className={`transition-colors w-full text-left md:w-auto py-1 ${currentStep === 1 || currentStep === 2 || currentStep === 3 ? 'text-[#8C0902] md:underline underline-offset-8 decoration-2' : 'text-[#210100]/60 hover:text-[#8C0902]'}`}
          >
            ห้องจับคู่
          </button>
          
          {/* เมนูคอลเลกชันส่วนตัว */}
          <button 
            onClick={() => { setStep(6); setIsMenuOpen(false); }} 
            className={`transition-colors w-full text-left md:w-auto py-1 ${currentStep === 6 ? 'text-[#8C0902] md:underline underline-offset-8 decoration-2' : 'text-[#210100]/60 hover:text-[#8C0902]'}`}
          >
            คอลเลกชัน
          </button>

          {/* เพิ่มปุ่มแว่นขยายค้นหา (วางไว้ข้างๆ โปรไฟล์ หรือเมนูอื่นๆ) */}
          <button 
            onClick={() => setStep(7)} 
            className="p-2 text-gray-600 hover:text-[#B14A36] hover:bg-[#FECE79]/20 rounded-full transition-all duration-200"
            title="ค้นหาภาพยนตร์และซีรีส์"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </button>
        </div>

        {/* พื้นที่ฝั่งขวาสุด สำหรับแสดงโปรไฟล์และปุ่มออกจากระบบ (ซ่อนชั่วคราวในมือถือขนาดเล็กจัดๆ หรือจัดเรียงให้พอดี) */}
        <div className={`flex items-center justify-between md:justify-start w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-[#FECE79]/20 md:border-0 ${isMenuOpen ? 'flex' : 'hidden md:flex'}`}>
          
          {/* ป้ายแสดงชื่อผู้ใช้ พร้อมจุดสีเขียวติดกระพริบ */}
          <div className="flex items-center gap-2 bg-[#FECE79]/20 px-3 py-1.5 rounded-full border border-[#FECE79]/40 mr-2 md:mr-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0"></div>
            <span className="text-xs font-bold text-[#210100] max-w-24 md:max-w-30 truncate" title={username}>
              {username}
            </span>
          </div>
          
          {/* ปุ่มออกจากระบบ */}
          <button onClick={onLogout} className="text-xs font-black text-[#8C0902] hover:text-[#210100] transition-colors border-b-2 border-transparent hover:border-current shrink-0">
            ออกจากระบบ
          </button>

        </div>

      </div>
    </nav>
  );
}