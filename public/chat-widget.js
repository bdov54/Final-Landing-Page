const chatToggle = document.getElementById("chatToggle");
const chatClose = document.getElementById("chatClose");
const chatWidget = document.getElementById("chatWidget");
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");

const chatHistory = [];

if (chatToggle && chatClose && chatWidget && chatMessages && chatForm && chatInput) {
  chatToggle.addEventListener("click", () => {
    chatWidget.classList.toggle("chatWidget--hidden");
  });

  chatClose.addEventListener("click", () => {
    chatWidget.classList.add("chatWidget--hidden");
  });

  function addMessage(text, role) {
    const div = document.createElement("div");
    div.className = `chatBubble chatBubble--${role}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
  }

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const message = chatInput.value.trim();
    if (!message) return;

    addMessage(message, "user");
    chatHistory.push({ role: "user", text: message });
    chatInput.value = "";

    const typing = addMessage("Đang trả lời...", "typing");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          history: chatHistory
        })
      });

      const data = await res.json();
      typing.remove();

      if (!res.ok) {
        addMessage(data.error || "Đã có lỗi xảy ra.", "bot");
        return;
      }

      addMessage(data.reply, "bot");
      chatHistory.push({ role: "model", text: data.reply });
    } catch (error) {
      typing.remove();
      addMessage("Không kết nối được tới máy chủ.", "bot");
    }
  });
}