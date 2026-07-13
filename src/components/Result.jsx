import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const GENRE_MAP = {
  28: "แอคชั่น", 12: "ผจญภัย", 16: "แอนิเมชัน", 35: "ตลก", 80: "อาชญากรรม",
  99: "สารคดี", 18: "ดราม่า", 10751: "ครอบครัว", 14: "แฟนตาซี", 36: "ประวัติศาสตร์",
  27: "สยองขวัญ", 10402: "มิวสิคัล", 9648: "ลึกลับ", 10749: "โรแมนติก", 878: "ไซไฟ",
  10770: "ทีวีมูฟวี่", 53: "ระทึกขวัญ", 10752: "สงคราม", 37: "คาวบอย"
};

export default function Result({ onLeave }) {
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [likedMovies, setLikedMovies] = useState([]);
  const [dislikedMovies, setDislikedMovies] = useState([]);

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [detailedMovie, setDetailedMovie] = useState(null);
  const recSmallScrollRef = useRef(null);

  useEffect(() => {
    const loadUserVotes = async () => {
      const token = localStorage.getItem('cinematch_token');
      if (!token) return;
      try {
        const res = await axios.get('https://cinematch-backend-hdvz.onrender.com/api/likes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const allLikes = res.data || [];
        setLikedMovies(allLikes.filter(item => item.action === 'like'));
        setDislikedMovies(allLikes.filter(item => item.action === 'dislike'));
      } catch (err) {
        console.error("Error fetching likes", err);
      }
    };

    const loadMatchedMovies = () => {
      try {
        const savedResults = localStorage.getItem('cinematch_duo_results');
        if (savedResults && savedResults !== "undefined") {
          const data = JSON.parse(savedResults);
          const formatted = data.map((item, index) => ({
            ...item,
            rank: index + 1,
            matchPercent: item.matchPercent || (99 - index)
          }));
          setMovies(formatted);
        } else {
          toast.error("ไม่พบข้อมูลการจับคู่");
        }
      } catch(e) {
        console.error("Error loading matched movies", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserVotes();
    loadMatchedMovies();
  }, []);

  // 🟢 เปลี่ยนชื่อจาก handleLikeDislike เป็น handleVote และอัปเดตกฎ Like +5 / Dislike 0
  const handleVote = async (item, type, e) => {
    if (e) e.stopPropagation();
    
    const token = localStorage.getItem('cinematch_token');
    if (!token) {
      toast.error("กรุณาล็อกอินก่อนใช้งาน");
      return;
    }

    const isLike = type === 'like';
    const filmId = String(item.id).replace(/^(mv-|tv-)/, '');

    const isCurrentlyLiked = likedMovies.some(m => String(m.movie_id) === filmId);
    const isCurrentlyDisliked = dislikedMovies.some(m => String(m.movie_id) === filmId);

    // 1. จัดการคะแนน (เฉพาะตอน Like ถึงจะได้ 5 แต้ม)
    if (item.genre_ids && isLike && !isCurrentlyLiked) {
      let prefs = JSON.parse(localStorage.getItem('cinematch_preferences') || '{"genreWeights":{}}');
      if (!prefs.genreWeights) prefs.genreWeights = {};

      item.genre_ids.forEach(id => {
        const genreName = GENRE_MAP[id]; 
        if (genreName) {
          prefs.genreWeights[genreName] = (prefs.genreWeights[genreName] || 0) + 5; 
        }
      });
      
      localStorage.setItem('cinematch_preferences', JSON.stringify(prefs));

      axios.post('https://cinematch-backend-hdvz.onrender.com/api/preferences', 
        { genreWeights: prefs.genreWeights },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(err => console.error("Pref Sync Error:", err));
    } else if (item.genre_ids && !isLike && isCurrentlyLiked) {
        // กรณีเคยกด Like ไปแล้ว แล้วเปลี่ยนใจมากด Dislike ทับ ต้องหัก 5 แต้มคืน
        let prefs = JSON.parse(localStorage.getItem('cinematch_preferences') || '{"genreWeights":{}}');
        if (!prefs.genreWeights) prefs.genreWeights = {};

        item.genre_ids.forEach(id => {
          const genreName = GENRE_MAP[id]; 
          if (genreName) {
            prefs.genreWeights[genreName] = Math.max(0, (prefs.genreWeights[genreName] || 0) - 5); 
          }
        });
        
        localStorage.setItem('cinematch_preferences', JSON.stringify(prefs));

        axios.post('https://cinematch-backend-hdvz.onrender.com/api/preferences', 
          { genreWeights: prefs.genreWeights },
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(err => console.error("Pref Sync Error:", err));
    }

    // 2. จัดการบันทึกคอลเลกชัน
    try {
      if (isLike) {
        if (isCurrentlyLiked) {
          // ยกเลิก Like
          await axios.delete(`https://cinematch-backend-hdvz.onrender.com/api/likes/${filmId}`, { headers: { Authorization: `Bearer ${token}` } });
          setLikedMovies(likedMovies.filter(m => String(m.movie_id) !== filmId));
          toast.success("นำออกจากรายการที่ชอบแล้ว");
        } else {
          // กด Like
          const payload = {
            movie_id: filmId,
            action: 'like',
            media_type: item.media_type || (item.first_air_date ? 'tv' : 'movie'),
            movie_title: item.title || item.name,
            poster_path: item.poster_path,
            genres: item.genre_ids ? item.genre_ids.join(',') : '',
            points: 5 
          };
          await axios.post('https://cinematch-backend-hdvz.onrender.com/api/likes', payload, { headers: { Authorization: `Bearer ${token}` } });
          
          setLikedMovies([...likedMovies, payload]);
          setDislikedMovies(dislikedMovies.filter(m => String(m.movie_id) !== filmId));
          toast.success("เพิ่มไปยังรายการที่ชอบแล้ว");
        }
      } else {
        if (isCurrentlyDisliked) {
          // ยกเลิก Dislike
          await axios.delete(`https://cinematch-backend-hdvz.onrender.com/api/likes/${filmId}`, { headers: { Authorization: `Bearer ${token}` } });
          setDislikedMovies(dislikedMovies.filter(m => String(m.movie_id) !== filmId));
          toast.success("นำออกจากรายการที่ไม่ชอบแล้ว");
        } else {
          // กด Dislike
          const payload = {
            movie_id: filmId,
            action: 'dislike',
            media_type: item.media_type || (item.first_air_date ? 'tv' : 'movie'),
            movie_title: item.title || item.name,
            poster_path: item.poster_path,
            genres: item.genre_ids ? item.genre_ids.join(',') : '',
            points: 0 
          };
          await axios.post('https://cinematch-backend-hdvz.onrender.com/api/likes', payload, { headers: { Authorization: `Bearer ${token}` } });
          
          setDislikedMovies([...dislikedMovies, payload]);
          setLikedMovies(likedMovies.filter(m => String(m.movie_id) !== filmId));
          toast.success("ซ่อนหนังเรื่องนี้แล้ว");
        }
      }
    } catch (err) {
      console.error("Vote error:", err);
      toast.error("เกิดข้อผิดพลาดในการเซฟลงฐานข้อมูล");
    }
  };

  const checkIsLiked = (id) => {
    const stringId = String(id).replace(/^(mv-|tv-)/, '');
    return likedMovies.some(m => String(m.movie_id) === stringId);
  };
  
  const checkIsDisliked = (id) => {
    const stringId = String(id).replace(/^(mv-|tv-)/, '');
    return dislikedMovies.some(m => String(m.movie_id) === stringId);
  };

  const getKeywords = (genreIds) => {
    if (!genreIds) return [];
    return genreIds.map(id => GENRE_MAP[id]).filter(Boolean).slice(0, 3);
  };

  const scroll = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleMovieClick = async (item) => {
    setSelectedMovie(item); 
    setDetailedMovie(null); 
    try {
      const API_KEY = "181edc5801db6678de6ccb2864149a6a";
      const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
      
      const thRes = await fetch(`https://api.themoviedb.org/3/${type}/${item.id}?api_key=${API_KEY}&language=th-TH&append_to_response=watch/providers,credits`);
      const thData = await thRes.json();

      let finalOverview = thData.overview;
      if (!finalOverview) {
        const enRes = await fetch(`https://api.themoviedb.org/3/${type}/${item.id}?api_key=${API_KEY}&language=en-US`);
        const enData = await enRes.json();
        finalOverview = enData.overview || "ไม่มีเรื่องย่อสำหรับเนื้อหานี้";
      }

      const director = thData.credits?.crew?.find(c => c.job === 'Director' || c.job === 'Executive Producer');
      const castArray = thData.credits?.cast?.slice(0, 8) || [];
      const genres = thData.genres?.map(g => g.name).join(', ') || 'ไม่ระบุ';

      const allProviders = thData['watch/providers']?.results || {};
      const mergedProviders = { flatrate: [], rent: [], buy: [] };
      const seenIds = new Set();
      
      const addProvidersFromRegion = (regionCode) => {
        if (allProviders[regionCode]) {
          ['flatrate', 'rent', 'buy'].forEach(ptype => {
            if (allProviders[regionCode][ptype]) {
              allProviders[regionCode][ptype].forEach(p => {
                if (!seenIds.has(p.provider_id)) {
                  seenIds.add(p.provider_id);
                  mergedProviders[ptype].push(p);
                }
              });
            }
          });
        }
      };

      ['TH', 'US', 'KR', 'JP', 'GB'].forEach(addProvidersFromRegion);
      if (seenIds.size === 0) Object.keys(allProviders).forEach(addProvidersFromRegion);
      
      ['flatrate', 'rent', 'buy'].forEach(ptype => {
        mergedProviders[ptype].sort((a, b) => a.display_priority - b.display_priority);
        mergedProviders[ptype] = mergedProviders[ptype].slice(0, 4); 
      });

      let inTheaters = false;
      if (type === 'movie' && thData.release_date) {
        const releaseDate = new Date(thData.release_date);
        const diffDays = Math.ceil((new Date() - releaseDate) / (1000 * 60 * 60 * 24));
        if (diffDays >= -30 && diffDays <= 60) inTheaters = true;
      }

      setDetailedMovie({ 
        ...thData, media_type: type, displayOverview: finalOverview, providers: mergedProviders, 
        directorName: director ? director.name : 'ไม่ระบุ', cast: castArray, genreNames: genres, inTheaters 
      });
    } catch (error) { 
      console.error("Error fetching details", error); 
    }
  };

  const formatRuntime = (movie) => {
    if (movie.media_type === 'tv') {
      const seasons = movie.number_of_seasons ? `${movie.number_of_seasons} ซีซัน` : '';
      const epTime = movie.episode_run_time && movie.episode_run_time[0] ? `(${movie.episode_run_time[0]} นาที/ตอน)` : '';
      return `${seasons} ${epTime}`.trim() || 'N/A';
    } else {
      if (!movie.runtime) return 'N/A';
      const h = Math.floor(movie.runtime / 60);
      const m = movie.runtime % 60;
      return h > 0 ? `${h} ชม. ${m} นาที` : `${m} นาที`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen pb-20">
        <div className="w-12 h-12 border-4 border-[#FECE79] border-t-[#8C0902] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pb-20 animate-fade-in text-center px-4">
        <div className="w-16 h-16 bg-[#FECE79]/20 rounded-full flex items-center justify-center mb-4 border-2 border-[#FECE79]/50">
          <svg className="w-8 h-8 text-[#B14A36]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-2xl font-black text-[#210100] mb-2">ประมวลผลข้อมูลไม่สำเร็จ</h2>
        <p className="text-[#B14A36] mb-6">ไม่พบข้อมูลการจับคู่ หรือการเชื่อมต่อฐานข้อมูลขัดข้อง</p>
        <button onClick={onLeave} className="px-8 py-3 bg-[#8C0902] text-white rounded-full font-bold shadow-md hover:bg-[#210100] transition-colors">ย้อนกลับไปหน้าห้อง</button>
      </div>
    );
  }

  const top1 = movies[0];
  const top2 = movies[1];
  const top3 = movies[2];
  const otherRanks = movies.slice(3);

  return (
    <div className="flex flex-col items-center px-4 md:px-6 pt-10 pb-20 w-full animate-fade-in relative min-h-screen">
      
      <div className="w-full max-w-7xl mb-10 text-center">
        <span className="bg-[#8C0902] text-[#FECE79] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-md">Duo Match Result</span>
        <h1 className="text-4xl md:text-5xl font-black text-[#210100] mt-4 mb-3 tracking-widest uppercase">PERFECT MATCH</h1>
        <p className="text-[#B14A36] font-bold text-sm md:text-base">
          ประมวลผลความชอบของพวกคุณทั้งคู่ นี่คือผลลัพธ์ที่เข้ากันได้มากที่สุด
        </p>
      </div>

      <div className="max-w-7xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
          
          {/* --- Top 1 Card --- */}
          {top1 && (
            <div className="lg:col-span-2 relative group rounded-3xl overflow-hidden shadow-xl border-4 border-[#E6A341] bg-black cursor-pointer aspect-4/5 sm:aspect-video md:aspect-[2.21/1] p-1" onClick={() => handleMovieClick(top1)}>
              <img src={`https://image.tmdb.org/t/p/original${top1.backdrop_path}`} alt={top1.title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-80 transition-all duration-700" />
              
              {/* 🟢 ปุ่ม Like / Dislike (Top 1) */}
              <div className="absolute top-4 right-4 z-20 flex gap-2">
                <button 
                  onClick={(e) => handleVote(top1, 'dislike', e)} 
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md transition-transform border ${
                    checkIsDisliked(top1.id) ? 'bg-[#8C0902] border-[#8C0902] text-white scale-110' : 'bg-[#8C0902]/90 border-white/20 text-white hover:scale-110 hover:bg-[#8C0902]'
                  }`}
                  title="ไม่ถูกใจ"
                >
                  <svg className="w-5 h-5 mt-1" fill="currentColor" viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
                </button>
                <button 
                  onClick={(e) => handleVote(top1, 'like', e)} 
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md transition-transform border ${
                    checkIsLiked(top1.id) ? 'bg-[#E6A341] border-[#E6A341] text-[#210100] scale-110' : 'bg-[#E6A341]/90 border-white/20 text-[#210100] hover:scale-110 hover:bg-[#E6A341]'
                  }`}
                  title="ถูกใจ"
                >
                  <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                </button>
              </div>

              <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-10">
                <div className="absolute top-4 left-4 md:top-6 md:left-6 flex flex-col items-start gap-2 z-10">
                  <div className="bg-linear-to-br from-[#FFD700] to-[#E6A341] text-[#210100] w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center font-black text-2xl md:text-4xl shadow-[0_0_20px_rgba(255,215,0,0.6)] border-4 border-white/50 backdrop-blur-md">1</div>
                  <span className="bg-[#210100]/80 text-[#FECE79] px-3 py-1.5 rounded-full text-[10px] md:text-xs font-black shadow-md border border-[#FECE79]/30 backdrop-blur-sm">🎯 {top1.matchPercent}% Match</span>
                </div>
                <div className="relative z-10 w-full mt-auto">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {getKeywords(top1.genre_ids).map((keyword, idx) => (
                      <span key={idx} className="bg-white/20 text-white px-2 py-1 rounded-md text-[10px] font-extrabold backdrop-blur-md border border-white/30">{keyword}</span>
                    ))}
                  </div>
                  <h3 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4 line-clamp-2 drop-shadow-lg">{top1.title}</h3>
                  <button className="bg-[#8C0902] hover:bg-[#E6A341] hover:text-[#210100] text-white font-extrabold py-2.5 px-8 rounded-full transition-colors shadow-lg text-sm w-fit">ดูรายละเอียด</button>
                </div>
              </div>
            </div>
          )}

          {/* --- Top 2-3 Cards --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
            {[top2, top3].map((movie, idx) => movie && (
              <div key={movie.id} onClick={() => handleMovieClick(movie)} className={`w-full h-full min-h-50 sm:min-h-auto relative group rounded-3xl overflow-hidden shadow-lg border-2 cursor-pointer flex flex-col justify-end p-5 ${idx === 0 ? 'border-[#C0C0C0]' : 'border-[#CD7F32]'}`}>
                <img src={`https://image.tmdb.org/t/p/w780${movie.backdrop_path}`} alt={movie.title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-all duration-700 bg-black" />
                
                {/* 🟢 ปุ่ม Like / Dislike (Top 2-3) */}
                <div className="absolute top-3 right-3 z-20 flex gap-1.5">
                  <button 
                    onClick={(e) => handleVote(movie, 'dislike', e)} 
                    className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md transition-transform border ${
                      checkIsDisliked(movie.id) ? 'bg-[#8C0902] border-[#8C0902] text-white scale-110' : 'bg-[#8C0902]/90 border-white/20 text-white hover:scale-110 hover:bg-[#8C0902]'
                    }`}
                  >
                    <svg className="w-4 h-4 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
                  </button>
                  <button 
                    onClick={(e) => handleVote(movie, 'like', e)} 
                    className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md transition-transform border ${
                      checkIsLiked(movie.id) ? 'bg-[#E6A341] border-[#E6A341] text-[#210100] scale-110' : 'bg-[#E6A341]/90 border-white/20 text-[#210100] hover:scale-110 hover:bg-[#E6A341]'
                    }`}
                  >
                    <svg className="w-4 h-4 mb-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                  </button>
                </div>

                <div className="absolute top-3 left-3 z-10">
                  <div className={`text-[#210100] w-10 h-10 rounded-full flex items-center justify-center font-black text-lg border-2 border-white/40 shadow-md ${idx === 0 ? 'bg-linear-to-br from-gray-100 to-gray-400' : 'bg-linear-to-br from-orange-200 to-orange-500'}`}>{idx + 2}</div>
                </div>
                <div className="absolute bottom-3 left-5 z-10">
                   <span className="bg-[#210100]/80 text-[#FECE79] px-2 py-0.5 rounded text-[9px] font-black border border-[#FECE79]/30 backdrop-blur-sm tracking-widest">🎯 {movie.matchPercent}% MATCH</span>
                </div>
                <div className="relative z-10 mt-auto w-full mb-6">
                  <h3 className="text-xl md:text-2xl font-black text-white line-clamp-1 drop-shadow-md">{movie.title}</h3>
                  <span className="text-gray-300 text-xs font-medium">{getKeywords(movie.genre_ids).join(' • ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- Top 4-10 Cards --- */}
        {otherRanks.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-black text-[#210100]">อันดับ 4 - 10</h4>
              <div className="hidden md:flex gap-2">
                <button onClick={() => scroll(recSmallScrollRef, 'left')} className="w-8 h-8 rounded-full bg-[#FECE79]/30 text-[#8C0902] flex items-center justify-center hover:bg-[#E6A341] hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg></button>
                <button onClick={() => scroll(recSmallScrollRef, 'right')} className="w-8 h-8 rounded-full bg-[#FECE79]/30 text-[#8C0902] flex items-center justify-center hover:bg-[#E6A341] hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></button>
              </div>
            </div>
            <div ref={recSmallScrollRef} className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {otherRanks.map((movie) => (
                <div key={movie.id} className="snap-start min-w-35 max-w-35 relative flex flex-col">
                  
                  <div className="w-full aspect-2/3 rounded-xl overflow-hidden shadow-sm border border-[#FECE79]/40 relative bg-gray-100 mb-2 group cursor-pointer" onClick={() => handleMovieClick(movie)}>
                    <img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-0 left-0 bg-[#210100]/90 text-white w-8 h-8 rounded-br-xl font-black flex items-center justify-center text-sm shadow-md backdrop-blur-sm z-10">{movie.rank}</div>
                    <div className="absolute top-2 right-2 z-10">
                      <span className="bg-[#210100]/80 text-[#FECE79] px-1.5 py-0.5 rounded text-[8px] font-black border border-[#FECE79]/30 backdrop-blur-sm">🎯 {movie.matchPercent}% Match</span>
                    </div>

                    {/* 🟢 ปุ่ม Like / Dislike (Top 4-10) */}
                    <div className="absolute bottom-2 right-2 z-20 flex gap-1">
                      <button 
                        onClick={(e) => handleVote(movie, 'dislike', e)} 
                        className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm border transition-transform ${
                          checkIsDisliked(movie.id) ? 'bg-[#8C0902] border-[#8C0902] text-white scale-110' : 'bg-[#8C0902]/90 border-white/20 text-white hover:scale-110 hover:bg-[#8C0902]'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
                      </button>
                      <button 
                        onClick={(e) => handleVote(movie, 'like', e)} 
                        className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm border transition-transform ${
                          checkIsLiked(movie.id) ? 'bg-[#E6A341] border-[#E6A341] text-[#210100] scale-110' : 'bg-[#E6A341]/90 border-white/20 text-[#210100] hover:scale-110 hover:bg-[#E6A341]'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 mb-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                      </button>
                    </div>

                  </div>
                  <h3 onClick={() => handleMovieClick(movie)} className="font-bold text-[#210100] text-xs line-clamp-2 hover:text-[#8C0902] transition-colors text-center px-1 cursor-pointer">{movie.title}</h3>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto pt-10 border-t border-[#FECE79]/30 w-full flex flex-col items-center gap-4">
          <p className="text-xs text-[#210100]/60 font-bold mb-2">เมื่อตัดสินใจเลือกภาพยนตร์ได้แล้ว หรือต้องการเริ่มใหม่</p>
          <button 
            onClick={onLeave} 
            className="w-full sm:w-auto px-10 py-3.5 bg-white border-2 border-[#B14A36] text-[#B14A36] hover:bg-[#B14A36] hover:text-white rounded-full font-bold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
            ยุติการเชื่อมต่อ / ออกจากห้อง
          </button>
        </div>
      </div>

      {/* --- Modal แสดงรายละเอียดภาพยนตร์ --- */}
      {selectedMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-[#210100]/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FFFDF9] rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col md:flex-row transform transition-all scale-100">
            <button onClick={() => setSelectedMovie(null)} className="absolute top-4 right-4 bg-white/90 hover:bg-white rounded-full p-2 z-30 shadow-md transition-transform hover:scale-110">
              <svg className="w-5 h-5 text-[#8C0902]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <div className="w-full md:w-[35%] h-64 md:h-auto shrink-0 relative bg-[#FECE79]/20">
              <img src={`https://image.tmdb.org/t/p/w500${selectedMovie.poster_path}`} alt={selectedMovie.title || selectedMovie.name} className="w-full h-full object-cover" />
            </div>
            <div className="w-full md:w-[65%] p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar">
              <div className="mb-4">
                <span className="inline-block bg-[#FECE79]/30 text-[#8C0902] text-xs font-bold px-2 py-1 rounded-md mb-2">{selectedMovie.media_type === 'tv' ? 'TV Series' : 'Movie'}</span>
                <h2 className="text-3xl md:text-4xl font-black text-[#210100] leading-tight mb-1">{selectedMovie.title || selectedMovie.name}</h2>
                <p className="text-[#210100]/60 text-sm italic mb-3">{selectedMovie.original_title || selectedMovie.original_name}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-[#B14A36]">
                  <span>{selectedMovie.release_date?.substring(0,4) || selectedMovie.first_air_date?.substring(0,4) || "N/A"}</span><span>•</span>
                  <span>{detailedMovie ? formatRuntime(detailedMovie) : "กำลังคำนวณเวลา..."}</span><span>•</span>
                  <span className="flex items-center gap-1 bg-[#E6A341]/20 px-2 py-0.5 rounded text-[#8C0902]">★ {selectedMovie.vote_average?.toFixed(1) || "N/A"}</span>
                </div>
              </div>
              <div className="mb-6">
                <p className="text-[#210100]/80 text-sm md:text-base leading-relaxed font-medium">{detailedMovie ? detailedMovie.displayOverview : (selectedMovie.overview || "กำลังโหลดข้อมูลเจาะลึก...")}</p>
              </div>
              {detailedMovie && (
                <div className="mb-6 bg-[#FECE79]/10 p-4 rounded-xl border border-[#FECE79]/30">
                  <p className="text-xs md:text-sm text-[#210100] mb-2"><span className="font-extrabold text-[#8C0902]">หมวดหมู่:</span> {detailedMovie.genreNames}</p>
                  {selectedMovie.media_type !== 'tv' && <p className="text-xs md:text-sm text-[#210100] mb-3"><span className="font-extrabold text-[#8C0902]">ผู้กำกับ:</span> {detailedMovie.directorName}</p>}
                  <p className="text-xs md:text-sm font-extrabold text-[#8C0902] mb-2">นักแสดงนำ:</p>
                  <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
                    {detailedMovie.cast.map(actor => (
                      <div key={actor.id} className="flex flex-col items-center w-16 shrink-0 group">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white mb-1.5 border border-[#FECE79] shadow-sm group-hover:border-[#E6A341] transition-colors">
                          {actor.profile_path ? (
                            <img src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} alt={actor.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#8C0902]/30 bg-[#FECE79]/20">
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-[#210100] text-center leading-tight line-clamp-2">{actor.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-auto pt-4 border-t border-[#FECE79]/40">
                <h4 className="text-xs font-bold text-[#8C0902] mb-3">ช่องทางการรับชม:</h4>
                <div className="flex flex-wrap gap-2 mb-6">
                  {detailedMovie ? (
                    <>
                      {detailedMovie.inTheaters && (
                        <div className="flex items-center gap-1.5 bg-[#FFFDF9] border border-[#FECE79]/50 rounded-lg p-1.5 pr-3 shadow-sm">
                          <div className="w-7 h-7 rounded-md bg-[#8C0902] flex items-center justify-center text-white"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 4v1h-2V4c0-.55-.45-1-1-1H9c-.55 0-1 .45-1 1v1H6V4c0-.55-.45-1-1-1s-1 .45-1 1v16c0 .55.45 1 1 1s1-.45 1-1v-1h2v1c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-1h2v1c0 .55.45 1 1 1s1-.45 1-1V4c0-.55-.45-1-1-1s-1 .45-1 1zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg></div>
                          <span className="text-[10px] font-bold text-[#210100]">โรงภาพยนตร์</span>
                        </div>
                      )}
                      {(detailedMovie.providers.flatrate.length > 0 || detailedMovie.providers.rent.length > 0 || detailedMovie.providers.buy.length > 0) ? (
                        ['flatrate', 'rent', 'buy'].map(type => 
                          detailedMovie.providers[type].map(provider => (
                            <div key={provider.provider_id + type} className="flex items-center gap-1.5 bg-[#FFFDF9] border border-[#FECE79]/50 rounded-lg p-1.5 pr-3 shadow-sm" title={`${provider.provider_name} (${type})`}>
                              <img src={`https://image.tmdb.org/t/p/original${provider.logo_path}`} className="w-7 h-7 rounded-md object-cover" alt={provider.provider_name}/>
                              <span className="text-[10px] font-bold text-[#210100] capitalize">{type === 'flatrate' ? 'สตรีม' : type === 'rent' ? 'เช่า' : 'ซื้อ'}</span>
                            </div>
                          ))
                        )
                      ) : (!detailedMovie.inTheaters && <p className="text-xs text-[#B14A36] font-medium bg-[#B14A36]/10 inline-block px-3 py-1.5 rounded-lg">รออัปเดตช่องทางสตรีมมิ่งอย่างเป็นทางการ</p>)}
                    </>
                  ) : <p className="text-xs text-[#E6A341] animate-pulse">กำลังตรวจสอบช่องทางรับชม...</p>}
                </div>
                <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent((selectedMovie.title || selectedMovie.name) + ' official trailer')}`} target="_blank" rel="noopener noreferrer" className="w-full bg-[#8C0902] hover:bg-[#210100] text-white font-bold py-4 rounded-xl text-center transition-all shadow-md flex items-center justify-center gap-2 hover:-translate-y-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>ดูตัวอย่าง Trailer
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}