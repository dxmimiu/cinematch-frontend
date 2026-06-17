import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function ThisOrThat({ onComplete }) {
  const [moviePairs, setMoviePairs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    const fetchRandomMovies = async () => {
      try {
        const API_KEY = "181edc5801db6678de6ccb2864149a6a";
        const randomPage = Math.floor(Math.random() * 5) + 1;
        
        const res = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=th-TH&sort_by=popularity.desc&page=${randomPage}`);
        const data = await res.json();
        const validMovies = data.results.filter(m => m.poster_path && m.overview);
        
        // สุ่มให้ได้ 7 คู่
        const pairs = [];
        for (let i = 0; i < 7; i++) {
          if (validMovies.length >= 2) {
            const m1 = validMovies.splice(Math.floor(Math.random() * validMovies.length), 1)[0];
            const m2 = validMovies.splice(Math.floor(Math.random() * validMovies.length), 1)[0];
            pairs.push({ left: m1, right: m2 });
          }
        }
        setMoviePairs(pairs);
      } catch (err) {
        toast.error('ไม่สามารถดึงข้อมูลได้');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRandomMovies();
  }, []);

  // ระบบนับถอยหลัง 10 วินาที
  useEffect(() => {
    if (isLoading) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSelect(moviePairs[currentIndex].left); // หมดเวลา สุ่มเลือกฝั่งซ้าย
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentIndex, isLoading]);

  const handleSelect = async (selectedMovie) => {
    setTimeLeft(10); // Reset เวลาสำหรับคู่ถัดไป
    
    // อัปเดตคะแนนรสนิยมไปยัง Backend (ตัวอย่าง: ส่งข้อมูลแนวหนังที่เลือก)
    const token = localStorage.getItem('cinematch_token');
    try {
      await axios.post('http://localhost:5000/api/update-preference', 
        { key: 'vibe_score', score: 10 }, // ตัวอย่างส่งคะแนนความชอบ
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("บันทึกความชอบไม่ได้:", err);
    }
    
    if (currentIndex + 1 < moviePairs.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      toast.success('วิเคราะห์รสนิยมเรียบร้อย!');
      onComplete();
    }
  };

  if (isLoading) return <div className="min-h-screen flex justify-center items-center"><div className="w-10 h-10 border-4 border-[#8C0902] border-t-transparent rounded-full animate-spin"></div></div>;

  const currentPair = moviePairs[currentIndex];

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="text-center mb-8">
        <span className="bg-[#FECE79]/30 text-[#8C0902] text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
          รอบสุ่มความชอบ
        </span>
        <h1 className="text-3xl font-black text-[#210100] mt-3">เลือกเรื่องที่คุณสนใจมากกว่า?</h1>
        <p className="text-[#8C0902] font-black text-xl mt-2">เหลือเวลา {timeLeft} วินาที</p>
        <p className="text-[#B14A36] text-sm mt-1">คู่ที่ {currentIndex + 1} จากทั้งหมด 7 คู่</p>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-8 max-w-4xl w-full">
        {/* ซ้าย */}
        <div onClick={() => handleSelect(currentPair.left)} className="flex-1 bg-white border-2 border-[#FECE79]/30 hover:border-[#8C0902] rounded-3xl p-4 shadow-sm hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-2 group w-full">
          <div className="aspect-3/4 rounded-2xl overflow-hidden mb-4 bg-gray-100">
            <img src={`https://image.tmdb.org/t/p/w500${currentPair.left.poster_path}`} alt="" className="w-full h-full object-cover" />
          </div>
          <h2 className="font-black text-lg text-[#210100] group-hover:text-[#8C0902] line-clamp-1 text-center">{currentPair.left.title}</h2>
        </div>

        <div className="text-xl font-black text-[#8C0902] bg-[#FECE79]/20 w-12 h-12 rounded-full flex items-center justify-center border border-[#FECE79]/40 shrink-0">VS</div>

        {/* ขวา */}
        <div onClick={() => handleSelect(currentPair.right)} className="flex-1 bg-white border-2 border-[#FECE79]/30 hover:border-[#8C0902] rounded-3xl p-4 shadow-sm hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-2 group w-full">
          <div className="aspect-3/4 rounded-2xl overflow-hidden mb-4 bg-gray-100">
            <img src={`https://image.tmdb.org/t/p/w500${currentPair.right.poster_path}`} alt="" className="w-full h-full object-cover" />
          </div>
          <h2 className="font-black text-lg text-[#210100] group-hover:text-[#8C0902] line-clamp-1 text-center">{currentPair.right.title}</h2>
        </div>
      </div>
    </div>
  );
}