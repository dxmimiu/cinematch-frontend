import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const GENRE_MAP = {
  28: "แอคชั่นบู้ล้างผลาญ", 12: "ผจญภัย", 16: "แอนิเมชัน", 35: "ตลกขบขัน", 80: "อาชญากรรม",
  99: "สารคดี", 18: "ดราม่าเข้มข้น", 10751: "ครอบครัว", 14: "แฟนตาซีเวทมนตร์", 36: "ประวัติศาสตร์",
  27: "สยองขวัญ", 10402: "มิวสิคัล", 9648: "ลึกลับซ่อนเงื่อน", 10749: "โรแมนติก", 878: "ไซไฟอวกาศ",
  10770: "ทีวีมูฟวี่", 53: "ระทึกขวัญตื่นเต้น", 10752: "สงคราม", 37: "คาวบอยตะวันตก"
};

export default function ThisOrThat({ onComplete }) {
  const [moviePairs, setMoviePairs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    const fetchRandomMovies = async () => {
      try {
        const API_KEY = "181edc5801db6678de6ccb2864149a6a";
        const randomPage = Math.floor(Math.random() * 5) + 1;
        
        // 🟢 แก้ไข: ดึงข้อมูลทีเดียว 2 หน้า เพื่อกวาดหนังมาเผื่อกรอง (รวม 40 เรื่อง)
        const [res1, res2] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=th-TH&sort_by=popularity.desc&page=${randomPage}`),
          fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=th-TH&sort_by=popularity.desc&page=${randomPage + 1}`)
        ]);
        
        const data1 = await res1.json();
        const data2 = await res2.json();
        
        // รวมข้อมูลจากทั้ง 2 หน้าเข้าด้วยกัน
        const allMovies = [...(data1.results || []), ...(data2.results || [])];
        
        // กรองเอาเฉพาะเรื่องที่มีรูปปกและเรื่องย่อภาษาไทย
        const validMovies = allMovies.filter(m => m.poster_path && m.overview);
        
        const pairs = [];
        // วนลูปจับคู่ให้ครบ 7 คู่
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

  useEffect(() => {
    if (isLoading) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSelect(moviePairs[currentIndex].left); 
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentIndex, isLoading]);

  const handleSelect = async (selectedMovie) => {
    setTimeLeft(15); 
    
    const token = localStorage.getItem('cinematch_token');

    // 🟢 1. อัปเดตค่าน้ำหนักความชอบ (Genre Weights) ลง LocalStorage และส่งขึ้น Cloud (ตาราง user_preferences)
    if (selectedMovie.genre_ids) {
      let prefs = JSON.parse(localStorage.getItem('cinematch_preferences') || '{"genreWeights":{}}');
      if (!prefs.genreWeights) prefs.genreWeights = {};

      selectedMovie.genre_ids.forEach(id => {
        const genreName = GENRE_MAP[id];
        if (genreName) {
          // ให้ 3 คะแนนสำหรับหนังที่ชนะในเกม This or That
          prefs.genreWeights[genreName] = (prefs.genreWeights[genreName] || 0) + 3; 
        }
      });
      
      localStorage.setItem('cinematch_preferences', JSON.stringify(prefs));

      // ยิง API ซิงค์คะแนนขึ้น Supabase
      axios.post('https://://cinematch-backend-hdvz.onrender.com/api/preferences', 
        { genreWeights: prefs.genreWeights },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(err => console.error("Pref Sync Error:", err));
    }

    // 🟢 2. บันทึกประวัติการเลือกหนังลงตาราง user_likes
    try {
      await axios.post('https://://cinematch-backend-hdvz.onrender.com/api/likes', 
        { 
          movie_id: selectedMovie.id, 
          action: 'this_or_that_choice',
          media_type: 'movie',
          movie_title: selectedMovie.title,
          poster_path: selectedMovie.poster_path,
          genres: selectedMovie.genre_ids ? selectedMovie.genre_ids.join(',') : '',
          points: 3
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
    <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="text-center mb-8">
        <span className="bg-[#FECE79]/30 text-[#8C0902] text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
          รอบสุ่มความชอบ
        </span>
        <h1 className="text-3xl font-black text-[#210100] mt-3">เลือกเรื่องที่คุณสนใจมากกว่า?</h1>
        <p className="text-[#8C0902] font-black text-xl mt-2">เหลือเวลา {timeLeft} วินาที</p>
        <p className="text-[#B14A36] text-sm mt-1">คู่ที่ {currentIndex + 1} จากทั้งหมด 7 คู่</p>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-8 max-w-5xl w-full">
        {/* การ์ดภาพยนตร์ฝั่งซ้าย */}
        <div onClick={() => handleSelect(currentPair.left)} className="flex-1 bg-white border-2 border-[#FECE79]/30 hover:border-[#8C0902] rounded-3xl p-4 shadow-sm hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-2 group w-full max-w-sm mx-auto flex flex-col h-full">
          <div className="w-full aspect-square rounded-2xl overflow-hidden mb-4 bg-gray-100 shrink-0 relative">
            <img src={`https://image.tmdb.org/t/p/w500${currentPair.left.poster_path}`} alt={currentPair.left.title} className="w-full h-full object-cover" />
            <div className="absolute top-2 right-2 bg-[#210100]/80 text-[#FECE79] text-xs font-black px-2 py-1 rounded-md backdrop-blur-sm shadow-md">
              ★ {currentPair.left.vote_average ? currentPair.left.vote_average.toFixed(1) : "N/A"}
            </div>
          </div>
          <div className="flex flex-col grow px-2 pb-2">
            <h2 className="font-black text-lg text-[#210100] group-hover:text-[#8C0902] line-clamp-1 text-center w-full mb-3">{currentPair.left.title}</h2>
            
            <div className="mt-auto bg-[#FFFDF9] border border-[#FECE79]/40 rounded-xl p-3 flex flex-col gap-2.5">
              <div className="flex flex-wrap justify-center gap-1.5">
                {getKeywords(currentPair.left.genre_ids).length > 0 ? (
                  getKeywords(currentPair.left.genre_ids).map((keyword, idx) => (
                    <span key={idx} className="bg-[#FECE79]/20 text-[#8C0902] px-2 py-1 rounded-md text-[10px] font-extrabold border border-[#FECE79]/50 shadow-sm">
                      {keyword}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-[#210100]/50 font-medium italic">ไม่มีข้อมูลหมวดหมู่</span>
                )}
              </div>
              <p className="text-[11px] font-medium text-[#210100]/70 line-clamp-1 text-center leading-relaxed border-t border-[#FECE79]/30 pt-2.5" title={currentPair.left.overview}>
                {currentPair.left.overview}
              </p>
            </div>
          </div>
        </div>

        <div className="text-xl font-black text-[#8C0902] bg-[#FECE79]/20 w-12 h-12 rounded-full flex items-center justify-center border border-[#FECE79]/40 shrink-0">VS</div>

        {/* การ์ดภาพยนตร์ฝั่งขวา */}
        <div onClick={() => handleSelect(currentPair.right)} className="flex-1 bg-white border-2 border-[#FECE79]/30 hover:border-[#8C0902] rounded-3xl p-4 shadow-sm hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-2 group w-full max-w-sm mx-auto flex flex-col h-full">
          <div className="w-full aspect-square rounded-2xl overflow-hidden mb-4 bg-gray-100 shrink-0 relative">
            <img src={`https://image.tmdb.org/t/p/w500${currentPair.right.poster_path}`} alt={currentPair.right.title} className="w-full h-full object-cover" />
            <div className="absolute top-2 right-2 bg-[#210100]/80 text-[#FECE79] text-xs font-black px-2 py-1 rounded-md backdrop-blur-sm shadow-md">
              ★ {currentPair.right.vote_average ? currentPair.right.vote_average.toFixed(1) : "N/A"}
            </div>
          </div>
          <div className="flex flex-col grow px-2 pb-2">
            <h2 className="font-black text-lg text-[#210100] group-hover:text-[#8C0902] line-clamp-1 text-center w-full mb-3">{currentPair.right.title}</h2>
            
            <div className="mt-auto bg-[#FFFDF9] border border-[#FECE79]/40 rounded-xl p-3 flex flex-col gap-2.5">
              <div className="flex flex-wrap justify-center gap-1.5">
                {getKeywords(currentPair.right.genre_ids).length > 0 ? (
                  getKeywords(currentPair.right.genre_ids).map((keyword, idx) => (
                    <span key={idx} className="bg-[#FECE79]/20 text-[#8C0902] px-2 py-1 rounded-md text-[10px] font-extrabold border border-[#FECE79]/50 shadow-sm">
                      {keyword}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-[#210100]/50 font-medium italic">ไม่มีข้อมูลหมวดหมู่</span>
                )}
              </div>
              <p className="text-[11px] font-medium text-[#210100]/70 line-clamp-1 text-center leading-relaxed border-t border-[#FECE79]/30 pt-2.5" title={currentPair.right.overview}>
                {currentPair.right.overview}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}