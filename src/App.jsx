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
  const [step, setStep] = useState(-2); 
  const [currentUser, setCurrentUser] = useState(null);

  const [userPreferences, setUserPreferences] = useState(null);
  const [hostName, setHostName] = useState(""); 
  const [roomRole, setRoomRole] = useState(""); 
  const [roomPin, setRoomPin] = useState("");   

  const routeUserFlow = (user) => {
    // ปรับให้รองรับกรณีที่คอลัมน์ has_completed_quiz อาจจะเป็น undefined
    if (user.has_completed_quiz === 0 || user.has_completed_quiz === undefined) {
      setStep(0); 
    } else {
      setStep(0.5); 
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('cinematch_token');
    if (!token) {
      setStep(-1); 
      return;
    }

    axios.get('https://://cinematch-backend-hdvz.onrender.com/api/verify', {
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

  // ✅ แก้ไข: รับค่า authType ที่ส่งมาจากหน้า Auth.jsx เพื่อจัดเส้นทางให้แม่นยำขึ้น
  const handleLoginSuccess = (user, authType) => {
    setCurrentUser(user);
    
    if (authType === 'register') {
      // ถ้าเป็นการสมัครสมาชิกใหม่ บังคับให้ไปหน้า Preference Quiz (step 0) เสมอ
      setStep(0);
    } else {
      // ถ้าเป็นการล็อกอินปกติ ให้เช็กประวัติการทำควิซ
      routeUserFlow(user);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cinematch_token'); 
    setCurrentUser(null);
    setStep(-1); 
  };

  const handleQuizComplete = (answers) => {
    setUserPreferences(answers);
    const token = localStorage.getItem('cinematch_token');
    
    // พยายามบันทึกสถานะลงหลังบ้าน
    axios.post('https://://cinematch-backend-hdvz.onrender.com/api/users/complete-quiz', {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .finally(() => {
      // ✅ แก้ไข: ใช้ finally เพื่อให้ระบบพาวาร์ปไปหน้า This or That (0.5) ทันที
      // แม้ว่า Backend จะยังไม่มี API /complete-quiz ก็ตาม (กันพรีเซนต์หน้าขาว)
      setStep(0.5); 
    });
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
        
        {step === 3 && <Result onLeave={() => setStep(1)} />}
      
        {step === 4 && <MovieSearch currentUser={currentUser} />}
        {step === 5 && <Home setStep={setStep} currentUser={currentUser} />}
        {step === 6 && <Collection />}
      </div>

      <Toaster position="top-center" />
    </div>
  );
}