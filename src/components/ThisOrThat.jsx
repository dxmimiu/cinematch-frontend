import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const GENRE_MAP = {
  28: "แอคชั่น", 12: "ผจญภัย", 16: "แอนิเมชัน", 35: "ตลก", 80: "อาชญากรรม",
  99: "สารคดี", 18: "ดราม่า", 10751: "ครอบครัว", 14: "แฟนตาซี", 36: "ประวัติศาสตร์",
  27: "สยองขวัญ", 10402: "มิวสิคัล", 9648: "ลึกลับ", 10749: "โรแมนติก", 878: "ไซไฟ",
  10770: "ทีวีมูฟวี่", 53: "ระทึกขวัญ", 10752: "สงคราม", 37: "คาวบอย"
};

// 🟢 ฟังก์ชันคำนวณคะแนนตามความเร็ว
const calculatePoints = (timeTaken) => {
  if (timeTaken <= 3) return 5;       // ตัดสินใจใน 3 วิแรก = โคตรชอบ (5 แต้ม)
  if (timeTaken <= 7) return 4;       // ตัดสินใจใน 7 วิ = ชอบมาก (4 แต้ม)
  if (timeTaken <= 12) return 3;      // ตัดสินใจใน 12 วิ = ชอบปานกลาง (3 แต้ม)
  if (timeTaken < 15) return 2;       // ลังเลมาก (2 แต้ม)
  return 1;                           // หมดเวลา/ตัดสินใจเกิน 15 วิ (ได้ 1 แต้ม)
};

export default function ThisOrThat({ onComplete }) {
  const [moviePairs, setMoviePairs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(15);
  const [skipCount, setSkipCount] = useState(0); 

  useEffect(() => {
    const fetchRandomMovies = async () => {
      try {
        const API_KEY = "181edc5801db6678de6ccb2864149a6a";
        const randomPage = Math.floor(Math.random() * 5) + 1;
        
        const [res1, res2] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=th-TH&sort_by=popularity.desc&page=${randomPage}`),
          fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=th-TH&sort_by=popularity.desc&page=${randomPage + 1}`)
        ]);
        
        const data1 = await res1.json();
        const data2 = await res2.json();
        
        const allMovies = [...(data1.results || []), ...(data2.results || [])];
        const validMovies = allMovies.filter(m => m.poster_path && m.overview);
        
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

  // ตัวนับเวลาถอยหลัง (หยุดที่ 0)
  useEffect(() => {
    if (isLoading) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentIndex, isLoading]);

  // 🟢 แก้ไขลอจิกเมื่อเวลาหมด: แจ้งเตือนเพื่อให้เลือก แต่ไม่ข้ามอัตโนมัติแล้ว
  useEffect(() => {
    if (timeLeft === 0 && !isLoading && moviePairs.length > 0) {
      toast.error('หมดเวลาแล้ว! กรุณาเลือกหนังเรื่องที่ชอบเพื่อไปต่อ', {
        id: 'timeout-warning',
        duration: 4000
      });
    }
  }, [timeLeft, isLoading, moviePairs.length]);

  const handleSkip = () => {
    if (skipCount >= 3) {
      toast.error('คุณใช้สิทธิ์ข้ามครบ 3 ครั้งแล้ว กรุณาเลือกหนัง');
      return;
    }
    
    setSkipCount(prev => prev + 1);
    setTimeLeft(15);
    
    if (currentIndex + 1 < moviePairs.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      toast.success('วิเคราะห์รสนิยมเรียบร้อย!');
      onComplete();
    }
  };

  const handleSelect = async (selectedMovie) => {
    // คำนวณเวลาที่ใช้ไป
    const timeTaken = 15 - timeLeft; 
    const dynamicPoints = calculatePoints(timeTaken);
    
    console.log(`⏱️ ใช้เวลาเลือก: ${timeTaken} วินาที | 🎯 ได้คะแนนความชอบ: ${dynamicPoints} แต้ม`); 

    setTimeLeft(15); 
    const token = localStorage.getItem('cinematch_token');

    // 🟢 1. ระบุผู้ชนะและผู้แพ้จากการกด
    const winner = selectedMovie;
    const loser = selectedMovie.id === currentPair.left.id ? currentPair.right : currentPair.left;

    // 🟢 2. ดึงหมวดหมู่หลัก (Primary Genre) ของผู้ชนะและผู้แพ้
    const winnerGenre = winner.genre_ids && winner.genre_ids.length > 0 ? GENRE_MAP[winner.genre_ids[0]] : null;
    const loserGenre = loser.genre_ids && loser.genre_ids.length > 0 ? GENRE_MAP[loser.genre_ids[0]] : null;

    // 🟢 3. ยิง API ส่งผลโหวตไปเข้าสมการ Bradley-Terry Model ที่ Backend
    if (winnerGenre && loserGenre) {
      axios.post('https://cinematch-backend-hdvz.onrender.com/api/this-that/vote', {
        winner_movie_id: winner.id,
        loser_movie_id: loser.id,
        winner_genre: winnerGenre,
        loser_genre: loserGenre
      }, { headers: { Authorization: `Bearer ${token}` } })
      .catch(err => console.error("Bradley-Terry Vote Error:", err));
    }

    // --- (โค้ดเก่าด้านล่างนี้เก็บไว้เหมือนเดิม เพื่อให้ซิงค์ลง LocalStorage และ History) ---
    if (selectedMovie.genre_ids) {
      let prefs = JSON.parse(localStorage.getItem('cinematch_preferences') || '{"genreWeights":{}}');
      if (!prefs.genreWeights) prefs.genreWeights = {};

      selectedMovie.genre_ids.forEach(id => {
        const genreName = GENRE_MAP[id];
        if (genreName) {
          prefs.genreWeights[genreName] = (prefs.genreWeights[genreName] || 0) + dynamicPoints; 
        }
      });
      
      localStorage.setItem('cinematch_preferences', JSON.stringify(prefs));

      axios.post('https://cinematch-backend-hdvz.onrender.com/api/preferences', 
        { genreWeights: prefs.genreWeights },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(err => console.error("Pref Sync Error:", err));
    }

    try {
      await axios.post('https://cinematch-backend-hdvz.onrender.com/api/likes', 
        { 
          movie_id: selectedMovie.id, 
          action: 'this_or_that_choice',
          media_type: 'movie',
          movie_title: selectedMovie.title,
          poster_path: selectedMovie.poster_path,
          genres: selectedMovie.genre_ids ? selectedMovie.genre_ids.join(',') : '',
          points: dynamicPoints
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("บันทึกข้อมูลวิเคราะห์ไม่ได้:", err);
    }
    
    if (currentIndex + 1 < moviePairs.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      toast.success('วิเคราะห์รสนิยมเรียบร้อย!');
      onComplete();
    }
  };

  const getKeywords = (genreIds) => {
    if (!genreIds) return [];
    return genreIds.map(id => GENRE_MAP[id]).filter(Boolean).slice(0, 3);
  };

  if (isLoading) return <div className="min-h-screen flex justify-center items-center"><div className="w-10 h-10 border-4 border-[#8C0902] border-t-transparent rounded-full animate-spin"></div></div>;

  const currentPair = moviePairs[currentIndex];

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-3 md:p-6 animate-fade-in overflow-hidden">
      <div className="text-center mb-3 md:mb-8">
        <span className="bg-[#FECE79]/30 text-[#8C0902] text-[10px] md:text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
          รอบสุ่มความชอบ
        </span>
        <h1 className="text-lg md:text-3xl font-black text-[#210100] mt-2 md:mt-3">ชอบเรื่องไหนมากกว่ากัน?</h1>
        {/* 🟢 แสดงข้อความเตือนสีแดงกระพริบเมื่อหมดเวลา */}
        <p className={`font-black text-sm md:text-xl mt-1 ${timeLeft === 0 ? 'text-red-600 animate-pulse' : 'text-[#8C0902]'}`}>
          {timeLeft > 0 ? `${timeLeft} วินาที` : 'หมดเวลา! (กรุณาเลือกหนัง)'}
        </p>
        <p className="text-[#B14A36] text-[10px] md:text-sm mt-0.5 md:mt-1">คู่ที่ {currentIndex + 1} จาก 7</p>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-8 max-w-5xl w-full">
        
        {/* การ์ดภาพยนตร์ฝั่งซ้าย */}
        <div onClick={() => handleSelect(currentPair.left)} className="bg-white border-2 border-[#FECE79]/30 hover:border-[#8C0902] rounded-2xl md:rounded-3xl p-2.5 md:p-4 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col w-full max-w-60 md:max-w-sm md:flex-1">
          <div className="w-full aspect-square rounded-xl md:rounded-2xl overflow-hidden mb-2 md:mb-4 bg-gray-100 relative shrink-0">
            <img src={`https://image.tmdb.org/t/p/w500${currentPair.left.poster_path}`} alt={currentPair.left.title} className="w-full h-full object-cover" />
            <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 bg-[#210100]/80 text-[#FECE79] text-[10px] md:text-xs font-black px-1.5 py-0.5 md:px-2 md:py-1 rounded backdrop-blur-sm shadow-md">
              ★ {currentPair.left.vote_average ? currentPair.left.vote_average.toFixed(1) : "N/A"}
            </div>
          </div>
          <div className="flex flex-col grow justify-between">
            <h2 className="font-black text-sm md:text-lg text-[#210100] group-hover:text-[#8C0902] line-clamp-1 md:line-clamp-2 text-center w-full mb-1.5 md:mb-3">{currentPair.left.title}</h2>
            <div className="flex flex-wrap justify-center gap-1">
              {getKeywords(currentPair.left.genre_ids).map((keyword, idx) => (
                <span key={idx} className="bg-[#FECE79]/20 text-[#8C0902] px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[9px] md:text-[10px] font-extrabold border border-[#FECE79]/50 shadow-sm whitespace-nowrap">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* VS */}
        <div className="self-center text-[11px] md:text-xl font-black text-[#8C0902] bg-[#FECE79]/20 w-7 h-7 md:w-12 md:h-12 rounded-full flex items-center justify-center border border-[#FECE79]/40 shrink-0 my-1 md:my-0 md:mx-2 z-10">
          VS
        </div>

        {/* การ์ดภาพยนตร์ฝั่งขวา */}
        <div onClick={() => handleSelect(currentPair.right)} className="bg-white border-2 border-[#FECE79]/30 hover:border-[#8C0902] rounded-2xl md:rounded-3xl p-2.5 md:p-4 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col w-full max-w-60 md:max-w-sm md:flex-1">
          <div className="w-full aspect-square rounded-xl md:rounded-2xl overflow-hidden mb-2 md:mb-4 bg-gray-100 relative shrink-0">
            <img src={`https://image.tmdb.org/t/p/w500${currentPair.right.poster_path}`} alt={currentPair.right.title} className="w-full h-full object-cover" />
            <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 bg-[#210100]/80 text-[#FECE79] text-[10px] md:text-xs font-black px-1.5 py-0.5 md:px-2 md:py-1 rounded backdrop-blur-sm shadow-md">
              ★ {currentPair.right.vote_average ? currentPair.right.vote_average.toFixed(1) : "N/A"}
            </div>
          </div>
          <div className="flex flex-col grow justify-between">
            <h2 className="font-black text-sm md:text-lg text-[#210100] group-hover:text-[#8C0902] line-clamp-1 md:line-clamp-2 text-center w-full mb-1.5 md:mb-3">{currentPair.right.title}</h2>
            <div className="flex flex-wrap justify-center gap-1">
              {getKeywords(currentPair.right.genre_ids).map((keyword, idx) => (
                <span key={idx} className="bg-[#FECE79]/20 text-[#8C0902] px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[9px] md:text-[10px] font-extrabold border border-[#FECE79]/50 shadow-sm whitespace-nowrap">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ปุ่ม Skip */}
      <div className="mt-4 md:mt-8">
        <button 
          onClick={handleSkip}
          disabled={skipCount >= 3}
          className={`px-5 py-2 md:px-6 md:py-2 rounded-full font-bold text-[11px] md:text-sm transition-all border ${
            skipCount >= 3 
              ? 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed'
              : 'bg-transparent border-[#210100]/30 text-[#210100]/60 hover:text-[#8C0902] hover:border-[#8C0902]'
          }`}
        >
          ข้ามคู่นี้ ({skipCount}/3)
        </button>
      </div>
    </div>
  );
}