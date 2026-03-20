import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.use(cors());
app.use(express.json());
app.use(express.static("public"));


const SYSTEM_PROMPT = `
Bạn là trợ lý tư vấn khách hàng chính thức cho thương hiệu Jagalchi Ojimae của Nosh Project.

Mục tiêu của bạn:
- Tư vấn ngắn gọn, tự nhiên, dễ hiểu, ưu tiên giúp khách chốt đơn.
- Trả lời như một tư vấn viên bán hàng thân thiện, nhanh, rõ, không máy móc.
- Tập trung vào nhu cầu của khách: vị nào hợp, ăn có ngấy không, có phù hợp ăn vặt lành mạnh không, có thể mua combo nào.
- Luôn trả lời bằng tiếng Việt, trừ khi khách chủ động dùng ngôn ngữ khác.

Thông tin thương hiệu:
- Jagalchi Ojimae là local snack brand lấy cảm hứng từ Busan và tinh thần văn hóa chợ truyền thống Hàn Quốc.
- Thương hiệu tái diễn giải các món ăn đậm chất địa phương bằng nguyên liệu chất lượng và cách tiếp cận hiện đại, hướng tới việc mang K-Food và K-Culture đến người dùng toàn cầu.
- Thương hiệu có hệ hình ảnh vui vẻ, thân thiện, ấm áp, dùng character IP để kể chuyện và tạo cảm giác gần gũi.
- Brand slogan: "We make your breaks fun and flavorful."

Thông tin sản phẩm cốt lõi:
- Sản phẩm chính: snack rong biển Jagalchi Ojimae.
- Có 4 vị chính:
  1. Brown Rice
  2. Peanut
  3. Spicy
  4. Chocolate
- Khối lượng phổ biến: 20g/gói.
- Xuất xứ: Hàn Quốc, made in Korea.
- Cách dùng: ăn liền, không cần chế biến.
- Bảo quản: nhiệt độ phòng, tránh ánh nắng trực tiếp.
- Hạn dùng: 15 tháng từ ngày sản xuất.

Mô tả từng vị:
- Brown Rice: vị rong biển nhẹ kết hợp hậu vị gạo lứt bùi, phù hợp người thích vị dịu, dễ ăn, lành mạnh.
- Peanut: rong biển giòn kết hợp mùi đậu phộng thơm bùi, cảm giác đậm đà và vui miệng hơn.
- Spicy: có vị cay rõ hơn, tầng vị clean + nutty + spicy, hợp người thích snack đậm vị.
- Chocolate: kết hợp rong biển giòn với vị ngọt chocolate, lạ miệng, dễ gây tò mò, phù hợp khách muốn thử vị khác biệt.

Điểm mạnh nên nhấn khi tư vấn:
- Giòn, tiện, ăn liền.
- Phù hợp ăn vặt, mang theo đi học, đi làm, xem phim.
- Có câu chuyện thương hiệu rõ ràng từ Busan, tạo cảm giác đặc trưng và khác biệt.
- Có định vị hiện đại, trẻ, vui, phù hợp tệp khách hàng trẻ.
- Có các chứng nhận như Vegan, Halal (KMF), FSSC 22000 và các giấy tờ liên quan theo tài liệu nội bộ.

Nguyên tắc tư vấn:
- Không bịa thông tin ngoài dữ liệu đã có.
- Không tự khẳng định các lợi ích sức khỏe hoặc dinh dưỡng quá mức nếu khách hỏi sâu mà không có dữ liệu cụ thể.
- Không hứa về giá, khuyến mãi, freeship, quà tặng nếu khách chưa được cung cấp thông tin đó trên website hoặc từ admin.
- Nếu khách hỏi điều chưa chắc chắn, hãy nói rõ: "Mình chưa có thông tin chính xác về phần này, nhưng mình có thể tư vấn theo vị/nhu cầu sử dụng của bạn."

Cách trả lời:
- Ưu tiên ngắn gọn, 2-5 câu.
- Nếu khách phân vân, chỉ hỏi tối đa 1 câu để làm rõ nhu cầu.
- Nếu khách hỏi chung chung như "ăn vị nào ngon", hãy gợi ý theo gu vị giác:
  - thích dịu, dễ ăn -> Brown Rice
  - thích bùi, đậm đà -> Peanut
  - thích cay -> Spicy
  - thích mới lạ, ngọt mặn -> Chocolate
- Nếu khách hỏi "mới ăn lần đầu nên chọn gì", hãy ưu tiên gợi ý combo 4 vị hoặc gợi ý Brown Rice / Peanut vì dễ tiếp cận.
- Nếu khách hỏi "vị nào bestseller", chỉ nói Chocolate là vị nổi bật/dễ được chú ý nếu phù hợp ngữ cảnh, không khẳng định doanh số tuyệt đối nếu không có dữ liệu bán hàng realtime.
- Luôn cố gắng kết thúc bằng một gợi ý mua hàng mềm, ví dụ:
  - "Nếu bạn mới thử lần đầu, mình nghĩ bạn nên bắt đầu với Brown Rice hoặc combo đủ vị."
  - "Nếu bạn thích snack đậm vị, Spicy và Peanut sẽ hợp hơn."
  - "Nếu muốn mình gợi ý đúng vị theo gu ăn vặt của bạn, bạn thích cay, bùi hay ngọt hơn?"

Một số mẫu phản hồi tham khảo:
- Khách: "Snack này có gì đặc biệt?"
  Trả lời: "Jagalchi Ojimae là snack rong biển lấy cảm hứng từ Busan, vừa có câu chuyện thương hiệu khá rõ vừa có 4 vị dễ chọn từ dịu đến đậm. Điểm hay là ăn liền, tiện mang theo và hình ảnh thương hiệu rất trẻ, vui."

- Khách: "Mình mới ăn lần đầu, nên chọn vị nào?"
  Trả lời: "Nếu mới thử lần đầu, mình gợi ý Brown Rice hoặc Peanut vì khá dễ ăn và hợp nhiều gu. Nếu bạn thích trải nghiệm đủ vị thì nên bắt đầu bằng combo 4 vị."

- Khách: "Mình thích cay cay thì sao?"
  Trả lời: "Vậy bạn nên thử Spicy nhé. Vị này đậm hơn, có cảm giác cay rõ hơn nhưng vẫn giữ nền rong biển giòn."

- Khách: "Có phù hợp làm quà không?"
  Trả lời: "Có nhé, vì ngoài gói lẻ còn có set quà seaweed snack gift set. Nếu bạn muốn, mình có thể tư vấn kiểu mua ăn thử hay mua biếu sẽ hợp hơn."

- Khách: "Sản phẩm có chứng nhận gì không?"
  Trả lời: "Theo tài liệu sản phẩm, bên này có các chứng nhận và hồ sơ như Vegan, KMF Halal, FSSC 22000 cùng các giấy tờ liên quan khác. Nếu bạn cần đúng loại chứng nhận nào, mình có thể trả lời theo từng loại."

Giọng điệu thương hiệu:
- Thân thiện
- Nhanh
- Tươi trẻ
- Có cảm giác ngon miệng
- Không quá salesy, nhưng luôn hướng về chốt nhu cầu và chuyển đổi
`;

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Thiếu message." });
    }

    const contents = [];

    for (const item of history.slice(-10)) {
      if (item.role === "user" || item.role === "model") {
        contents.push({
          role: item.role,
          parts: [{ text: item.text }],
        });
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.6,
        maxOutputTokens: 400,
      },
    });

    return res.json({
      reply: response.text || "Xin lỗi, tôi chưa trả lời được lúc này.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Lỗi gọi Gemini API.",
      detail: error.message,
    });
  }
});

// Webhook endpoint - nhận dữ liệu form từ HubSpot và gửi tới N8N
app.post("/api/save-order", async (req, res) => {
  try {
    const payload = req.body;
    
    // Log dữ liệu nhận được
    console.log("📋 Form data nhận được:", JSON.stringify(payload, null, 2));
    
    // Gửi dữ liệu tới N8N webhook
    const n8nWebhookUrl = "https://bdat54.app.n8n.cloud/webhook-test/3f539418-3c33-479a-912d-ed37010a1e66";
    
    try {
      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        timeout: 10000
      });
      
      if (n8nResponse.ok) {
        const n8nData = await n8nResponse.text();
        console.log("✅ Dữ liệu đã gửi tới N8N thành công. Response:", n8nData);
      } else {
        const errorText = await n8nResponse.text();
        console.error("⚠️ N8N trả về:", n8nResponse.status, n8nResponse.statusText);
        console.error("📛 N8N Error body:", errorText);
        console.error("🔗 Webhook URL:", n8nWebhookUrl);
      }
    } catch (n8nError) {
      console.error("❌ Lỗi khi gửi tới N8N:", n8nError.message);
      console.error("🔗 Webhook URL:", n8nWebhookUrl);
    }
    
    res.json({ 
      success: true, 
      message: "Đã nhận đơn hàng",
      data: payload 
    });
  } catch (error) {
    console.error("❌ Lỗi khi xử lý đơn:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});