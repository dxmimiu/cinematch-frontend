const BACKEND_URL =
    import.meta.env.VITE_API_URL ||
    'https://cinematch-backend-hdvz.onrender.com';

/**
 * ส่งข้อความจาก Frontend ไปยัง Backend
 * Backend จะเป็นผู้ถือ DIFY_API_KEY และเชื่อมต่อ Dify ให้
 *
 * คงพารามิเตอร์ currentUserId ไว้ เพื่อให้ MovieSearch.jsx ไม่ต้องแก้
 */
export const sendMessageToCineAI = async (
    userMessage,
    currentUserId,
    conversationId = ''
) => {
    try {
        const token = localStorage.getItem('cinematch_token');

        if (!token) {
            throw new Error('กรุณาเข้าสู่ระบบก่อนใช้งาน CINE AI');
        }

        const response = await fetch(`${BACKEND_URL}/api/dify/chat`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: userMessage,
                conversationId
            })
        });

        let data = {};

        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        if (!response.ok) {
            throw new Error(
                data.message ||
                `Backend responded with status ${response.status}`
            );
        }

        return {
            answer: data.answer || '',
            conversationId: data.conversationId || conversationId
        };
    } catch (error) {
        console.error('Error fetching CINE AI:', error);
        throw error;
    }
};
