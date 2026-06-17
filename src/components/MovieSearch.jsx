import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SORT_OPTIONS = [
  { id: 'popularity.desc', name: 'กำลังฮิตที่สุด' },
  { id: 'vote_average.desc', name: 'คะแนนรีวิวสูงสุด' },
  { id: 'primary_release_date.desc', name: 'ใหม่ล่าสุด' },
];

export default function MovieSearch({ currentUser }) {
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [providersList, setProvidersList] = useState([]);
  const [genresList, setGenresList] = useState([]); 
  
  const [page, setPage] = useState(1);
  const [mediaType, setMediaType] = useState('movie'); 
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('popularity.desc');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchMovies, setSearchMovies] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [detailedMovie, setDetailedMovie] = useState(null);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const API_KEY = "181edc5801db6678de6ccb2864149a6a";
        const res = await fetch(`https://api.themoviedb.org/3/watch/providers/movie?api_key=${API_KEY}&language=th-TH&watch_region=TH`);
        const data = await res.json();
        const formattedProviders = [
          { provider_id: '', provider_name: 'สตรีมมิ่งทั้งหมด' },
          ...(data.results?.sort((a, b) => a.display_priority - b.display_priority) || [])
        ];
        setProvidersList(formattedProviders);
      } catch (error) {
        console.error("Error fetching providers:", error);
      }
    };
    fetchProviders();
  }, []);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const API_KEY = "181edc5801db6678de6ccb2864149a6a";
        const res = await fetch(`https://api.themoviedb.org/3/genre/${mediaType}/list?api_key=${API_KEY}&language=th-TH`);
        const data = await res.json();
        const formattedGenres = [
          { id: '', name: 'ทุกหมวดหมู่' },
          ...(data.genres || [])
        ];
        setGenresList(formattedGenres);
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };
    fetchGenres();
  }, [mediaType]); 

  useEffect(() => {
    const fetchCatalog = async () => {
      if (hasSearched) return; 

      if (page === 1) setIsLoading(true);
      else setIsLoadingMore(true);

      try {
        const API_KEY = "181edc5801db6678de6ccb2864149a6a";
        let url = `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${API_KEY}&language=th-TH&sort_by=${sortBy}&page=${page}&watch_region=TH`;
        if (selectedProvider) url += `&with_watch_providers=${selectedProvider}`;
        if (selectedGenre) url += `&with_genres=${selectedGenre}`;
        if (sortBy === 'vote_average.desc') url += `&vote_count.gte=500`;

        const res = await fetch(url);
        const data = await res.json();
        const formatted = data.results.filter(item => item.poster_path).map(item => ({...item, media_type: mediaType}));
        
        if (page === 1) setMovies(formatted);
        else setMovies(prev => [...prev, ...formatted]);
      } catch(e) {
        console.error("Error fetching catalog", e);
      } finally { 
        setIsLoading(false); 
        setIsLoadingMore(false);
      }
    };
    fetchCatalog();
  }, [mediaType, selectedProvider, selectedGenre, sortBy, page, hasSearched]);

const handleVote = async (movie, type) => {
    const token = localStorage.getItem('cinematch_token');
    if (!token) {
      toast.error('กรุณาล็อกอินก่อนบันทึกความชอบครับ');
      return;
    }
    
    try {
      await axios.post('http://localhost:5000/api/likes', 
        {
          film_id: movie.id,
          film_title: movie.title || movie.name,
          type: type
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      // เปลี่ยนจาก alert เป็น toast
      if (type === 'like') {
        toast.success('เพิ่มลงในรายการโปรดแล้ว! ❤️');
      } else {
        toast.success('ซ่อนหนังเรื่องนี้แล้ว 👎');
      }
    } catch (error) {
      console.error('Vote Error:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setHasSearched(false);
      setSearchMovies([]);
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    try {
      const API_KEY = "181edc5801db6678de6ccb2864149a6a";
      const searchRes = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&language=th-TH&query=${encodeURIComponent(searchQuery)}&page=1`);
      const searchData = await searchRes.json();
      const formattedMovies = searchData.results
        .filter(item => item.poster_path && (item.media_type === 'movie' || item.media_type === 'tv'))
        .map(item => ({...item}));
      setSearchMovies(formattedMovies);
    } catch (error) {
      console.error("Error searching movies:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMediaTypeChange = (type) => { setMediaType(type); setSelectedGenre(''); setPage(1); };
  const handleProviderChange = (id) => { setSelectedProvider(String(id)); setPage(1); };
  const handleGenreChange = (id) => { setSelectedGenre(String(id)); setPage(1); };
  const handleSortChange = (e) => { setSortBy(e.target.value); setPage(1); };

  const handleMovieClick = async (item) => {
    setSelectedMovie(item); 
    setDetailedMovie(null); 
    try {
      const API_KEY = "181edc5801db6678de6ccb2864149a6a";
      const type = item.media_type;
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

  return (
    <div className="flex flex-col items-center px-4 md:px-6 pt-10 pb-20 w-full animate-fade-in relative min-h-screen">
      
      <div className="w-full max-w-7xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#8C0902] tracking-tight mb-2">สำรวจภาพยนตร์</h1>
          <p className="text-[#B14A36] font-medium text-sm">ค้นหาภาพยนตร์และซีรีส์ตามความสนใจของคุณ</p>
        </div>
        
        <form onSubmit={handleSearch} className="relative w-full md:max-w-md group">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="พิมพ์ชื่อภาพยนตร์ หรือซีรีส์..." className="w-full bg-white border-2 border-[#FECE79] focus:border-[#E6A341] rounded-full pl-5 pr-28 py-3 text-[#210100] font-medium text-sm transition-all shadow-sm outline-none" />
          <button type="submit" disabled={isSearching} className="absolute right-1.5 top-1.5 bottom-1.5 bg-[#8C0902] hover:bg-[#210100] text-white font-bold px-4 rounded-full transition-colors flex items-center gap-1.5 text-sm">
            {isSearching ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <> <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg><span>ค้นหา</span></>}
          </button>
        </form>
      </div>

      {hasSearched ? (
        <section className="w-full max-w-7xl animate-fade-in">
          <div className="flex items-center justify-between mb-6 border-b border-[#FECE79]/30 pb-4">
            <h2 className="text-2xl font-black text-[#210100] tracking-tight">ผลการค้นหา: <span className="text-[#8C0902]">"{searchQuery}"</span></h2>
            <button onClick={() => { setHasSearched(false); setSearchQuery(''); }} className="text-sm font-bold text-[#B14A36] hover:text-[#8C0902] transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>ปิดการค้นหา (กลับสู่โหมดฟิลเตอร์)
            </button>
          </div>
          {isSearching ? (
            <div className="flex justify-center py-20 w-full"><div className="w-10 h-10 border-4 border-[#FECE79] border-t-[#8C0902] rounded-full animate-spin"></div></div>
          ) : searchMovies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {searchMovies.map((item) => {
                const title = item.media_type === 'tv' ? item.name : item.title;
                const originalTitle = item.media_type === 'tv' ? item.original_name : item.original_title;
                const year = item.media_type === 'tv' ? item.first_air_date?.substring(0, 4) : item.release_date?.substring(0, 4);

                return (
                  <div key={item.id} className="flex flex-col h-full group bg-white rounded-2xl p-2.5 shadow-[0_4px_15px_rgba(33,1,0,0.03)] border border-[#FECE79]/30 hover:shadow-md transition-shadow">
                    <div onClick={() => handleMovieClick(item)} className="relative w-full aspect-3/4 rounded-xl overflow-hidden mb-3 cursor-pointer bg-[#FFFDF9] shrink-0">
                      <img src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-2 right-2 bg-[#210100]/80 backdrop-blur-sm text-[#FECE79] text-[10px] md:text-xs font-black px-2 py-0.5 rounded-md flex items-center gap-1 z-10">
                        <svg className="w-3 h-3 text-[#E6A341]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>{item.vote_average ? item.vote_average.toFixed(1) : "N/A"}
                      </div>
                      <div className="absolute bottom-2 left-0 right-0 px-2 flex justify-between z-20">
                        <button onClick={(e) => { e.stopPropagation(); handleVote(item, 'dislike'); }} className="w-8 h-8 md:w-9 md:h-9 bg-[#8C0902]/90 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:scale-110 hover:bg-[#8C0902] shadow-lg transition-transform border border-white/20">
                          <svg className="w-4 h-4 md:w-5 md:h-5 mt-1" fill="currentColor" viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleVote(item, 'like'); }} className="w-8 h-8 md:w-9 md:h-9 bg-[#E6A341]/90 backdrop-blur-md rounded-full text-[#210100] flex items-center justify-center hover:scale-110 hover:bg-[#E6A341] shadow-lg transition-transform border border-white/20">
                          <svg className="w-4 h-4 md:w-5 md:h-5 mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col grow px-1">
                      <h3 className="font-extrabold text-[#210100] text-[13px] md:text-sm leading-snug line-clamp-2" title={title}>{title}</h3>
                      <p className="text-[#210100]/50 text-[10px] md:text-xs truncate italic mt-0.5" title={originalTitle}>{originalTitle}</p>
                      <p className="text-[#B14A36] font-bold text-[11px] md:text-xs mt-1.5 mb-3">{year || "N/A"}</p>
                      <div className="mt-auto pt-2 border-t border-[#FECE79]/30 w-full">
                        <button onClick={() => handleMovieClick(item)} className="w-full text-[#8C0902] font-extrabold text-xs text-center hover:text-[#B14A36] transition-colors py-1">ดูรายละเอียด</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 text-[#B14A36] font-bold text-lg w-full bg-white rounded-3xl border border-[#FECE79]/40">ไม่พบผลลัพธ์ที่คุณค้นหา</div>
          )}
        </section>
      ) : (
        <>
          <div className="w-full max-w-7xl bg-white border border-[#FECE79]/40 rounded-3xl p-5 mb-8 shadow-sm flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#FECE79]/30 pb-5">
              <div className="flex bg-[#FFFDF9] border border-[#FECE79] rounded-xl p-1 shadow-inner">
                <button onClick={() => handleMediaTypeChange('movie')} className={`px-6 py-2 rounded-lg text-sm font-extrabold transition-all ${mediaType === 'movie' ? 'bg-[#8C0902] text-white shadow-md' : 'text-[#B14A36] hover:bg-[#FECE79]/30'}`}>ภาพยนตร์</button>
                <button onClick={() => handleMediaTypeChange('tv')} className={`px-6 py-2 rounded-lg text-sm font-extrabold transition-all ${mediaType === 'tv' ? 'bg-[#8C0902] text-white shadow-md' : 'text-[#B14A36] hover:bg-[#FECE79]/30'}`}>ซีรีส์</button>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-[#210100] font-bold text-xs uppercase tracking-wider shrink-0">จัดเรียง:</span>
                <select value={sortBy} onChange={handleSortChange} className="bg-[#FFFDF9] border border-[#FECE79] text-[#210100] text-sm font-bold rounded-xl px-4 py-2 outline-none focus:border-[#E6A341] cursor-pointer w-full sm:w-auto shadow-sm appearance-none">
                  {SORT_OPTIONS.map(opt => (<option key={opt.id} value={opt.id}>{opt.name}</option>))}
                </select>
              </div>
            </div>
            
            <div>
              <span className="text-[#210100] font-bold text-xs uppercase tracking-wider mb-2 block">แพลตฟอร์มสตรีมมิ่ง:</span>
              <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                {providersList.map(prov => (
                  <button key={prov.provider_id} onClick={() => handleProviderChange(prov.provider_id)} className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 shrink-0 transition-all flex items-center gap-1.5 ${selectedProvider === String(prov.provider_id) ? 'bg-[#8C0902] text-white border-[#8C0902] shadow-sm' : 'bg-[#FFFDF9] text-[#210100]/70 border-gray-200 hover:border-[#FECE79]'}`}>
                    {prov.logo_path && <img src={`https://image.tmdb.org/t/p/w45${prov.logo_path}`} alt={prov.provider_name} className="w-4 h-4 rounded-sm object-cover" />}
                    {prov.provider_name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[#210100] font-bold text-xs uppercase tracking-wider mb-2 block">หมวดหมู่:</span>
              <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                {genresList.map(genre => (
                  <button key={genre.id} onClick={() => handleGenreChange(genre.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 shrink-0 transition-all ${selectedGenre === String(genre.id) ? 'bg-[#E6A341] text-[#210100] border-[#E6A341] shadow-sm' : 'bg-transparent text-[#210100]/60 border-gray-200 hover:border-[#FECE79]'}`}>
                    {genre.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20 w-full"><div className="w-12 h-12 border-4 border-[#FECE79] border-t-[#8C0902] rounded-full animate-spin"></div></div>
          ) : movies.length > 0 ? (
            <div className="flex flex-col items-center w-full">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 max-w-7xl w-full">
                {movies.map((item) => {
                  const title = item.media_type === 'tv' ? item.name : item.title;
                  const originalTitle = item.media_type === 'tv' ? item.original_name : item.original_title;
                  const year = item.media_type === 'tv' ? item.first_air_date?.substring(0, 4) : item.release_date?.substring(0, 4);

                  return (
                    <div key={item.id} className="flex flex-col h-full group bg-white rounded-2xl p-2.5 shadow-[0_4px_15px_rgba(33,1,0,0.03)] border border-[#FECE79]/30 hover:shadow-md transition-shadow">
                      <div onClick={() => handleMovieClick(item)} className="relative w-full aspect-3/4 rounded-xl overflow-hidden mb-3 cursor-pointer bg-[#FFFDF9] shrink-0">
                        <img src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute top-2 right-2 bg-[#210100]/80 backdrop-blur-sm text-[#FECE79] text-[10px] md:text-xs font-black px-2 py-0.5 rounded-md flex items-center gap-1 z-10">
                          <svg className="w-3 h-3 text-[#E6A341]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>{item.vote_average ? item.vote_average.toFixed(1) : "N/A"}
                        </div>
                        <div className="absolute bottom-2 left-0 right-0 px-2 flex justify-between z-20">
                          <button onClick={(e) => { e.stopPropagation(); handleVote(item, 'dislike'); }} className="w-8 h-8 md:w-9 md:h-9 bg-[#8C0902]/90 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:scale-110 hover:bg-[#8C0902] shadow-lg transition-transform border border-white/20">
                            <svg className="w-4 h-4 md:w-5 md:h-5 mt-1" fill="currentColor" viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleVote(item, 'like'); }} className="w-8 h-8 md:w-9 md:h-9 bg-[#E6A341]/90 backdrop-blur-md rounded-full text-[#210100] flex items-center justify-center hover:scale-110 hover:bg-[#E6A341] shadow-lg transition-transform border border-white/20">
                            <svg className="w-4 h-4 md:w-5 md:h-5 mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col grow px-1">
                        <h3 className="font-extrabold text-[#210100] text-[13px] md:text-sm leading-snug line-clamp-2" title={title}>{title}</h3>
                        <p className="text-[#210100]/50 text-[10px] md:text-xs truncate italic mt-0.5" title={originalTitle}>{originalTitle}</p>
                        <p className="text-[#B14A36] font-bold text-[11px] md:text-xs mt-1.5 mb-3">{year || "N/A"}</p>
                        <div className="mt-auto pt-2 border-t border-[#FECE79]/30 w-full">
                          <button onClick={() => handleMovieClick(item)} className="w-full text-[#8C0902] font-extrabold text-xs text-center hover:text-[#B14A36] transition-colors py-1">ดูรายละเอียด</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-12 mb-8">
                <button onClick={() => setPage(p => p + 1)} disabled={isLoadingMore} className="bg-white border-2 border-[#8C0902] text-[#8C0902] hover:bg-[#8C0902] hover:text-white font-extrabold py-3 px-10 rounded-full transition-all flex items-center gap-3 shadow-sm">
                  {isLoadingMore ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>}
                  {isLoadingMore ? 'กำลังดึงข้อมูล...' : 'โหลดเพิ่มเติม'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-[#B14A36] font-bold text-lg w-full bg-white rounded-3xl border border-[#FECE79]/40 max-w-7xl">ไม่พบเนื้อหาที่ตรงกับตัวกรองของคุณ 😥</div>
          )}
        </>
      )}

      {/* Modal ป็อปอัป */}
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
                    <svg className="w-4 h-4 text-[#E6A341]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> {selectedMovie.vote_average?.toFixed(1) || "N/A"}
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