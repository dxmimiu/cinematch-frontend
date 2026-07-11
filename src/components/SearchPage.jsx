import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

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

    // ✅ ฟังก์ชันจัดการการกด Like / Dislike
    const handleInteraction = async (item, action) => {
        try {
            const token = localStorage.getItem('cinematch_token');
            const isLike = action === 'like';
            
            // เตรียมข้อมูลส่งไปที่ API /api/likes (ตามโครงสร้าง Backend ของคุณ)
            const payload = {
                movie_id: item.id,
                action: action, 
                media_type: item.media_type || 'movie',
                movie_title: item.title || item.name,
                poster_path: item.poster_path,
                genres: item.genre_ids,
                points: isLike ? 5 : 1 // กำหนดคะแนนพื้นฐาน (ปรับแก้ได้ตามต้องการ)
            };

            await axios.post('https://cinematch-backend-hdvz.onrender.com/api/likes', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // แจ้งเตือนผู้ใช้
            if (isLike) {
                toast.success(`เพิ่ม "${item.title || item.name}" ลงคอลเลกชันแล้ว!`, { icon: '❤️' });
            } else {
                toast.error(`ข้าม "${item.title || item.name}"`, { icon: '❌' });
            }

            // ซ่อนการ์ดที่กดไปแล้วออกจากหน้าจอทันที
            setResults(prev => prev.filter(movie => movie.id !== item.id));

        } catch (error) {
            console.error("Interaction error:", error);
            toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        }
    };

    return (
        <div className="min-h-screen bg-[#FFFDF9] py-8 px-4 md:px-8">
            <div className="max-w-6xl mx-auto flex flex-col items-center">
                
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
                        <div className="w-10 h-10 border-4 border-[#FECE79] border-t-[#B14A36] rounded-full animate-spin mb-4"></div>
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
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 w-full animate-fade-in">
                                {results.map((item) => (
                                    <div key={item.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 transition-all flex flex-col group">
                                        
                                        {/* Poster Image */}
                                        <div className="aspect-2/3 w-full bg-gray-100 relative overflow-hidden">
                                            {item.poster_path ? (
                                                <img 
                                                    src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} 
                                                    alt={item.title || item.name} 
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm bg-gray-200">ไม่มีรูปภาพ</div>
                                            )}
                                            
                                            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                                                {item.media_type === 'tv' ? 'Series' : 'Movie'}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="p-3 flex flex-col grow">
                                            <h3 className="font-bold text-[#210100] text-sm md:text-base line-clamp-2 leading-tight mb-1">
                                                {item.title || item.name}
                                            </h3>
                                            
                                            <div className="flex items-center gap-1 mb-3">
                                                <svg className="w-4 h-4 text-[#E6A341]" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                                <span className="text-xs font-semibold text-gray-600">
                                                    {item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}
                                                </span>
                                            </div>

                                            {/* ✅ ปุ่ม Like / Dislike (ดันให้อยู่ล่างสุดของการ์ดเสมอ) */}
                                            <div className="flex justify-between items-center gap-2 mt-auto pt-2 border-t border-gray-100">
                                                {/* ปุ่ม Dislike (ข้าม) */}
                                                <button 
                                                    onClick={() => handleInteraction(item, 'dislike')}
                                                    className="flex-1 flex justify-center items-center py-1.5 rounded-lg border-2 border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
                                                    title="ข้ามเรื่องนี้"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                                
                                                {/* ปุ่ม Like (ถูกใจ) */}
                                                <button 
                                                    onClick={() => handleInteraction(item, 'like')}
                                                    className="flex-1 flex justify-center items-center py-1.5 rounded-lg border-2 border-[#FECE79] text-[#E6A341] hover:text-white hover:bg-[#E6A341] shadow-sm transition-all"
                                                    title="เพิ่มลงคอลเลกชัน"
                                                >
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}