import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// แมปเปอร์สำหรับแปลง ID เป็นชื่อหมวดหมู่
const GENRE_MAP = {
  28: "แอคชั่น", 12: "ผจญภัย", 16: "แอนิเมชัน", 35: "ตลก", 80: "อาชญากรรม",
  99: "สารคดี", 18: "ดราม่า", 10751: "ครอบครัว", 14: "แฟนตาซี", 36: "ประวัติศาสตร์",
  27: "สยองขวัญ", 10402: "มิวสิคัล", 9648: "ลึกลับ", 10749: "โรแมนติก", 878: "ไซไฟ",
  10770: "ทีวีมูฟวี่", 53: "ระทึกขวัญ", 10752: "สงคราม", 37: "คาวบอย"
};

export default function Collection({ currentUser }) {
  const [likedMovies, setLikedMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [detailedMovie, setDetailedMovie] = useState(null);

  // 1. ดึงข้อมูลหนังที่กด Like ไว้จากฐานข้อมูล
  useEffect(() => {
    const fetchLikes = async () => {
      try {
        const token = localStorage.getItem('cinematch_token');
        if (!token) {
          setIsLoading(false);
          return;
        }
        const res = await axios.get('https://cinematch-backend-hdvz.onrender.com/api/likes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        // กรองเอาเฉพาะที่ action เป็น 'like' มาแสดง
        const onlyLikes = res.data.filter(item => item.action === 'like');
        setLikedMovies(onlyLikes);
      } catch (err) {
        console.error("Error fetching likes", err);
        toast.error("ดึงข้อมูลคอลเลกชันไม่สำเร็จ");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLikes();
  }, []);

  // 2. ฟังก์ชันลบหนังออกจากคอลเลกชัน และหักคะแนนคืน
  const handleRemoveFromCollection = async (e, item) => {
    if (e) e.stopPropagation(); // ป้องกันไม่ให้ทะลุไปเปิด Modal Detail

    try {
        const token = localStorage.getItem('cinematch_token');
        if (!token) {
            toast.error("กรุณาล็อกอินก่อนใช้งาน");
            return;
        }

        // แปลง ID ให้ตรงกับฐานข้อมูล
        const rawId = item.id || item.movie_id;
        const cleanId = String(rawId).replace(/^(mv-|tv-)/, '');

        // 🟢 สั่งลบข้อมูลออกจากตาราง user_likes ก่อน
        await axios.delete(`https://cinematch-backend-hdvz.onrender.com/api/likes/${cleanId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // 🟢 หักคะแนน 5 แต้มคืน ใน user_preferences
        if (item.genres) {
            // เช็คว่า genres ถูกเก็บมาเป็นแบบไหนแล้วแปลงให้เป็น Array
            let genreIds = [];
            try {
                genreIds = typeof item.genres === 'string' && item.genres.includes('[') 
                           ? JSON.parse(item.genres) 
                           : (typeof item.genres === 'string' ? item.genres.split(',') : item.genres);
            } catch (err) {
                genreIds = [];
            }

            let prefs = JSON.parse(localStorage.getItem('cinematch_preferences') || '{"genreWeights":{}}');
            
            if (prefs.genreWeights && genreIds.length > 0) {
                genreIds.forEach(id => {
                    const genreName = GENRE_MAP[typeof id === 'string' ? id.trim() : id]; 
                    if (genreName && prefs.genreWeights[genreName]) {
                        // หักออก 5 แต้ม แต่ไม่ให้คะแนนติดลบ
                        prefs.genreWeights[genreName] = Math.max(0, prefs.genreWeights[genreName] - 5);
                    }
                });
                
                // อัปเดตลง LocalStorage และยิงขึ้น Cloud
                localStorage.setItem('cinematch_preferences', JSON.stringify(prefs));
                await axios.post('https://cinematch-backend-hdvz.onrender.com/api/preferences', 
                    { genreWeights: prefs.genreWeights },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
        }

        // 🟢 อัปเดตหน้าจอ เตะการ์ดออกจากหน้า Collection ทันที
        setLikedMovies(prev => prev.filter(m => String(m.movie_id) !== cleanId));
        toast.success("นำออกจากคอลเลกชัน และหักคะแนนคืนเรียบร้อย");

    } catch (error) {
        console.error("Remove Error:", error);
        toast.error("เกิดข้อผิดพลาดในการลบข้อมูล");
    }
  };

  // 3. ฟังก์ชันเปิดดูรายละเอียดหนัง
  const handleMovieClick = async (item) => {
    setSelectedMovie(item); 
    setDetailedMovie(null); 
    try {
      const API_KEY = "181edc5801db6678de6ccb2864149a6a";
      const type = item.media_type || 'movie';
      const cleanId = String(item.movie_id || item.id).replace(/^(mv-|tv-)/, '');

      const thRes = await fetch(`https://api.themoviedb.org/3/${type}/${cleanId}?api_key=${API_KEY}&language=th-TH&append_to_response=watch/providers,credits`);
      const thData = await thRes.json();

      let finalOverview = thData.overview;
      if (!finalOverview) {
        const enRes = await fetch(`https://api.themoviedb.org/3/${type}/${cleanId}?api_key=${API_KEY}&language=en-US`);
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

      setDetailedMovie({
        ...thData, media_type: type, displayOverview: finalOverview, providers: mergedProviders,
        directorName: director ? director.name : 'ไม่ระบุ', cast: castArray, genreNames: genres
      });
    } catch (error) {
      console.error("Error fetching details", error);
    }
  };

  const formatRuntime = (movie) => {
    if (movie.media_type === 'tv') {
      const seasons = movie.number_of_seasons ? `${movie.number_of_seasons} ซีซัน` : '';
      const epTime = movie.episode_run_time && movie.episode_run_time[0] ? `(${movie.episode_run_time[0]} นาที)` : '';
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
      <div className="w-full flex-1 flex flex-col items-center px-4 py-10 overflow-y-auto max-w-5xl">
        
        <div className="w-full border-b border-[#FECE79]/30 pb-3 mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black text-[#8C0902] uppercase tracking-wide">คอลเลกชันของฉัน</h2>
            <p className="text-sm text-[#210100]/60 font-medium">ภาพยนตร์และซีรีส์ที่คุณชื่นชอบทั้งหมด</p>
          </div>
          <span className="text-sm font-bold text-[#E6A341] bg-[#FECE79]/20 px-3 py-1 rounded-lg">
            {likedMovies.length} รายการ
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 flex-1">
            <div className="w-12 h-12 border-4 border-[#FECE79] border-t-[#8C0902] rounded-full animate-spin mb-4"></div>
            <p className="text-[#B14A36] font-bold text-sm animate-pulse">กำลังดึงข้อมูลคอลเลกชัน...</p>
          </div>
        ) : likedMovies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 flex-1 opacity-70">
            <svg className="w-20 h-20 text-[#FECE79] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <h3 className="text-xl font-bold text-[#8C0902] mb-2">ยังไม่มีรายการโปรด</h3>
            <p className="text-[#210100]/60">ลองค้นหาและกด Like ภาพยนตร์ที่คุณชอบดูสิ!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full justify-center">
            {likedMovies.map((item) => (
              <div key={item.id} className="flex flex-col h-full group bg-white rounded-2xl p-3 shadow-[0_4px_20px_rgba(33,1,0,0.04)] border border-[#FECE79]/40 hover:shadow-md transition-shadow">
                <div onClick={() => handleMovieClick(item)} className="relative w-full aspect-2/3 rounded-xl overflow-hidden mb-3 cursor-pointer bg-[#FFFDF9] shrink-0">
                  {item.poster_path ? (
                    <img src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} alt={item.movie_title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#FECE79]/20 text-[#8C0902]/50">
                      <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      <span className="text-xs font-bold">ไม่มีรูปภาพ</span>
                    </div>
                  )}
                  
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
                     <div className="bg-white/95 text-[#8C0902] text-[10px] md:text-xs font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm border border-[#FECE79]/30 uppercase">
                       {item.media_type === 'tv' ? 'TV Series' : 'Movie'}
                     </div>
                  </div>

                  <div className="absolute top-2 left-2 z-20">
                    <button onClick={(e) => handleRemoveFromCollection(e, item)} className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shadow-lg transition-transform border border-white/20 backdrop-blur-md bg-white/90 text-red-500 hover:bg-red-50 hover:text-red-600 hover:scale-110">
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex flex-col grow px-1">
                  <h3 className="font-extrabold text-[#210100] text-sm md:text-base leading-snug line-clamp-2 mb-2" title={item.movie_title}>{item.movie_title}</h3>
                  <div className="mt-auto pt-2 border-t border-[#FECE79]/30 w-full">
                    <button onClick={() => handleMovieClick(item)} className="w-full bg-[#8C0902]/5 text-[#8C0902] font-black text-xs text-center hover:bg-[#8C0902] hover:text-white rounded-xl transition-all py-2">ดูรายละเอียดเจาะลึก</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Detail */}
      {selectedMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-[#210100]/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FFFDF9] rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col md:flex-row transform transition-all scale-100">
            <button onClick={() => setSelectedMovie(null)} className="absolute top-4 right-4 bg-white/90 hover:bg-white rounded-full p-2 z-30 shadow-md transition-transform hover:scale-110">
              <svg className="w-5 h-5 text-[#8C0902]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <div className="w-full md:w-[35%] h-64 md:h-auto shrink-0 relative bg-[#FECE79]/20">
              <img src={`https://image.tmdb.org/t/p/w500${selectedMovie.poster_path}`} alt={selectedMovie.movie_title} className="w-full h-full object-cover" />
            </div>
            
            <div className="w-full md:w-[65%] p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar">
              <div className="mb-4">
                <div className="flex gap-2 mb-2 items-center">
                  <span className="inline-block bg-[#FECE79]/30 text-[#8C0902] text-xs font-bold px-2 py-1 rounded-md uppercase">
                    {selectedMovie.media_type === 'tv' ? 'TV Series' : 'Movie'}
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-[#210100] leading-tight mb-1">{selectedMovie.movie_title || detailedMovie?.title || detailedMovie?.name}</h2>
                <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-[#B14A36] mt-2">
                  <span>{detailedMovie ? formatRuntime(detailedMovie) : "กำลังคำนวณเวลา..."}</span>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-[#210100]/80 text-sm md:text-base leading-relaxed font-medium">{detailedMovie ? detailedMovie.displayOverview : "กำลังโหลดข้อมูลเนื้อเรื่อง..."}</p>
              </div>

              {detailedMovie && (
                <div className="mb-6 bg-[#FECE79]/10 p-4 rounded-xl border border-[#FECE79]/30">
                  <p className="text-xs md:text-sm text-[#210100] mb-2"><span className="font-extrabold text-[#8C0902]">หมวดหมู่:</span> {detailedMovie.genreNames}</p>
                  <p className="text-xs md:text-sm text-[#210100] mb-3"><span className="font-extrabold text-[#8C0902]">ผู้กำกับ/ผู้สร้าง:</span> {detailedMovie.directorName}</p>
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
                      {(detailedMovie.providers.flatrate.length > 0 || detailedMovie.providers.rent.length > 0 || detailedMovie.providers.buy.length > 0) ? (
                        ['flatrate', 'rent', 'buy'].map(type => 
                          detailedMovie.providers[type].map(provider => (
                            <div key={provider.provider_id + type} className="flex items-center gap-1.5 bg-[#FFFDF9] border border-[#FECE79]/50 rounded-lg p-1.5 pr-3 shadow-sm" title={`${provider.provider_name} (${type})`}>
                              <img src={`https://image.tmdb.org/t/p/original${provider.logo_path}`} className="w-7 h-7 rounded-md object-cover" alt={provider.provider_name}/>
                              <span className="text-[10px] font-bold text-[#210100] capitalize">{type === 'flatrate' ? 'สตรีม' : type === 'rent' ? 'เช่า' : 'ซื้อ'}</span>
                            </div>
                          ))
                        )
                      ) : (<p className="text-xs text-[#B14A36] font-medium bg-[#B14A36]/10 inline-block px-3 py-1.5 rounded-lg">ไม่มีข้อมูลสตรีมมิ่งในภูมิภาคของคุณ</p>)}
                    </>
                  ) : <p className="text-xs text-[#E6A341] animate-pulse">กำลังตรวจสอบช่องทางรับชม...</p>}
                </div>
                <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent((selectedMovie.movie_title) + ' official trailer')}`} target="_blank" rel="noopener noreferrer" className="w-full bg-[#8C0902] hover:bg-[#210100] text-white font-bold py-4 rounded-xl text-center transition-all shadow-md flex items-center justify-center gap-2 hover:-translate-y-1">
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