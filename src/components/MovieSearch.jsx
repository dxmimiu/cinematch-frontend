import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { sendMessageToCineAI } from './difyService'; // 🟢 เพิ่มบรรทัดนี้เพื่อเรียกใช้ API ของ Dify

const GENRE_MAP = {
  28: "แอคชั่นบู้ล้างผลาญ", 12: "ผจญภัย", 16: "แอนิเมชัน", 35: "ตลกขบขัน", 80: "อาชญากรรม",
  99: "สารคดี", 18: "ดราม่าเข้มข้น", 10751: "ครอบครัว", 14: "แฟนตาซีเวทมนตร์", 36: "ประวัติศาสตร์",
  27: "สยองขวัญ", 10402: "มิวสิคัล", 9648: "ลึกลับซ่อนเงื่อน", 10749: "โรแมนติก", 878: "ไซไฟอวกาศ",
  10770: "ทีวีมูฟวี่", 53: "ระทึกขวัญตื่นเต้น", 10752: "สงคราม", 37: "คาวบอยตะวันตก"
};

export default function MovieSearch({ currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMovies, setSearchMovies] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [aiMessage, setAiMessage] = useState('สวัสดีค่ะ! ฉันคือ CINE AI ผู้ช่วยเลือกหนังอัจฉริยะของคุณ ลองพิมพ์บอกสไตล์ภาพยนตร์หรือความรู้สึกในตอนนี้ให้ฉันฟังสิคะ');
  const [conversationId, setConversationId] = useState("");

  const [likedMovies, setLikedMovies] = useState([]);
  const [dislikedMovies, setDislikedMovies] = useState([]);

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [detailedMovie, setDetailedMovie] = useState(null);

  useEffect(() => {
    const fetchLikes = async () => {
      const token = localStorage.getItem('cinematch_token');
      if (!token) return;
      try {
        const res = await axios.get('https://cinematch-backend-hdvz.onrender.com/api/likes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLikedMovies(res.data.liked || []);
        setDislikedMovies(res.data.disliked || []);
      } catch (err) {
        console.error("Error fetching likes", err);
      }
    };
    fetchLikes();
  }, []);

  const handleVote = async (e, movie, type) => {
    e.stopPropagation(); 
    const token = localStorage.getItem('cinematch_token');
    if (!token) {
      toast.error('กรุณาล็อกอินก่อนบันทึกความชอบ');
      return;
    }

    const filmId = movie.id;
    const filmTitle = movie.title || movie.name;
    const posterPath = movie.poster_path;

    const isCurrentlyLiked = likedMovies.some(m => m.film_id === filmId || m.id === filmId);
    const isCurrentlyDisliked = dislikedMovies.some(m => m.film_id === filmId || m.id === filmId);

    const isAddingVote = (type === 'like' && !isCurrentlyLiked) || (type === 'dislike' && !isCurrentlyDisliked);
    const isRemovingVote = (type === 'like' && isCurrentlyLiked) || (type === 'dislike' && isCurrentlyDisliked);

    let prefs = JSON.parse(localStorage.getItem('cinematch_preferences') || '{"genreWeights":{}}');
    if (!prefs.genreWeights) prefs.genreWeights = {};

    if (movie.genre_ids) {
      movie.genre_ids.forEach(id => {
        const genreName = GENRE_MAP[id];
        if (genreName) {
          if (isAddingVote) {
            if (type === 'like') prefs.genreWeights[genreName] = (prefs.genreWeights[genreName] || 0) + 2;
            else if (type === 'dislike') prefs.genreWeights[genreName] = Math.max(0, (prefs.genreWeights[genreName] || 0) - 2);
          } else if (isRemovingVote) {
            if (type === 'like') prefs.genreWeights[genreName] = Math.max(0, (prefs.genreWeights[genreName] || 0) - 2);
            else if (type === 'dislike') prefs.genreWeights[genreName] = (prefs.genreWeights[genreName] || 0) + 2;
          }
        }
      });
      localStorage.setItem('cinematch_preferences', JSON.stringify(prefs));
    }

    axios.post('https://cinematch-backend-hdvz.onrender.com/api/preferences', 
      { genreWeights: prefs.genreWeights },
      { headers: { Authorization: `Bearer ${token}` } }
    ).catch(err => console.error("Pref Sync Error:", err));

    try {
      if (type === 'like') {
        if (isCurrentlyLiked) {
          await axios.delete(`https://cinematch-backend-hdvz.onrender.com/api/likes/${filmId}`, { headers: { Authorization: `Bearer ${token}` } });
          setLikedMovies(likedMovies.filter(m => m.film_id !== filmId && m.id !== filmId));
          toast.success("นำออกจากรายการที่ชอบแล้ว");
        } else {
          await axios.post('https://cinematch-backend-hdvz.onrender.com/api/likes', 
            { 
              film_id: filmId, 
              film_title: filmTitle, 
              poster_path: posterPath, 
              type: 'like',
              media_type: movie.media_type || (movie.first_air_date ? 'tv' : 'movie'),
              genres: movie.genre_ids ? movie.genre_ids.join(',') : '',
              points: 2 
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setLikedMovies([...likedMovies, { film_id: filmId, film_title: filmTitle, poster_path: posterPath }]);
          setDislikedMovies(dislikedMovies.filter(m => m.film_id !== filmId && m.id !== filmId));
          toast.success("เพิ่มไปยังรายการที่ชอบแล้ว");
        }
      } else {
        if (isCurrentlyDisliked) {
          await axios.delete(`https://cinematch-backend-hdvz.onrender.com/api/likes/${filmId}`, { headers: { Authorization: `Bearer ${token}` } });
          setDislikedMovies(dislikedMovies.filter(m => m.film_id !== filmId && m.id !== filmId));
          toast.success("นำออกจากรายการที่ไม่ชอบแล้ว");
        } else {
          await axios.post('https://cinematch-backend-hdvz.onrender.com/api/likes', 
            { 
              film_id: filmId, 
              film_title: filmTitle, 
              poster_path: posterPath, 
              type: 'dislike',
              media_type: movie.media_type || (movie.first_air_date ? 'tv' : 'movie'),
              genres: movie.genre_ids ? movie.genre_ids.join(',') : '',
              points: 0 
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setDislikedMovies([...dislikedMovies, { film_id: filmId, film_title: filmTitle, poster_path: posterPath }]);
          setLikedMovies(likedMovies.filter(m => m.film_id !== filmId && m.id !== filmId));
          toast.success("เพิ่มไปยังรายการที่ไม่ชอบแล้ว");
        }
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const checkIsLiked = (id) => likedMovies.some(m => m.film_id === id || m.id === id);
  const checkIsDisliked = (id) => dislikedMovies.some(m => m.film_id === id || m.id === id);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const currentQuery = searchQuery;
    setSearchQuery(''); 
    setIsSearching(true);
    setHasSearched(true);
    setSearchMovies([]);

    try {
        // 🟢 ดึง ID ผู้ใช้ ถ้าไม่ได้ล็อกอินใช้ค่า 3 ไว้ก่อนตามที่คุยกัน
        const userId = currentUser?.id || 3; 

        // 🟢 1. ส่งข้อความไปหา Dify AI
        const result = await sendMessageToCineAI(currentQuery, userId, conversationId);
        
        // บันทึก conversation_id สำหรับแชทรอบหน้า
        setConversationId(result.conversationId);

        // แยกข้อความคุย กับ JSON ออกจากกัน
        const rawText = result.answer;
        const textPart = rawText.split("```json")[0].trim();
        setAiMessage(textPart || "นี่คือภาพยนตร์ที่เลือกมาแนะนำให้คุณค่ะ:");

        // ดึงเฉพาะก้อน JSON
        const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
        let aiMovies = [];

        try {
          if (jsonMatch?.[1]) {
            aiMovies = JSON.parse(jsonMatch[1].trim());
          } else {
            // รองรับกรณีที่ Dify ส่ง JSON array มาโดยไม่มี markdown code block
            const arrayMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (arrayMatch?.[0]) {
              aiMovies = JSON.parse(arrayMatch[0]);
            }
          }
        } catch (err) {
          console.error("Error parsing AI JSON", err, rawText);
          aiMovies = [];
        }

        if (!Array.isArray(aiMovies)) {
          aiMovies = [];
        }

        // 🟢 2. หาก AI ตอบกลับเป็น JSON มีรายชื่อหนัง
        if (aiMovies.length > 0) {
            const API_KEY = "181edc5801db6678de6ccb2864149a6a";
            const fetchedDetails = await Promise.all(
                aiMovies.slice(0, 3).map(async (aiMovie) => { 
                    const id = aiMovie.id;
                    try {
                        let res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&language=th-TH`);
                        let data = await res.json();
                        
                        if (data.success === false && data.status_code === 34) {
                            res = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&language=th-TH`);
                            data = await res.json();
                            if(data.id) {
                                // 🟢 แนบ reason จาก AI เข้าไปด้วย
                                return { ...data, media_type: 'tv', genre_ids: data.genres ? data.genres.map(g => g.id) : [], reason: aiMovie.reason };
                            }
                        } else if (data.id) {
                            // 🟢 แนบ reason จาก AI เข้าไปด้วย
                            return { ...data, media_type: 'movie', genre_ids: data.genres ? data.genres.map(g => g.id) : [], reason: aiMovie.reason };
                        }
                        return null;
                    } catch (err) { return null; }
                })
            );
            setSearchMovies(fetchedDetails.filter(m => m !== null && m.poster_path));
        }

    } catch (error) {
        console.error("AI Routing Fail:", error);
        toast.error("ปัญญาประดิษฐ์ประมวลผลลัพธ์ไม่สำเร็จ");
        setAiMessage("ระบบเกิดข้อผิดพลาดชั่วคราว ลองพิมพ์ใหม่อีกครั้งนะคะ");
    } finally {
        setIsSearching(false);
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

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-80px)] w-full animate-fade-in relative bg-[#FFFDF9]">
      
      <div className="w-full flex-1 flex flex-col items-center px-4 pb-32 pt-10 overflow-y-auto max-w-5xl">
        
        <div className="w-full bg-white border border-[#FECE79]/40 rounded-3xl p-6 md:p-8 shadow-[0_4px_25px_rgba(230,163,65,0.05)] mb-8 flex gap-4 items-start animate-fade-in">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-linear-to-br from-[#8C0902] to-[#B14A36] rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md shrink-0 border border-white/20">
            AI
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            <h4 className="text-xs font-black uppercase text-[#8C0902] tracking-wider">CINE AI Assistant</h4>
            <p className="text-[#210100] text-sm md:text-base font-medium leading-relaxed whitespace-pre-line">
              {aiMessage}
            </p>
          </div>
        </div>

        {!hasSearched ? (
          <div className="flex flex-col items-center justify-center text-center max-w-2xl w-full flex-1 animate-fade-in">
            <h1 className="text-2xl md:text-4xl font-black text-[#210100] tracking-tight leading-tight opacity-40">
              พิมพ์คุยที่ช่องด้านล่างเพื่อค้นหาภาพยนตร์อัจฉริยะ
            </h1>
          </div>
        ) : (
          <div className="w-full animate-fade-in">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-12 flex-1">
                <div className="w-12 h-12 border-4 border-[#FECE79] border-t-[#8C0902] rounded-full animate-spin mb-4"></div>
                <p className="text-[#B14A36] font-bold text-sm animate-pulse">กำลังประมวลผลระบบอัจฉริยะ...</p>
              </div>
            ) : searchMovies.length > 0 ? (
              <div className="w-full">
                <div className="w-full border-b border-[#FECE79]/30 pb-3 mb-6">
                  <h3 className="text-md font-black text-[#210100] uppercase tracking-wide">ภาพยนตร์ 3 เรื่องแนะนำจาก AI</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full justify-center">
                  {searchMovies.map((item) => {
                    const title = item.media_type === 'tv' ? item.name : item.title;
                    const originalTitle = item.media_type === 'tv' ? item.original_name : item.original_title;
                    const year = item.media_type === 'tv' ? item.first_air_date?.substring(0, 4) : item.release_date?.substring(0, 4);

                    return (
                      <div key={item.id} className="flex flex-col h-full group bg-white rounded-2xl p-3 shadow-[0_4px_20px_rgba(33,1,0,0.04)] border border-[#FECE79]/40 hover:shadow-md transition-shadow">
                        <div onClick={() => handleMovieClick(item)} className="relative w-full aspect-3/4 rounded-xl overflow-hidden mb-3 cursor-pointer bg-[#FFFDF9] shrink-0">
                          <img src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute top-2 right-2 bg-white/95 text-[#8C0902] text-[10px] md:text-xs font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm z-10 border border-[#FECE79]/30">
                            ★ {item.vote_average ? item.vote_average.toFixed(1) : "N/A"}
                          </div>
                          <div className="absolute bottom-2 left-0 right-0 px-2 flex justify-between z-20">
                            <button onClick={(e) => handleVote(e, item, 'dislike')} className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shadow-lg transition-transform border border-white/20 backdrop-blur-md ${checkIsDisliked(item.id) ? 'bg-[#8C0902] border-[#8C0902] text-white scale-110' : 'bg-[#8C0902]/90 text-white hover:bg-[#8C0902] hover:scale-110'}`}>
                              <svg className="w-4 h-4 md:w-5 md:h-5 mt-1" fill="currentColor" viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
                            </button>
                            <button onClick={(e) => handleVote(e, item, 'like')} className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shadow-lg transition-transform border border-white/20 backdrop-blur-md ${checkIsLiked(item.id) ? 'bg-[#E6A341] border-[#E6A341] text-[#210100] scale-110' : 'bg-[#E6A341]/90 text-[#210100] hover:bg-[#E6A341] hover:scale-110'}`}>
                              <svg className="w-4 h-4 md:w-5 md:h-5 mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col grow px-1">
                          <h3 className="font-extrabold text-[#210100] text-sm md:text-base leading-snug line-clamp-1" title={title}>{title}</h3>
                          <p className="text-[#210100]/50 text-[10px] md:text-xs truncate italic mt-0.5" title={originalTitle}>{originalTitle}</p>
                          <p className="text-[#B14A36] font-bold text-xs mt-1.5 mb-2">{year || "N/A"}</p>
                          
                          {/* 🟢 เพิ่มส่วนแสดงเหตุผลที่ AI แนะนำตรงนี้ */}
                          {item.reason && (
                            <div className="bg-[#FECE79]/15 p-2.5 rounded-lg mt-1 mb-3">
                              <p className="text-[#210100]/90 text-[11px] leading-relaxed line-clamp-3" dangerouslySetInnerHTML={{ __html: item.reason }}></p>
                            </div>
                          )}

                          <div className="mt-auto pt-2 border-t border-[#FECE79]/30 w-full">
                            <button onClick={() => handleMovieClick(item)} className="w-full bg-[#8C0902]/5 text-[#8C0902] font-black text-xs text-center hover:bg-[#8C0902] hover:text-white rounded-xl transition-all py-2">ดูรายละเอียดเจาะลึก</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center w-full animate-fade-in">
                <div className="w-16 h-16 bg-[#FECE79]/20 rounded-full flex items-center justify-center mb-4 border-2 border-[#FECE79]/50 shadow-inner">
                  <svg className="w-8 h-8 text-[#E6A341] animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-[#210100] mb-2">CINE AI กำลังรอคำตอบของคุณค่ะ</h3>
                <p className="text-[#B14A36]">อ่านข้อความทักทายด้านบน แล้วพิมพ์ตอบในช่องด้านล่างได้เลยนะคะ 👇</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-linear-to-t from-[#FFFDF9] via-[#FFFDF9] to-transparent z-30 flex justify-center pointer-events-none">
        <form onSubmit={handleSearch} className="relative w-full max-w-3xl pointer-events-auto group">
          <input 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder="พิมพ์บอกอารมณ์ของคุณให้ CINE AI ช่วยเลือกหนัง เช่น 'เหงาๆ อยากดูหนังรักหักมุม'..." 
            className="w-full bg-white border-2 border-[#FECE79] focus:border-[#8C0902] rounded-full pl-6 pr-16 py-4 text-[#210100] font-medium outline-none transition-all shadow-[0_10px_40px_rgba(0,0,0,0.06)] focus:shadow-[0_10px_40px_rgba(140,9,2,0.12)] text-base md:text-lg" 
          />
          <button 
            type="submit" 
            disabled={isSearching} 
            className="absolute right-2 top-2 bottom-2 bg-[#8C0902] hover:bg-[#210100] text-white rounded-full transition-colors flex items-center justify-center aspect-square px-3 shadow-md"
          >
            {isSearching ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" /></svg>
            )}
          </button>
        </form>
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
                <span className="inline-block bg-[#FECE79]/30 text-[#8C0902] text-xs font-bold px-2 py-1 rounded-md mb-2">
                  {selectedMovie.media_type === 'tv' ? 'TV Series' : 'Movie'}
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-[#210100] leading-tight mb-1">
                  {selectedMovie.title || selectedMovie.name}
                </h2>
                <p className="text-[#210100]/60 text-sm italic mb-3">
                  {selectedMovie.original_title || selectedMovie.original_name}
                </p>
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
                  <p className="text-xs md:text-sm text-[#210100] mb-3"><span className="font-extrabold text-[#8C0902]">ผู้กำกับ:</span> {detailedMovie.directorName}</p>
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