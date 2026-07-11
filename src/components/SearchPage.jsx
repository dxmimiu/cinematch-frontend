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
        }, 800); // หน่วงเวลา 0.8 วิ หลังจากพิมพ์เสร็จค่อยค้นหา

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleSearch = async (searchQuery) => {
        setIsLoading(true);
        setHasSearched(true);
        try {
            const token = localStorage.getItem('cinematch_token'); // ดึง Token ตามระบบของคุณ
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

    return (
        <div className="min-h-screen bg-[#FFFDF9] py-8 px-4 md:px-8">
            <div className="max-w-6xl mx-auto flex flex-col items-center">
                
                {/* Header Section */}
                <h1 className="text-3xl md:text-4xl font-extrabold text-[#8C0902] mb-2 text-center tracking-tight">
                    ค้นหาภาพยนตร์ & ซีรีส์
                </h1>
                <p className="text-gray-500 mb-8 text-center text-sm md:text-base">
                    พิมพ์ชื่อเรื่องที่ต้องการค้นหา (ภาษาไทยหรืออังกฤษ)
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
                                <p className="text-lg">ไม่พบเรื่องที่คุณค้นหา</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 w-full animate-fade-in">
                                {results.map((item) => (
                                    <div key={item.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 transition-all hover:-translate-y-1 group relative flex flex-col">
                                        
                                        {/* Poster Image */}
                                        <div className="aspect-2/3 w-full bg-gray-100 relative overflow-hidden">
                                            {item.poster_path ? (
                                                <img 
                                                    src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} 
                                                    alt={item.title || item.name} 
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">ไม่มีรูปภาพ</div>
                                            )}
                                            
                                            {/* Badge ประเภท (Movie/TV) */}
                                            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                                                {item.media_type === 'tv' ? 'Series' : 'Movie'}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="p-3 flex flex-col grow justify-between">
                                            <h3 className="font-bold text-[#210100] text-sm md:text-base line-clamp-2 leading-tight">
                                                {item.title || item.name}
                                            </h3>
                                            
                                            <div className="flex items-center gap-1 mt-2">
                                                <svg className="w-4 h-4 text-[#E6A341]" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                                <span className="text-xs font-semibold text-gray-600">
                                                    {item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}
                                                </span>
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