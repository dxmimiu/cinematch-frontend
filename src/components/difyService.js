const DIFY_API_KEY = "app-HfA3hKy2U9vrXFFt3kSHM31x";
const DIFY_API_URL = "https://api.dify.ai/v1/chat-messages";

export const sendMessageToCineAI = async (
  userMessage,
  currentUserId,
  conversationId = ""
) => {
  try {
    if (!DIFY_API_KEY || DIFY_API_KEY === "app-HfA3hKy2U9vrXFFt3kSHM31x") {
      throw new Error("กรุณาใส่ Dify API Key ในไฟล์ difyService.js");
    }

    const userId = String(currentUserId || 3);

    const requestBody = {
      inputs: {
        user_id: userId
      },
      query: userMessage,
      response_mode: "streaming",
      user: userId
    };

    if (conversationId) {
      requestBody.conversation_id = conversationId;
    }

    const response = await fetch(DIFY_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DIFY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Dify API Error:", response.status, errorText);
      throw new Error(`Dify API responded with status ${response.status}`);
    }

    if (!response.body) {
      throw new Error("Dify API ไม่ส่ง streaming body กลับมา");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";
    let fullAnswer = "";
    let finalConversationId = conversationId;

    const processLine = (line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine.startsWith("data:")) return;

      const rawData = trimmedLine.slice(5).trim();
      if (!rawData || rawData === "[DONE]") return;

      try {
        const data = JSON.parse(rawData);

        if (data.conversation_id) {
          finalConversationId = data.conversation_id;
        }

        if (data.event === "message" || data.event === "agent_message") {
          fullAnswer += data.answer || "";
        }

        if (data.event === "error") {
          console.error("Dify streaming error:", data);
        }
      } catch (error) {
        console.warn("ข้าม Dify event ที่อ่านไม่สมบูรณ์:", rawData);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      lines.forEach(processLine);
    }

    buffer += decoder.decode();
    if (buffer.trim()) processLine(buffer);

    return {
      answer: fullAnswer,
      conversationId: finalConversationId
    };
  } catch (error) {
    console.error("Error fetching from CINE AI:", error);
    throw error;
  }
};
