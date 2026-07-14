import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const GENRE_MAP = {
  28: "แอคชั่น", 12: "ผจญภัย", 16: "แอนิเมชัน", 35: "ตลก", 80: "อาชญากรรม",
  99: "สารคดี", 18: "ดราม่า", 10751: "ครอบครัว", 14: "แฟนตาซี", 36: "ประวัติศาสตร์",
  27: "สยองขวัญ", 10402: "มิวสิคัล", 9648: "ลึกลับ", 10749: "โรแมนติก", 878: "ไซไฟ",
  10770: "ทีวีมูฟวี่", 53: "ระทึกขวัญ", 10752: "สงคราม", 37: "คาวบอย"
};

const getRawTmdbId = (itemOrId) => {
  const value = typeof itemOrId === 'object' && itemOrId !== null
    ? (itemOrId.tmdb_id ?? itemOrId.movie_id ?? itemOrId.film_id ?? itemOrId.id)
    : itemOrId;

  return String(value ?? '').replace(/^(mv-|tv-)/i, '');
};

const getMediaType = (item) => {
  if (!item) return 'movie';

  const id = String(item.id ?? item.movie_id ?? '');
  if (item.type === 'tv' || item.media_type === 'tv' || id.startsWith('tv-')) return 'tv';
  if (item.type === 'movie' || item.media_type === 'movie' || id.startsWith('mv-')) return 'movie';

  return item.first_air_date ? 'tv' : 'movie';
};

const getVoteRows = (data) => {
  if (Array.isArray(data)) return data;

  return [
    ...(Array.isArray(data?.liked) ? data.liked : []),
    ...(Array.isArray(data?.disliked) ? data.disliked : [])
  ];
};

const parseGenreIds = (value) => {
  if (Array.isArray(value)) {
    return value.map(Number).filter(Number.isFinite);
  }

  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(Number).filter(Number.isFinite);
    }
  } catch (_) {
    // รูปแบบ "28,12" ไม่ใช่ JSON จึงแยกด้วย comma ด้านล่าง
  }

  return value
    .split(',')
    .map((id) => Number(String(id).trim()))
    .filter(Number.isFinite);
};

const isSameMediaItem = (left, right) => (
  getRawTmdbId(left) === getRawTmdbId(right)
  && getMediaType(left) === getMediaType(right)
);

const updatePreferenceScores = async (token, genreSource, delta) => {
  if (!delta) return;

  const genreIds = parseGenreIds(genreSource);
  if (genreIds.length === 0) return;

  let preferences;
  try {
    preferences = JSON.parse(
      localStorage.getItem('cinematch_preferences') || '{"genreWeights":{}}'
    );
  } catch (_) {
    preferences = { genreWeights: {} };
  }

  if (!preferences.genreWeights || typeof preferences.genreWeights !== 'object') {
    preferences.genreWeights = {};
  }

  genreIds.forEach((genreId) => {
    const genreName = GENRE_MAP[genreId];
    if (!genreName) return;

    const currentScore = Number(preferences.genreWeights[genreName]) || 0;
    preferences.genreWeights[genreName] = Math.max(0, currentScore + delta);
  });

  localStorage.setItem('cinematch_preferences', JSON.stringify(preferences));

  await axios.post(
    'https://cinematch-backend-hdvz.onrender.com/api/preferences',
    { genreWeights: preferences.genreWeights },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

export default function Collection({ currentUser }) {
  const [likedMovies, setLikedMovies] = useState([]);
  const [dislikedMovies, setDislikedMovies] = useState([]);
  const [activeTab, setActiveTab] = useState('like');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [detailedMovie, setDetailedMovie] = useState(null);

  useEffect(() => {
    const fetchCollection = async () => {
      const token = localStorage.getItem('cinematch_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          'https://cinematch-backend-hdvz.onrender.com/api/likes',
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const rows = getVoteRows(response.data);
        setLikedMovies(rows.filter((item) => item.action === 'like'));
        setDislikedMovies(rows.filter((item) => item.action === 'dislike'));
      } catch (error) {
        console.error('Error fetching collection:', error);
        toast.error('ดึงข้อมูลคอลเลกชันไม่สำเร็จ');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollection();
  }, []);

  const displayedMovies = useMemo(
    () => activeTab === 'like' ? likedMovies : dislikedMovies,
    [activeTab, likedMovies, dislikedMovies]
  );

  const handleRemoveFromCollection = async (event, item) => {
    event?.stopPropagation();

    const token = localStorage.getItem('cinematch_token');
    if (!token) {
      toast.error('กรุณาล็อกอินก่อนใช้งาน');
      return;
    }

    const movieId = getRawTmdbId(item);
    try {
      await axios.delete(
        `https://cinematch-backend-hdvz.onrender.com/api/likes/${movieId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ลบ Like ต้องคืนคะแนน แต่ลบ Dislike ไม่กระทบคะแนนความชอบ
      if (item.action === 'like') {
        await updatePreferenceScores(token, item.genres, -5);
        setLikedMovies((previous) =>
          previous.filter((savedItem) => !isSameMediaItem(savedItem, item))
        );
        toast.success('นำออกจากรายการที่ชอบและคืนคะแนนแล้ว');
      } else {
        setDislikedMovies((previous) =>
          previous.filter((savedItem) => !isSameMediaItem(savedItem, item))
        );
        toast.success('นำออกจากรายการที่ไม่ชอบแล้ว');
      }
    } catch (error) {
      console.error('Remove collection item error:', error);
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  const handleMovieClick = async (item) => {
    setSelectedMovie(item);
    setDetailedMovie(null);

    try {
      const API_KEY = '181edc5801db6678de6ccb2864149a6a';
      const mediaType = getMediaType(item);
      const movieId = getRawTmdbId(item);

      const thaiResponse = await fetch(
        `https://api.themoviedb.org/3/${mediaType}/${movieId}?api_key=${API_KEY}&language=th-TH&append_to_response=watch/providers,credits`
      );

      if (!thaiResponse.ok) {
        throw new Error(`TMDB detail error ${thaiResponse.status}`);
      }

      const thaiData = await thaiResponse.json();
      let overview = thaiData.overview;

      if (!overview) {
        const englishResponse = await fetch(
          `https://api.themoviedb.org/3/${mediaType}/${movieId}?api_key=${API_KEY}&language=en-US`
        );

        if (englishResponse.ok) {
          const englishData = await englishResponse.json();
          overview = englishData.overview;
        }
      }

      const director = thaiData.credits?.crew?.find(
        (person) => person.job === 'Director' || person.job === 'Executive Producer'
      );
      const cast = thaiData.credits?.cast?.slice(0, 8) || [];
      const genreNames = thaiData.genres?.map((genre) => genre.name).join(', ') || 'ไม่ระบุ';

      const providerResults = thaiData['watch/providers']?.results || {};
      const providers = { flatrate: [], rent: [], buy: [] };
      const seenProviderIds = new Set();

      const addProviders = (regionCode) => {
        const region = providerResults[regionCode];
        if (!region) return;

        ['flatrate', 'rent', 'buy'].forEach((providerType) => {
          (region[providerType] || []).forEach((provider) => {
            if (seenProviderIds.has(provider.provider_id)) return;
            seenProviderIds.add(provider.provider_id);
            providers[providerType].push(provider);
          });
        });
      };

      ['TH', 'US', 'KR', 'JP', 'GB'].forEach(addProviders);
      if (seenProviderIds.size === 0) Object.keys(providerResults).forEach(addProviders);

      Object.keys(providers).forEach((providerType) => {
        providers[providerType] = providers[providerType]
          .sort((left, right) => left.display_priority - right.display_priority)
          .slice(0, 4);
      });

      setDetailedMovie({
        ...thaiData,
        media_type: mediaType,
        displayOverview: overview || 'ไม่มีเรื่องย่อสำหรับเนื้อหานี้',
        providers,
        directorName: director?.name || 'ไม่ระบุ',
        cast,
        genreNames
      });
    } catch (error) {
      console.error('Error fetching details:', error);
      toast.error('โหลดรายละเอียดเรื่องนี้ไม่สำเร็จ');
    }
  };

  const formatRuntime = (movie) => {
    if (movie.media_type === 'tv') {
      const seasons = movie.number_of_seasons ? `${movie.number_of_seasons} ซีซัน` : '';
      const episodeTime = movie.episode_run_time?.[0]
        ? `(${movie.episode_run_time[0]} นาที/ตอน)`
        : '';

      return `${seasons} ${episodeTime}`.trim() || 'N/A';
    }

    if (!movie.runtime) return 'N/A';
    const hours = Math.floor(movie.runtime / 60);
    const minutes = movie.runtime % 60;
    return hours > 0 ? `${hours} ชม. ${minutes} นาที` : `${minutes} นาที`;
  };

  const emptyTitle = activeTab === 'like'
    ? 'ยังไม่มีรายการที่ชอบ'
    : 'ยังไม่มีรายการที่ไม่ชอบ';

  const emptyDescription = activeTab === 'like'
    ? 'ลองค้นหาแล้วกด Like เรื่องที่คุณชอบดูค่ะ'
    : 'เรื่องที่กด Dislike หรือเลือกซ่อนจะแสดงอยู่ที่นี่ค่ะ';

  const providerEntries = detailedMovie
    ? ['flatrate', 'rent', 'buy'].flatMap((providerType) =>
        detailedMovie.providers[providerType].map((provider) => ({
          providerType,
          provider
        }))
      )
    : [];

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-80px)] w-full animate-fade-in relative bg-[#FFFDF9]">
      <div className="w-full flex-1 flex flex-col items-center px-4 py-10 overflow-y-auto max-w-5xl">
        <div className="w-full border-b border-[#FECE79]/30 pb-4 mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-[#8C0902] uppercase tracking-wide">
                คอลเลกชันของฉัน
              </h2>
              <p className="text-sm text-[#210100]/60 font-medium">
                ดูรายการโปรดและรายการที่คุณไม่ชอบแยกจากกัน
              </p>
            </div>

            <span className="text-sm font-bold text-[#E6A341] bg-[#FECE79]/20 px-3 py-1 rounded-lg">
              ทั้งหมด {likedMovies.length + dislikedMovies.length} รายการ
            </span>
          </div>

          <div className="mt-5 grid w-full max-w-md grid-cols-2 gap-1 rounded-xl bg-white p-1 border border-[#FECE79]">
            <button
              type="button"
              onClick={() => setActiveTab('like')}
              className={`rounded-xl px-4 py-3 text-sm font-black transition-all ${
                activeTab === 'like'
                  ? 'bg-[#8C0902] text-white shadow-sm'
                  : 'text-[#B14A36] hover:bg-[#8C0902]/5'
              }`}
            >
              รายการโปรด ({likedMovies.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dislike')}
              className={`rounded-xl px-4 py-3 text-sm font-black transition-all ${
                activeTab === 'dislike'
                  ? 'bg-[#8C0902] text-white shadow-sm'
                  : 'text-[#B14A36] hover:bg-[#8C0902]/5'
              }`}
            >
              ไม่ชอบ ({dislikedMovies.length})
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 flex-1">
            <div className="w-12 h-12 border-4 border-[#FECE79] border-t-[#8C0902] rounded-full animate-spin mb-4" />
            <p className="text-[#B14A36] font-bold text-sm animate-pulse">
              กำลังดึงข้อมูลคอลเลกชัน...
            </p>
          </div>
        ) : displayedMovies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 flex-1 text-center opacity-75">
            <div className={`w-20 h-20 rounded-full mb-4 flex items-center justify-center text-3xl ${
              activeTab === 'like'
                ? 'bg-[#FECE79]/30 text-[#E6A341]'
                : 'bg-[#8C0902]/10 text-[#8C0902]'
            }`}>
              {activeTab === 'like' ? '👍' : '👎'}
            </div>
            <h3 className="text-xl font-bold text-[#8C0902] mb-2">{emptyTitle}</h3>
            <p className="text-[#210100]/60">{emptyDescription}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full justify-center">
            {displayedMovies.map((item) => (
              <div
                key={`${getMediaType(item)}-${getRawTmdbId(item)}`}
                className="flex flex-col h-full group bg-white rounded-2xl p-3 shadow-[0_4px_20px_rgba(33,1,0,0.04)] border border-[#FECE79]/40 hover:shadow-md transition-shadow"
              >
                <div
                  onClick={() => handleMovieClick(item)}
                  className="relative w-full aspect-2/3 rounded-xl overflow-hidden mb-3 cursor-pointer bg-[#FFFDF9] shrink-0"
                >
                  {item.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                      alt={item.movie_title || 'Poster'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center px-4 text-center bg-[#FECE79]/20 text-[#8C0902]/50 text-xs font-bold">
                      ไม่มีรูปภาพ
                    </div>
                  )}

                  <div className="absolute top-2 right-2 z-10">
                    <span className={`text-[10px] md:text-xs font-black px-2 py-1 rounded-md shadow-sm uppercase ${
                      item.action === 'like'
                        ? 'bg-[#E6A341] text-[#210100]'
                        : 'bg-[#8C0902] text-white'
                    }`}>
                      {item.action === 'like' ? 'Liked' : 'Disliked'}
                    </span>
                  </div>

                  <div className="absolute top-2 left-2 z-20">
                    <button
                      type="button"
                      onClick={(event) => handleRemoveFromCollection(event, item)}
                      className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shadow-lg transition-transform border border-white/20 backdrop-blur-md bg-white/90 text-red-500 hover:bg-red-50 hover:text-red-600 hover:scale-110"
                      aria-label="นำออกจากคอลเลกชัน"
                    >
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col grow px-1">
                  <h3
                    className="font-extrabold text-[#210100] text-sm md:text-base leading-snug line-clamp-2 mb-1"
                    title={item.movie_title}
                  >
                    {item.movie_title || 'ไม่ทราบชื่อ'}
                  </h3>
                  <p className="text-[10px] font-bold text-[#B14A36] uppercase mb-3">
                    {getMediaType(item) === 'tv' ? 'TV Series' : 'Movie'}
                  </p>

                  <div className="mt-auto pt-2 border-t border-[#FECE79]/30 w-full">
                    <button
                      type="button"
                      onClick={() => handleMovieClick(item)}
                      className="w-full bg-[#8C0902]/5 text-[#8C0902] font-black text-xs text-center hover:bg-[#8C0902] hover:text-white rounded-xl transition-all py-2"
                    >
                      ดูรายละเอียดเจาะลึก
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-[#210100]/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FFFDF9] rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col md:flex-row">
            <button
              type="button"
              onClick={() => setSelectedMovie(null)}
              className="absolute top-4 right-4 bg-white/90 hover:bg-white rounded-full p-2 z-30 shadow-md transition-transform hover:scale-110"
            >
              <svg className="w-5 h-5 text-[#8C0902]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="w-full md:w-[35%] h-64 md:h-auto shrink-0 relative bg-[#FECE79]/20">
              {selectedMovie.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${selectedMovie.poster_path}`}
                  alt={selectedMovie.movie_title || 'Poster'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#8C0902]/50 font-bold">
                  ไม่มีรูปภาพ
                </div>
              )}
            </div>

            <div className="w-full md:w-[65%] p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar">
              <div className="mb-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="inline-block bg-[#FECE79]/30 text-[#8C0902] text-xs font-bold px-2 py-1 rounded-md uppercase">
                    {getMediaType(selectedMovie) === 'tv' ? 'TV Series' : 'Movie'}
                  </span>
                  <span className={`inline-block text-xs font-bold px-2 py-1 rounded-md ${
                    selectedMovie.action === 'like'
                      ? 'bg-[#E6A341] text-[#210100]'
                      : 'bg-[#8C0902] text-white'
                  }`}>
                    {selectedMovie.action === 'like' ? 'รายการที่ชอบ' : 'รายการที่ไม่ชอบ'}
                  </span>
                </div>

                <h2 className="text-3xl md:text-4xl font-black text-[#210100] leading-tight mb-2">
                  {selectedMovie.movie_title || detailedMovie?.title || detailedMovie?.name}
                </h2>

                <div className="text-sm font-bold text-[#B14A36]">
                  {detailedMovie ? formatRuntime(detailedMovie) : 'กำลังคำนวณเวลา...'}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-[#210100]/80 text-sm md:text-base leading-relaxed font-medium">
                  {detailedMovie?.displayOverview || 'กำลังโหลดข้อมูลเนื้อเรื่อง...'}
                </p>
              </div>

              {detailedMovie && (
                <div className="mb-6 bg-[#FECE79]/10 p-4 rounded-xl border border-[#FECE79]/30">
                  <p className="text-xs md:text-sm text-[#210100] mb-2">
                    <span className="font-extrabold text-[#8C0902]">หมวดหมู่:</span> {detailedMovie.genreNames}
                  </p>
                  <p className="text-xs md:text-sm text-[#210100] mb-3">
                    <span className="font-extrabold text-[#8C0902]">ผู้กำกับ/ผู้สร้าง:</span> {detailedMovie.directorName}
                  </p>

                  <p className="text-xs md:text-sm font-extrabold text-[#8C0902] mb-2">
                    นักแสดงนำ:
                  </p>
                  <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
                    {detailedMovie.cast.map((actor) => (
                      <div key={actor.id} className="flex flex-col items-center w-16 shrink-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white mb-1.5 border border-[#FECE79]">
                          {actor.profile_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                              alt={actor.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#8C0902]/30 bg-[#FECE79]/20">
                              👤
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-[#210100] text-center leading-tight line-clamp-2">
                          {actor.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-[#FECE79]/40">
                <h4 className="text-xs font-bold text-[#8C0902] mb-3">ช่องทางการรับชม:</h4>
                <div className="flex flex-wrap gap-2 mb-6">
                  {detailedMovie ? (
                    providerEntries.length > 0 ? (
                      providerEntries.map(({ providerType, provider }) => (
                        <div
                          key={`${provider.provider_id}-${providerType}`}
                          className="flex items-center gap-1.5 bg-[#FFFDF9] border border-[#FECE79]/50 rounded-lg p-1.5 pr-3 shadow-sm"
                        >
                          <img
                            src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                            className="w-7 h-7 rounded-md object-cover"
                            alt={provider.provider_name}
                          />
                          <span className="text-[10px] font-bold text-[#210100]">
                            {providerType === 'flatrate' ? 'สตรีม' : providerType === 'rent' ? 'เช่า' : 'ซื้อ'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#B14A36] font-medium bg-[#B14A36]/10 px-3 py-1.5 rounded-lg">
                        ไม่มีข้อมูลสตรีมมิ่งในภูมิภาคของคุณ
                      </p>
                    )
                  ) : (
                    <p className="text-xs text-[#E6A341] animate-pulse">
                      กำลังตรวจสอบช่องทางรับชม...
                    </p>
                  )}
                </div>

                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                    `${selectedMovie.movie_title || ''} official trailer`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#8C0902] hover:bg-[#210100] text-white font-bold py-4 rounded-xl text-center transition-all shadow-md flex items-center justify-center gap-2"
                >
                  ดูตัวอย่าง Trailer
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}