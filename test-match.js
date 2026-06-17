// 1. จำลองข้อมูล User Input (ดึงมาจากตาราง user_profiles ที่ออกแบบไว้)
// User A (ทีม Star Wars)
const userA = {
    id: "U_1001",
    genre_ids: [28, 878],      // ได้แต้มสะสมหมวด Action, Sci-Fi 
    disliked_genres: [],       // << ต้องมีบรรทัดนี้ (แม้จะว่างเปล่า) เพื่อไม่ให้ลอจิกพัง
    disliked_movies: [154]     // ปัดซ้าย Star Trek (แบน ID 154)
};

// User B (ทีม Star Trek)
const userB = {
    id: "U_1003",
    genre_ids: [28, 878],      // ได้แต้มสะสมหมวด Action, Sci-Fi 
    disliked_genres: [],       // << ต้องมีบรรทัดนี้ (แม้จะว่างเปล่า)
    disliked_movies: [11]      // ปัดซ้าย Star Wars (แบน ID 11)
};

const API_KEY = "181edc5801db6678de6ccb2864149a6a";

// ฟังก์ชันหลัก
async function testDuoMatchUpgraded() {
    console.log("🎬 กำลังเตรียมข้อมูลสมุดหน้าเหลือง (Genre List)...");

    try {
        // --- 1. โหลดข้อมูล Genre List จาก TMDB มาทำ Mapping ---
        const genreUrl = `https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}&language=th-TH`;
        const genreRes = await fetch(genreUrl);
        const genreData = await genreRes.json();
        
        // สร้าง Object เพื่อแปลงจาก ID เป็น Name เช่น { 28: "บู๊", 878: "นิยายวิทยาศาสตร์" }
        const genreMap = {};
        if (genreData.genres) {
            genreData.genres.forEach(g => {
                genreMap[g.id] = g.name;
            });
        }

        // --- 2. หาจุดกึ่งกลางของ User A และ B ---
        const combinedGenres = [userA.genre_ids[0], userB.genre_ids[0]]; 
        const genreQuery = combinedGenres.join(",");
        
        console.log(`📡 กำลังดึงข้อมูลภาพยนตร์ที่มีรหัส ${genreQuery}...`);

        // --- 3. ดึงข้อมูลภาพยนตร์ ---
        const movieUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=${genreQuery}&language=th-TH&sort_by=popularity.desc`;
        const movieRes = await fetch(movieUrl);
        const data = await movieRes.json();

        if (data.success === false) {
            console.log("❌ ข้อผิดพลาด API:", data.status_message);
            return;
        }

        let movies = data.results;
        if (!movies || movies.length === 0) {
            console.log("❌ ไม่พบภาพยนตร์ที่ตรงเงื่อนไข");
            return;
        }

        let scoredMovies = [];

// --- 4. เครื่องจักรคำนวณคะแนน ---
        for (const movie of movies) {
            
            // กฎข้อที่ 1: เช็กว่าหนังเรื่องนี้โดนแบนแบบ "รายเรื่อง (Movie ID)" หรือไม่?
            if (userA.disliked_movies.includes(movie.id) || userB.disliked_movies.includes(movie.id)) {
                continue; 
            }

            // กฎข้อที่ 2: เช็กว่าหนังเรื่องนี้มี "แนวหนัง (Genre)" ที่โดนแบนหรือไม่?
            const hitBadGenreA = movie.genre_ids.some(g => userA.disliked_genres.includes(g));
            const hitBadGenreB = movie.genre_ids.some(g => userB.disliked_genres.includes(g));
            if (hitBadGenreA || hitBadGenreB) {
                continue; 
            }

            // --- ลอจิกการให้คะแนน (นำกลับมา) ---
            let rawScore = 0;
            // ถ้าตรงกับที่ User A ชอบ บวก 10
            movie.genre_ids.forEach(g => { if (userA.genre_ids.includes(g)) rawScore += 10; });
            // ถ้าตรงกับที่ User B ชอบ บวก 10
            movie.genre_ids.forEach(g => { if (userB.genre_ids.includes(g)) rawScore += 10; });
            // ตัวช่วยจัดอันดับจากคะแนนโหวต
            rawScore += movie.vote_average; 

            // แปลงรหัสเป็นชื่อไทย
            const genreNames = movie.genre_ids.map(id => genreMap[id] || "ไม่ระบุ").join(", ");

            // ดันข้อมูลลงตะกร้า (ส่วนนี้หายไปจากโค้ดของคุณ)
            scoredMovies.push({
                "ชื่อเรื่อง (ไทย)": movie.title,
                "ชื่อต้นฉบับ (Original)": movie.original_title,
                "แนวหนัง (Genres)": genreNames,
                "คะแนนดิบ": rawScore.toFixed(1)
            });
        }

        // --- 5. จัดอันดับ และ ปรับ Match Rate ให้เป็นสัดส่วน (Dynamic Percentage) ---
        // 5.1 เรียงลำดับจากคะแนนดิบมากไปน้อย
        scoredMovies.sort((a, b) => parseFloat(b["คะแนนดิบ"]) - parseFloat(a["คะแนนดิบ"]));
        const top5 = scoredMovies.slice(0, 5);

        // 5.2 หาคะแนนดิบของ "อันดับ 1" เพื่อใช้เป็นฐานสูงสุด
        const maxScoreInPool = parseFloat(top5[0]["คะแนนดิบ"]); 

        // 5.3 วนลูปให้คะแนนเปอร์เซ็นต์ทีละเรื่อง
        top5.forEach((movie, index) => {
            let raw = parseFloat(movie["คะแนนดิบ"]);
            
            // สูตร: (คะแนนเรื่องนี้ / คะแนนอันดับ1) * 98 (ล็อกให้อันดับ 1 ได้ 98% เสมอ)
            let percentage = Math.round((raw / maxScoreInPool) * 98);
            
            // 🌟 UI Trick: บังคับไม่ให้เปอร์เซ็นต์ซ้ำกันเด็ดขาด (Strict Hierarchy)
            // ถ้าเป็นอันดับ 2-5 แล้วเปอร์เซ็นต์ดันมาเท่ากับหรือมากกว่าอันดับบน ให้หักออก 1% เสมอ
            if (index > 0) {
                let prevPercentage = parseInt(top5[index - 1]["Match Rate"].replace('%', ''));
                if (percentage >= prevPercentage) {
                    percentage = prevPercentage - 1;
                }
            }

            // ใส่ผลลัพธ์เปอร์เซ็นต์กลับเข้าไปในการ์ดหนัง
            movie["Match Rate"] = `${percentage}%`;
        });

        console.log("\n✨ สรุป Top 5 ภาพยนตร์ที่แนะนำ (The Perfect Match):");
        console.table(top5);

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการรันระบบ:", error);
    }
}

testDuoMatchUpgraded();