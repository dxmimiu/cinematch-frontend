import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import PreferenceQuiz from './components/PreferenceQuiz'; 
import ThisOrThat from './components/ThisOrThat';
import RoomSetup from './components/RoomSetup';
import RoomSync from './components/RoomSync';
import Result from './components/Result';
import MovieSearch from './components/MovieSearch';
import Home from './components/Home';
import Auth from './components/Auth'; 
import Collection from './components/Collection';

export default function App() {
  const [step, setStep] = useState(-2); // -2 คือสถานะกำลังโหลดตรวจสอบ Token
  const [currentUser, setCurrentUser] = useState(null);

  const [userPreferences, setUserPreferences] = useState(null);
  const [hostName, setHostName] = useState(""); 
  const [roomRole, setRoomRole] = useState(""); 
  const [roomPin, setRoomPin] = useState("");   

  // ฟังก์ชันช่วยจัดเส้นทางหลังจากตรวจสอบสิทธิ์ล็อกอินสำเร็จ
  const routeUserFlow = (user) => {
    if (user.has_completed_quiz === 0) {
      setStep(0); // [ข้อ 3] บัญชีใหม่พึ่ง Register/เข้าครั้งแรก -> บังคับทำควิซความชอบตั้งค่าเริ่มต้น
    } else {
      setStep(0.5); // [ข้อ 4] ผู้ใช้เก่าที่ทำควิซแล้ว -> บังคับข้ามไปเล่นหน้า This or That เสมอ
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('cinematch_token');
    if (!token) {
      setStep(-1); // ไม่มีบัญชี/ยังไม่ได้ล็อกอิน -> ไปหน้าล็อกอิน/สมัครสมาชิก
      return;
    }

    axios.get('http://localhost:5000/api/verify', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setCurrentUser(res.data.user);
      routeUserFlow(res.data.user);
    })
    .catch(err => {
      localStorage.removeItem('cinematch_token'); 
      setStep(-1); 
    });
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    routeUserFlow(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('cinematch_token'); 
    setCurrentUser(null);
    setStep(-1); 
  };

  // ฟังก์ชันเมื่อทำควิซแรกเข้าเสร็จสิ้น
  const handleQuizComplete = (answers) => {
    setUserPreferences(answers);
    const token = localStorage.getItem('cinematch_token');
    
    // ยิงบอกหลังบ้านว่าคนนี้ทำควิซแล้ว คราวหลังไม่ต้องโชว์หน้านี้อีก
    axios.post('http://localhost:5000/api/users/complete-quiz', {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(() => {
      setStep(0.5); // บังคับส่งต่อไปหน้า This or That ต่อทันทีก่อนเข้าหน้าหลัก
    })
    .catch(err => console.error(err));
  };

  if (step === -2) return <div className="min-h-screen bg-[#FFFDF9] flex justify-center items-center"><div className="w-10 h-10 border-4 border-[#8C0902] border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-[#FFFDF9] font-sans antialiased text-[#210100]">

      {step > 0 && step !== 0.5 && (
        <Navbar currentStep={step} setStep={setStep} onLogout={handleLogout} username={currentUser?.name} />
      )}
      
      {step === -1 && <Auth onLoginSuccess={handleLoginSuccess} />}
      
      {step === 0 && <PreferenceQuiz onComplete={handleQuizComplete} />}
      
      {step === 0.5 && <ThisOrThat onComplete={(selectedMovies) => setStep(5)} />}

      <div className={step > 0 && step !== 0.5 ? "pb-16" : ""}>
        {step === 1 && <RoomSetup onNext={(name, role, pin) => { setHostName(name); setRoomRole(role); setRoomPin(pin); setStep(2); }} />}

        {step === 2 && (
          <RoomSync 
            currentUser={currentUser}
            username={hostName} 
            role={roomRole} 
            roomPin={roomPin} 
            onNext={() => setStep(3)} 
            onLeave={() => setStep(1)} 
          />
        )}
      
        {step === 4 && <MovieSearch currentUser={currentUser} />}
        {step === 5 && <Home setStep={setStep} currentUser={currentUser} />}
        {step === 6 && <Collection />}
      </div>

      <Toaster position="top-center" />
    </div>
  );
}