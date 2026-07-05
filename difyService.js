// difyService.js

// แนะนำให้เก็บ API Key ไว้ในตัวแปร Environment (เช่น .env) เพื่อความปลอดภัย
// ตัวอย่างสำหรับ Vite: const DIFY_API_KEY = import.meta.env.VITE_DIFY_API_KEY;
const DIFY_API_KEY = "ใส่_API_KEY_ของคุณที่นี่"; 
const DIFY_API_URL = "https://api.dify.ai/v1/chat-messages";

/**
 * ส่งข้อความไปหา CINE AI
 * @param {string} userMessage - ข้อความที่ผู้ใช้พิมพ์
 * @param {string|number} currentUserId - ID ของผู้ใช้ (เพื่อดึง Supabase และระบุตัวตนใน Dify)
 * @param {string} conversationId - ID ของวงสนทนา (ปล่อยว่างถ้าเป็นการเริ่มแชทใหม่)
 * @returns {Promise<Object>} - คืนค่า object ที่มี answer (คำตอบจาก AI) และ conversationId
 */
export const sendMessageToCineAI = async (userMessage, currentUserId, conversationId = "") => {
  try {
    const response = await fetch(DIFY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: {
          user_id: currentUserId.toString() // ตัวแปรเงียบสำหรับ Custom Tool
        },
        query: userMessage,
        response_mode: "blocking",
        conversation_id: conversationId, // ส่งกลับไปเพื่อให้ AI จำบริบทแชทเก่าได้
        user: currentUserId.toString()
      })
    });

    if (!response.ok) {
      throw new Error(`Dify API responded with status: ${response.status}`);
    }

    const data = await response.json();

    return {
      answer: data.answer, // ก้อนข้อความ + JSON ที่เราตั้งค่าไว้
      conversationId: data.conversation_id // ต้องเก็บค่านี้ไว้ใช้ในรอบการพิมพ์ครั้งต่อไป
    };

  } catch (error) {
    console.error("Error fetching from CINE AI:", error);
    throw error;
  }
};