import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const GENRE_MAP = {
  28: "แอคชั่น", 12: "ผจญภัย", 16: "แอนิเมชัน", 35: "ตลก", 80: "อาชญากรรม",
  99: "สารคดี", 18: "ดราม่า", 10751: "ครอบครัว", 14: "แฟนตาซี", 36: "ประวัติศาสตร์",
  27: "สยองขวัญ", 10402: "มิวสิคัล", 9648: "ลึกลับ", 10749: "โรแมนติก", 878: "ไซไฟ",
  10770: "ทีวีมูฟวี่", 53: "ระทึกขวัญ", 10752: "สงคราม", 37: "คาวบอย"
};

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const [selectedMovie, setSelectedMovie] = useState(null);
    const [detailedMovie, setDetailedMovie] = useState(null);

    // เก็บสถานะ Like / Dislike เพื่อให้ handleVote อัปเดตหน้าจอได้
    const [likedMovies, setLikedMovies] = useState([]);
    const [dislikedMovies, setDislikedMovies] = useState([]);

    // โหลดสถานะ Like / Dislike เดิมจาก Backend
    useEffect(() => {
        const loadUserVotes = async () => {
            const token = localStorage.getItem('cinematch_token');
            if (!token) return;

            try {
                const response = await axios.get(
                    'https://cinematch-backend-hdvz.onrender.com/api/likes',
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const rows = Array.isArray(response.data) ? response.data : [];
                setLikedMovies(rows.filter((item) => item.action === 'like'));
                setDislikedMovies(rows.filter((item) => item.action === 'dislike'));
            } catch (error) {
                console.error('Error loading SearchPage votes:', error);
            }
        };

        loadUserVotes();
    }, []);

    // ป้องกันการยิง API ถี่เกินไปตอนพิมพ์ (Debounce)
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (query.trim()) {
                handleSearch(query);
            } else {
                setResults([]);
                setHasSearched(false);
            }
        }, 800);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleSearch = async (searchQuery) => {
        setIsLoading(true);
        setHasSearched(true);
        try {
            const token = localStorage.getItem('cinematch_token');
            const response = await axios.get(`https://cinematch-backend-hdvz.onrender.com/api/search?query=${encodeURIComponent(searchQuery)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResults(response.data.results || []);
        } catch (error) {
            console.error("Search fetch error:", error);
            toast.error("ไม่สามารถค้นหาได้ในขณะนี้");
        } finally {
            setIsLoading(false);
        }
    };

    // ฟังก์ชันจัดการการกด Like / Dislike (แบบการ์ดไม่หายไปจากจอ)
    const handleVote = async (item, type, e) => {
        if (e) e.stopPropagation();

        try {
            const token = localStorage.getItem('cinematch_token');
            if (!token) {
                toast.error("กรุณาล็อกอินก่อนใช้งาน");
                return;
            }

            const isLike = type === 'like';
            // สกัด ID ออกมาแบบเพียวๆ (ลบ mv- หรือ tv- ทิ้ง) เพื่อเตรียมส่งให้ Database
            const rawId = item.id || item.film_id;
            const finalMovieId = String(rawId).replace(/^(mv-|tv-)/, '');
            
            // เตรียมข้อมูลให้ครบตามตาราง user_likes 
            // 🟢 นี่คือจุดที่ทำให้ Backend ยอมรับข้อมูล
            const payload = {
                movie_id: finalMovieId, 
                action: isLike ? 'like' : 'dislike',
                media_type: item.media_type || (item.first_air_date ? 'tv' : 'movie'),
                movie_title: item.title || item.name || "ไม่ทราบชื่อ",
                poster_path: item.poster_path || "",
                genres: item.genre_ids ? item.genre_ids.join(',') : "", // ส่งเป็น String แบบ "28,12"
                points: isLike ? 5 : 0 
            };

            // 1. สั่งบันทึกลงตาราง user_likes "ก่อน" 
            await axios.post('https://cinematch-backend-hdvz.onrender.com/api/likes', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // 2. อัปเดตคะแนน Preferences (ทำเมื่อบันทึกลงตาราง Likes สำเร็จเท่านั้น)
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

                await axios.post('https://cinematch-backend-hdvz.onrender.com/api/preferences', 
                    { genreWeights: prefs.genreWeights },
                    { headers: { Authorization: `Bearer ${token}` } } // 🟢 เพิ่มปีกกาปิด } ที่หายไปตรงนี้
                );
            }

            // 3. อัปเดต State ให้ปุ่มเปลี่ยนสีทันทีโดยไม่ต้องรีเฟรชหน้า
            if (isLike) {
                setLikedMovies(prev => [...prev.filter(m => String(m.movie_id) !== finalMovieId), { ...payload, movie_id: finalMovieId }]);
                setDislikedMovies(prev => prev.filter(m => String(m.movie_id) !== finalMovieId));
                toast.success('เพิ่มลงในรายการโปรดแล้ว');
            } else {
                setDislikedMovies(prev => [...prev.filter(m => String(m.movie_id) !== finalMovieId), { ...payload, movie_id: finalMovieId }]);
                setLikedMovies(prev => prev.filter(m => String(m.movie_id) !== finalMovieId));
                toast.success('ซ่อนหนังเรื่องนี้แล้ว');
            }
            
            // 🟢 ไม่มีการใช้ setMovies หรือ filter ใดๆ เพื่อลบการ์ดออก การ์ดจะอยู่ตำแหน่งเดิม

        } catch (error) {
            console.error("Vote error:", error);
            toast.error("เกิดข้อผิดพลาดในการเซฟข้อมูล ลองอีกครั้งค่ะ");
        }
    };

    // ฟังก์ชันดึงรายละเอียดภาพยนตร์แบบเจาะลึก
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

    // Component การ์ดแบบเดียวกับหน้า Home เป๊ะๆ
    const MovieCard = ({ item, isTV }) => {
        const title = isTV ? item.name : item.title;
        const year = isTV ? item.first_air_date?.substring(0, 4) : item.release_date?.substring(0, 4);
    
        return (
            <div className="min-w-36 max-w-36 md:min-w-44 md:max-w-44 flex flex-col h-full group bg-white rounded-2xl p-2.5 shadow-[0_4px_15px_rgba(33,1,0,0.03)] border border-[#FECE79]/30 hover:shadow-md transition-shadow relative">
                <div onClick={() => handleMovieClick({...item, media_type: isTV ? 'tv' : 'movie'})} className="relative w-full aspect-3/4 rounded-xl overflow-hidden mb-3 cursor-pointer bg-[#FFFDF9] shrink-0">
                    {item.poster_path ? (
                        <img src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400 text-sm">ไม่มีรูปภาพ</div>
                    )}
                    
                    <div className="absolute top-2 right-2 bg-[#210100]/80 backdrop-blur-sm text-[#FECE79] text-xs font-black px-2 py-1 rounded-md flex items-center gap-1 z-10">
                        ★ {item.vote_average ? item.vote_average.toFixed(1) : "N/A"}
                    </div>
                    
                    <div className="absolute bottom-2 left-0 right-0 px-2 flex justify-between z-20">
                        <button onClick={(e) => handleVote(item, 'dislike', e)} className="w-8 h-8 md:w-9 md:h-9 bg-[#8C0902]/90 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:scale-110 hover:bg-[#8C0902] shadow-lg transition-transform border border-white/20">
                            <svg className="w-4 h-4 mt-1" fill="currentColor" viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
                        </button>
                        <button onClick={(e) => handleVote(item, 'like', e)} className="w-8 h-8 md:w-9 md:h-9 bg-[#E6A341]/90 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:scale-110 hover:bg-[#E6A341] shadow-lg transition-transform border border-white/20">
                            <svg className="w-4 h-4 mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                        </button>
                    </div>
                </div>
                <div className="flex flex-col grow px-1">
                    <h3 className="font-extrabold text-[#210100] text-sm leading-snug line-clamp-2" title={title}>{title}</h3>
                    <p className="text-[#B14A36] font-bold text-xs mt-1">{year || "N/A"}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#FFFDF9] py-8 px-4 md:px-8 relative">
            <div className="max-w-7xl mx-auto flex flex-col items-center">
                
                <h1 className="text-3xl md:text-4xl font-extrabold text-[#8C0902] mb-2 text-center tracking-tight">
                    ค้นหาภาพยนตร์ & ซีรีส์
                </h1>
                <p className="text-gray-500 mb-8 text-center text-sm md:text-base">
                    พิมพ์ชื่อเรื่องที่ต้องการค้นหา เพื่อเพิ่มลงในคอลเลกชันของคุณ
                </p>

                {/* Search Bar */}
                <div className="w-full max-w-2xl relative mb-12">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="เช่น Toy Story, แฮร์รี่ พอตเตอร์..."
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-100 bg-white text-gray-800 focus:border-[#E6A341] focus:ring-4 focus:ring-[#FECE79]/30 outline-none transition-all shadow-sm text-lg font-medium"
                    />
                </div>

                {/* Results Section */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-[#FECE79] border-t-[#8C0902] rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 font-medium">กำลังค้นหา...</p>
                    </div>
                ) : (
                    <div className="w-full">
                        {hasSearched && results.length === 0 ? (
                            <div className="text-center py-20 text-gray-400">
                                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <p className="text-lg">ไม่พบเรื่องที่คุณค้นหา หรือคุณอาจกดโหวตไปหมดแล้ว</p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap justify-center gap-4 md:gap-6 w-full animate-fade-in">
                                {results.map((item) => (
                                    <MovieCard key={item.id} item={item} isTV={item.media_type === 'tv'} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal แบบเดียวกับหน้า Home 100% */}
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