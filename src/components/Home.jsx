import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const GENRE_MAP = {
  28: "แอคชั่น", 12: "ผจญภัย", 16: "แอนิเมชัน", 35: "ตลก", 80: "อาชญากรรม",
  99: "สารคดี", 18: "ดราม่า", 10751: "ครอบครัว", 14: "แฟนตาซี", 36: "ประวัติศาสตร์",
  27: "สยองขวัญ", 10402: "มิวสิคัล", 9648: "ลึกลับ", 10749: "โรแมนติก", 878: "ไซไฟ",
  10770: "ทีวีมูฟวี่", 53: "ระทึกขวัญ", 10752: "สงคราม", 37: "คาวบอย"
};

export default function Home({ setStep, currentUser, userPreferences }) {
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingTVs, setTrendingTVs] = useState([]);

  const [recommended, setRecommended] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [detailedMovie, setDetailedMovie] = useState(null);

  const movieScrollRef = useRef(null);
  const tvScrollRef = useRef(null);
  const recSmallScrollRef = useRef(null); 

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('cinematch_token');
      
      const storedPrefs = JSON.parse(localStorage.getItem('cinematch_preferences') || '{}');
      const genreWeights = storedPrefs.genreWeights || {};
      const API_KEY = "181edc5801db6678de6ccb2864149a6a";

      try {
        const recPromise = axios.post('https://cinematch-backend-hdvz.onrender.com/api/recommendations', 
          { genreWeights: genreWeights },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const moviePromise = fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${API_KEY}&language=th-TH`);
        const tvPromise = fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${API_KEY}&language=th-TH`);

        const [recRes, movieRes, tvRes] = await Promise.all([recPromise, moviePromise, tvPromise]);
        
        const movieData = await movieRes.json();
        const tvData = await tvRes.json();

        const recData = recRes.data || [];
        const topScore = recData[0]?.rawScore || 1; 
        
        const formattedRecs = recData.map((item, index) => {
          let percent = 98; 
          
          if (index > 0) {
            if (item.rawScore && topScore > 0) {
               percent = Math.floor((item.rawScore * 98) / topScore);
               if (percent >= 98) percent = 98 - index; 
            } else {
               percent = 98 - (index * 2); 
            }
          }
          
          return {
            ...item,
            rank: index + 1, 
            matchPercent: percent 
          };
        });

        setRecommended(formattedRecs);
        setTrendingMovies(movieData.results || []);
        setTrendingTVs(tvData.results || []);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // ฟังก์ชันจัดการการกด Like / Dislike
    const handleVote = async (item, type, e) => {
        if (e) e.stopPropagation();

        try {
            const token = localStorage.getItem('cinematch_token');
            const isLike = type === 'like';
            
            // 🟢 1. อัปเดตคะแนน (ทำเฉพาะตอน Like เท่านั้น)
            if (item.genre_ids && isLike) {
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
            }

            // 🟢 2. บันทึกเข้าคอลเลกชัน
            const payload = {
                film_id: item.id,
                film_title: item.title || item.name,
                poster_path: item.poster_path,
                type: type,
                media_type: item.media_type || (item.first_air_date ? 'tv' : 'movie'),
                genres: item.genre_ids ? item.genre_ids.join(',') : '',
                points: isLike ? 5 : 0 
            };

            await axios.post('https://cinematch-backend-hdvz.onrender.com/api/likes', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(isLike ? 'เพิ่มลงในรายการโปรดแล้ว' : 'ซ่อนหนังเรื่องนี้แล้ว');
            
            // ถ้าหน้าไหนมี setResults สำหรับเตะการ์ดออก ก็คงบรรทัดนั้นไว้ครับ (เช่น SearchPage, MovieSearch)
            // setResults(prev => prev.filter(movie => movie.id !== item.id));

        } catch (error) {
            console.error("Vote error:", error);
            toast.error("เกิดข้อผิดพลาดในการเซฟลงฐานข้อมูล");
        }
    };

  const ScrollButtons = ({ scrollRef }) => (
    <div className="hidden md:flex gap-2">
      <button onClick={() => scroll(scrollRef, 'left')} className="w-8 h-8 rounded-full bg-[#FECE79]/30 text-[#8C0902] flex items-center justify-center hover:bg-[#E6A341] hover:text-white transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
      </button>
      <button onClick={() => scroll(scrollRef, 'right')} className="w-8 h-8 rounded-full bg-[#FECE79]/30 text-[#8C0902] flex items-center justify-center hover:bg-[#E6A341] hover:text-white transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
      </button>
    </div>
  );

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
        ...thData, 
        media_type: type, 
        displayOverview: finalOverview, 
        providers: mergedProviders, 
        directorName: director ? director.name : 'ไม่ระบุ', 
        cast: castArray, 
        genreNames: genres, 
        inTheaters 
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
      return h > 0 ? `${h} ชม. ${movie.runtime % 60} นาที` : `${movie.runtime % 60} นาที`;
    }
  };

  const MovieCard = ({ item, isTV }) => {
    const title = isTV ? item.name : item.title;
    const year = isTV ? item.first_air_date?.substring(0, 4) : item.release_date?.substring(0, 4);

    return (
      <div className="min-w-36 max-w-36 md:min-w-44 md:max-w-44 flex flex-col h-full group bg-white rounded-2xl p-2.5 shadow-[0_4px_15px_rgba(33,1,0,0.03)] border border-[#FECE79]/30 hover:shadow-md transition-shadow relative">
        <div onClick={() => handleMovieClick({...item, media_type: isTV ? 'tv' : 'movie'})} className="relative w-full aspect-3/4 rounded-xl overflow-hidden mb-3 cursor-pointer bg-[#FFFDF9] shrink-0">
          <img src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute top-2 right-2 bg-[#210100]/80 backdrop-blur-sm text-[#FECE79] text-xs font-black px-2 py-1 rounded-md flex items-center gap-1 z-10">
            ★ {item.vote_average ? item.vote_average.toFixed(1) : "N/A"}
          </div>
          <div className="absolute bottom-2 left-0 right-0 px-2 flex justify-between z-20">
            <button onClick={(e) => { e.stopPropagation(); handleVote(item, 'dislike'); }} className="w-8 h-8 md:w-9 md:h-9 bg-[#8C0902]/90 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:scale-110 hover:bg-[#8C0902] shadow-lg transition-transform border border-white/20"><svg className="w-4 h-4 mt-1" fill="currentColor" viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg></button>
            <button onClick={(e) => { e.stopPropagation(); handleVote(item, 'like'); }} className="w-8 h-8 md:w-9 md:h-9 bg-[#E6A341]/90 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:scale-110 hover:bg-[#E6A341] shadow-lg transition-transform border border-white/20"><svg className="w-4 h-4 mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg></button>
          </div>
        </div>
        <div className="flex flex-col grow px-1">
          <h3 className="font-extrabold text-[#210100] text-sm leading-snug line-clamp-2" title={title}>{title}</h3>
          <p className="text-[#B14A36] font-bold text-xs mt-1">{year || "N/A"}</p>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="flex flex-col items-center justify-center py-40"><div className="w-12 h-12 border-4 border-[#FECE79] border-t-[#8C0902] rounded-full animate-spin mb-5"></div></div>;
  }

  const top1 = recommended[0];
  const top2 = recommended[1];
  const top3 = recommended[2];
  const otherRanks = recommended.slice(3); 

  return (
    <div className="w-full pb-20 animate-fade-in relative">
      
      <div className="max-w-7xl mx-auto px-6 mt-8 mb-12">
        <div className="bg-linear-to-br from-[#FECE79]/30 via-[#FFFDF9] to-[#E6A341]/10 rounded-3xl p-8 md:p-12 flex flex-col items-center justify-center border border-[#FECE79]/40 shadow-[0_10px 40px_rgba(230,163,65,0.08)] relative text-center">
          <h1 className="text-3xl md:text-5xl font-black text-[#210100] mb-6 tracking-tight leading-tight">ค้นหาภาพยนตร์ <span className="text-[#8C0902]">ที่ตรงใจคุณและเพื่อน</span></h1>
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center w-full">
            <button onClick={() => setStep(1)} className="bg-[#8C0902] hover:bg-[#210100] text-white font-extrabold text-sm md:text-base py-4 px-8 rounded-full transition-all shadow-lg hover:-translate-y-1 flex items-center justify-center gap-2 w-full sm:w-auto"><svg className="w-5 h-5 text-[#FECE79]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.866 8.21 8.21 0 0 0 3 2.48Z" /></svg> สร้างห้องจับคู่ </button>
            <button onClick={() => setStep(4)} className="bg-white border-2 border-[#FECE79] text-[#8C0902] hover:bg-[#FFFDF9] font-extrabold text-sm md:text-base py-3.5 px-8 rounded-full transition-all w-full sm:w-auto">AI Search</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-16">
        
        <section className="bg-white border-2 border-[#FECE79]/40 rounded-3xl p-6 md:p-10 shadow-[0_8px_30px_rgba(230,163,65,0.05)]">
          <div className="text-center mb-10">
            <span className="bg-[#8C0902] text-[#FECE79] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-md">Top 10 For You</span>
            <h2 className="text-3xl md:text-4xl font-black text-[#210100] tracking-tight mt-4 mb-2">ภาพยนตร์ที่ตรงใจคุณที่สุด</h2>
            <p className="text-[#B14A36] font-medium text-sm">ประมวลผลและคัดกรองจากคำตอบในแบบทดสอบของคุณ</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-10">
            
            {/* --- อันดับ 1 --- */}
            {top1 && (
              <div className="lg:col-span-2 relative group rounded-3xl overflow-hidden shadow-xl border-4 border-[#E6A341] bg-black cursor-pointer aspect-4/5 sm:aspect-video md:aspect-[2.21/1]" onClick={() => handleMovieClick(top1)}>
                <img src={`https://image.tmdb.org/t/p/original${top1.backdrop_path}`} alt={top1.title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-80 transition-all duration-700" />
                <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-10">
                  <div className="absolute top-4 left-4 md:top-6 md:left-6 flex flex-col items-start gap-2 z-10">
                    <div className="bg-linear-to-br from-[#FFD700] to-[#E6A341] text-[#210100] w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center font-black text-2xl md:text-4xl shadow-[0_0_20px_rgba(255,215,0,0.6)] border-4 border-white/50 backdrop-blur-md">1</div>
                    <span className="bg-[#210100]/80 text-[#FECE79] px-3 py-1.5 rounded-full text-[10px] md:text-xs font-black shadow-md border border-[#FECE79]/30 backdrop-blur-sm">🎯 {top1.matchPercent}% Match</span>
                  </div>

                  <div className="relative z-10 w-full mt-auto">
                    <h3 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4 line-clamp-2 drop-shadow-lg">{top1.title}</h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <button className="bg-[#8C0902] hover:bg-[#E6A341] hover:text-[#210100] text-white font-extrabold py-2.5 px-6 rounded-full transition-colors shadow-lg text-sm">ดูรายละเอียด</button>
                      <button onClick={(e) => { e.stopPropagation(); handleVote(top1, 'dislike'); }} className="w-10 h-10 bg-[#8C0902]/90 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:scale-110 shadow-lg border border-white/20"><svg className="w-5 h-5 mt-1" fill="currentColor" viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg></button>
                      <button onClick={(e) => { e.stopPropagation(); handleVote(top1, 'like'); }} className="w-10 h-10 bg-[#E6A341]/90 backdrop-blur-md rounded-full text-[#210100] flex items-center justify-center hover:scale-110 shadow-lg border border-white/20"><svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg></button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-6">
              {[top2, top3].map((movie, idx) => movie && (
                <div key={movie.id} onClick={() => handleMovieClick(movie)} className={`w-full h-full min-h-50 sm:min-h-auto relative group rounded-3xl overflow-hidden shadow-lg border-2 cursor-pointer flex flex-col justify-end p-5 ${idx === 0 ? 'border-[#C0C0C0]' : 'border-[#CD7F32]'}`}>
                  <img src={`https://image.tmdb.org/t/p/w780${movie.backdrop_path}`} alt={movie.title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-all duration-700 bg-black" />
                  <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
                    <div className={`text-[#210100] w-10 h-10 rounded-full flex items-center justify-center font-black text-lg border-2 border-white/40 shadow-md ${idx === 0 ? 'bg-linear-to-br from-gray-100 to-gray-400' : 'bg-linear-to-br from-orange-200 to-orange-500'}`}>
                      {idx + 2}
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 z-10">
                    <span className="bg-[#210100]/80 text-[#FECE79] px-2 py-1 rounded-md text-[10px] font-black shadow-md border border-[#FECE79]/30 backdrop-blur-sm">🎯 {movie.matchPercent}% Match</span>
                  </div>
                  <div className="relative z-10 mt-auto w-full">
                    <h3 className="text-xl md:text-2xl font-black text-white line-clamp-1 mb-3 drop-shadow-md">{movie.title}</h3>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleVote(movie, 'dislike'); }} className="w-8 h-8 bg-[#8C0902]/90 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:scale-110 border border-white/20"><svg className="w-4 h-4 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg></button>
                        <button onClick={(e) => { e.stopPropagation(); handleVote(movie, 'like'); }} className="w-8 h-8 bg-[#E6A341]/90 backdrop-blur-md rounded-full text-[#210100] flex items-center justify-center hover:scale-110 border border-white/20"><svg className="w-4 h-4 mb-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg></button>
                      </div>
                      <button className="text-white bg-white/20 hover:bg-white hover:text-black rounded-full p-2 backdrop-blur-sm transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* --- อันดับ 4-10 --- */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-black text-[#210100]">อันดับ 4 - 10</h4>
              <ScrollButtons scrollRef={recSmallScrollRef} />
            </div>
            <div ref={recSmallScrollRef} className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {otherRanks.map((movie) => (
                <div key={movie.id} onClick={() => handleMovieClick(movie)} className="snap-start min-w-35 max-w-35 relative group cursor-pointer flex flex-col">
                  <div className="w-full aspect-2/3 rounded-xl overflow-hidden shadow-sm border border-[#FECE79]/40 relative bg-gray-100 mb-2">
                    <img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    
                    <div className="absolute top-0 left-0 bg-[#210100]/90 text-white w-8 h-8 rounded-br-xl font-black flex items-center justify-center text-sm shadow-md backdrop-blur-sm z-10">
                      {movie.rank}
                    </div>
                    
                    <div className="absolute top-2 right-2 z-10">
                      <span className="bg-[#210100]/80 text-[#FECE79] px-2 py-1 rounded-md text-[10px] font-black shadow-md border border-[#FECE79]/30 backdrop-blur-sm">
                        🎯 {movie.matchPercent}% Match
                      </span>
                    </div>
                    
                    <div className="absolute bottom-2 left-0 right-0 px-2 flex justify-between z-10">
                      <button onClick={(e) => { e.stopPropagation(); handleVote(movie, 'dislike'); }} className="w-8 h-8 bg-[#8C0902]/90 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:scale-110 shadow-lg border border-white/20 transition-transform">
                        <svg className="w-4 h-4 mt-1" fill="currentColor" viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleVote(movie, 'like'); }} className="w-8 h-8 bg-[#E6A341]/90 backdrop-blur-md rounded-full text-[#210100] flex items-center justify-center hover:scale-110 shadow-lg border border-white/20 transition-transform">
                        <svg className="w-4 h-4 mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                      </button>
                    </div>

                  </div>
                  <h3 className="font-bold text-[#210100] text-xs line-clamp-2 group-hover:text-[#8C0902] transition-colors text-center px-1">{movie.title}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl font-black text-[#210100] tracking-tight">ภาพยนตร์กำลังฮิต</h2>
            <ScrollButtons scrollRef={movieScrollRef} />
          </div>
          <div ref={movieScrollRef} className="flex overflow-x-auto gap-5 pb-6 pt-2 scrollbar-hide snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {trendingMovies.map(item => (<div key={item.id} className="snap-start shrink-0"><MovieCard item={item} isTV={false} /></div>))}
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl font-black text-[#210100] tracking-tight">ซีรีส์ที่คนพูดถึงเยอะสุด</h2>
            <ScrollButtons scrollRef={tvScrollRef} />
          </div>
          <div ref={tvScrollRef} className="flex overflow-x-auto gap-5 pb-6 pt-2 scrollbar-hide snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {trendingTVs.map(item => (<div key={item.id} className="snap-start shrink-0"><MovieCard item={item} isTV={true} /></div>))}
          </div>
        </section>
      </div>

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
                  <span className="flex items-center gap-1 bg-[#E6A341]/20 px-2 py-0.5 rounded text-[#8C0902]">
                    ★ {selectedMovie.vote_average?.toFixed(1) || "N/A"}
                  </span>
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