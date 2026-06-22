import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Collection() {
  const [likedMovies, setLikedMovies] = useState([]);
  const [dislikedMovies, setDislikedMovies] = useState([]);
  const [activeTab, setActiveTab] = useState('like');
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [detailedMovie, setDetailedMovie] = useState(null);

const fetchTmdbData = async (items) => {
    if (!items || items.length === 0) return [];
    
    const API_KEY = "181edc5801db6678de6ccb2864149a6a";
    const promises = items.map(async (item) => {
      try {
        // 1. ลองดึงแบบ Movie ก่อน
        let movieRes = await fetch(`https://api.themoviedb.org/3/movie/${item.film_id}?api_key=${API_KEY}&language=th-TH`);
        let movieData = await movieRes.json();
        
        // ตรวจสอบว่าได้ข้อมูลหนังที่ถูกต้องจริงๆ (ต้องมี title หรือ poster_path และไม่มี error)
        if (movieData && movieData.title && movieData.success !== false) {
          return { ...movieData, film_id: item.film_id, media_type: 'movie' };
        }
        
        // 2. ถ้าไม่ใช่หนัง หรือดึงแล้วไม่มีชื่อเรื่อง ให้เปลี่ยนไปดึงแบบ TV Series ทันที
        let tvRes = await fetch(`https://api.themoviedb.org/3/tv/${item.film_id}?api_key=${API_KEY}&language=th-TH`);
        let tvData = await tvRes.json();
        
        if (tvData && tvData.name && tvData.success !== false) {
          return { ...tvData, film_id: item.film_id, media_type: 'tv' };
        }
        
        return null; 
      } catch (e) {
        console.error("Error fetching TMDB item details:", e);
        return null;
      }
    });
    
    const results = await Promise.all(promises);
    return results.filter(i => i !== null); 
  };

  const loadData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('cinematch_token');
    try {
      const res = await axios.get('http://172.20.10.2:5000/api/likes', { headers: { Authorization: `Bearer ${token}` } });
      
      // ✅ แก้ไข: ข้อมูลที่ได้มาคือ Array ก้อนเดียว เราต้องแยกกรองเองว่าอันไหน Like อันไหน Dislike
      const allLikes = res.data || [];
      
      // คัดแยกและแปลงฟิลด์ movie_id ให้กลายเป็น film_id เพื่อให้ตรงกับโครงสร้างเก่า
      const likedList = allLikes
        .filter(item => item.action === 'like')
        .map(item => ({ film_id: item.movie_id }));
        
      const dislikedList = allLikes
        .filter(item => item.action === 'dislike')
        .map(item => ({ film_id: item.movie_id }));
      
      const likedWithDetails = await fetchTmdbData(likedList);
      const dislikedWithDetails = await fetchTmdbData(dislikedList);
      
      setLikedMovies(likedWithDetails);
      setDislikedMovies(dislikedWithDetails);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const removeMovie = async (film_id) => {
    const token = localStorage.getItem('cinematch_token');
    try {
      // ✅ แก้ไข: อิงตาม route จริง ถ้าจะยกเลิก เราต้องส่งค่า action เป็นการเคลียร์หรือลบทิ้ง
      // ใน server.js ที่ให้ไป ตอนนี้รองรับการ INSERT OR REPLACE 
      // เพื่อความง่าย เราใช้การยิง 'dislike' ทับ หรือคุณอาจจะต้องเพิ่ม endpoint ลบ 
      // แต่เบื้องต้น ผมจะปรับให้มันยิง 'remove' เพื่อเปลี่ยนสถานะ
      await axios.post('http://172.20.10.2:5000/api/likes', 
        { movie_id: film_id, action: 'remove' }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('นำออกจากรายการแล้ว');
      loadData(); 
    } catch (err) {
      toast.error('ลบไม่สำเร็จ');
    }
  };

  const handleMovieClick = async (item) => {
    setSelectedMovie(item); 
    setDetailedMovie(null); 

    try {
      const API_KEY = "181edc5801db6678de6ccb2864149a6a";
      const type = item.media_type;
      
      const thRes = await fetch(`https://api.themoviedb.org/3/${type}/${item.id || item.film_id}?api_key=${API_KEY}&language=th-TH&append_to_response=watch/providers,credits`);
      const thData = await thRes.json();

      let finalOverview = thData.overview;
      if (!finalOverview) {
        const enRes = await fetch(`https://api.themoviedb.org/3/${type}/${item.id || item.film_id}?api_key=${API_KEY}&language=en-US`);
        const enData = await enRes.json();
        finalOverview = enData.overview || "ไม่มีเรื่องย่อสำหรับเนื้อหานี้";
      }

      const director = thData.credits?.crew?.find(c => c.job === 'Director' || c.job === 'Executive Producer');
      const castArray = thData.credits?.cast?.slice(0, 8) || [];
      const genres = thData.genres?.map(g => g.name).join(', ') || 'ไม่ระบุ';

      const allProviders = thData.watch?.providers?.results || {};
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
        const today = new Date();
        const diffDays = Math.ceil((today - releaseDate) / (1000 * 60 * 60 * 24));
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

  const currentList = activeTab === 'like' ? likedMovies : dislikedMovies;

  const MovieCard = ({ item }) => {
    const title = item.title || item.name;
    const year = item.release_date?.substring(0, 4) || item.first_air_date?.substring(0, 4);
    
    return (
      <div className="flex flex-col h-full group bg-white rounded-2xl p-2.5 shadow-sm border border-[#FECE79]/30 hover:shadow-md transition-shadow relative">
        <div onClick={() => handleMovieClick(item)} className="relative w-full aspect-3/4 rounded-xl overflow-hidden mb-3 bg-[#FFFDF9] cursor-pointer">
          <img src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          
          <div className="absolute top-2 right-2 bg-[#210100]/80 backdrop-blur-sm text-[#FECE79] text-xs font-black px-2 py-1 rounded-md flex items-center gap-1 z-10">
             ★ {item.vote_average ? item.vote_average.toFixed(1) : "N/A"}
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); removeMovie(item.film_id); }} 
            className="absolute top-2 left-2 bg-[#8C0902]/90 hover:bg-[#8C0902] text-white w-7 h-7 rounded-full flex justify-center items-center z-10 backdrop-blur-sm transition-transform hover:scale-110 shadow-md"
            title="นำออกจากคอลเลกชัน"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col px-1 grow">
          <h3 className="font-extrabold text-[#210100] text-sm leading-snug line-clamp-2" title={title}>{title}</h3>
          <p className="text-[#B14A36] font-bold text-xs mt-1">{year || "N/A"}</p>
          <div className="mt-auto pt-2 border-t border-[#FECE79]/30 w-full text-center">
            <button onClick={() => handleMovieClick(item)} className="text-[#8C0902] font-extrabold text-xs hover:text-[#B14A36] transition-colors py-1 w-full">
              ดูรายละเอียด
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pt-10 animate-fade-in min-h-screen pb-20">
      <h1 className="text-3xl font-black text-[#8C0902] mb-6">คอลเลกชันของคุณ</h1>
      
      <div className="flex bg-[#FFFDF9] border border-[#FECE79] rounded-xl p-1 shadow-inner mb-8 max-w-sm">
        <button onClick={() => setActiveTab('like')} className={`flex-1 py-2.5 rounded-lg text-sm font-extrabold transition-all ${activeTab === 'like' ? 'bg-[#8C0902] text-white shadow-md' : 'text-[#B14A36] hover:bg-[#FECE79]/30'}`}>รายการโปรด ({likedMovies.length})</button>
        <button onClick={() => setActiveTab('dislike')} className={`flex-1 py-2.5 rounded-lg text-sm font-extrabold transition-all ${activeTab === 'dislike' ? 'bg-[#210100] text-white shadow-md' : 'text-[#B14A36] hover:bg-[#FECE79]/30'}`}>ไม่ชอบ ({dislikedMovies.length})</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-[#FECE79] border-t-[#8C0902] rounded-full animate-spin"></div></div>
      ) : currentList.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {currentList.map((movie) => <MovieCard key={movie.film_id} item={movie} />)}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-[#FECE79]/40 max-w-4xl mx-auto text-[#B14A36] font-bold">
          ไม่มีรายการในหมวดหมู่นี้
        </div>
      )}

      {selectedMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-[#210100]/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FFFDF9] rounded-3xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl relative flex flex-col md:flex-row transform transition-all scale-100">
            <button onClick={() => setSelectedMovie(null)} className="absolute top-4 right-4 bg-white/90 hover:bg-white rounded-full p-2 z-30 shadow-md transition-transform hover:scale-110">
              <svg className="w-5 h-5 text-[#8C0902]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <div className="w-full md:w-[35%] h-64 md:h-auto shrink-0 relative bg-[#FECE79]/20">
              <img src={`https://image.tmdb.org/t/p/w500${selectedMovie.poster_path}`} alt={selectedMovie.title || selectedMovie.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-6 md:p-8 w-full md:w-[65%] flex flex-col overflow-y-auto custom-scrollbar">
              <div className="mb-4">
                <span className="inline-block bg-[#FECE79]/30 text-[#8C0902] text-xs font-bold px-2 py-1 rounded-md mb-2">{selectedMovie.media_type === 'tv' ? 'TV Series' : 'Movie'}</span>
                <h2 className="text-3xl md:text-4xl font-black text-[#210100] leading-tight mb-1">{selectedMovie.title || selectedMovie.name}</h2>
                <p className="text-[#210100]/60 text-sm italic mb-2">{selectedMovie.original_title || selectedMovie.original_name}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-[#B14A36]">
                  <span>{selectedMovie.release_date?.substring(0,4) || selectedMovie.first_air_date?.substring(0,4) || "N/A"}</span><span>•</span>
                  <span>{detailedMovie ? formatRuntime(detailedMovie) : "กำลังคำนวณเวลา..."}</span><span>•</span>
                  <span className="flex items-center gap-1 bg-[#E6A341]/20 px-2 py-0.5 rounded text-[#8C0902]">
                    ★ {selectedMovie.vote_average?.toFixed(1) || "N/A"}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 min-h-0 custom-scrollbar mb-4">
                <p className="text-[#210100]/80 text-sm md:text-base leading-relaxed font-medium">{detailedMovie ? detailedMovie.displayOverview : (selectedMovie.overview || "กำลังโหลดข้อมูลเจาะลึก...")}</p>
              </div>
              {detailedMovie && (
                <div className="shrink-0 mb-4 bg-[#FECE79]/10 p-3.5 rounded-xl border border-[#FECE79]/30">
                  <p className="text-xs md:text-sm text-[#210100] mb-2"><span className="font-extrabold text-[#8C0902]">หมวดหมู่:</span> {detailedMovie.genreNames}</p>
                  {selectedMovie.media_type !== 'tv' && <p className="text-xs md:text-sm text-[#210100] mb-3"><span className="font-extrabold text-[#8C0902]">ผู้กำกับ:</span> {detailedMovie.directorName}</p>}
                  <p className="text-xs md:text-sm font-extrabold text-[#8C0902] mb-2">นักแสดงนำ:</p>
                  <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
                    {detailedMovie.cast.map(actor => (
                      <div key={actor.id} className="flex flex-col items-center w-15 shrink-0 group">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white mb-1.5 border border-[#FECE79] shadow-sm group-hover:border-[#E6A341] transition-colors">
                          {actor.profile_path ? (
                            <img src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} alt={actor.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#8C0902]/30 bg-[#FECE79]/20">
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-[#210100] text-center leading-tight line-clamp-2">{actor.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="shrink-0 pt-4 border-t border-[#FECE79]/40">
                <div className="mb-4">
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
        </div>
      )}
    </div>
  );
}