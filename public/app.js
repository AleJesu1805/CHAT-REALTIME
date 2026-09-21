const socket = io();
const usernameDialog = document.querySelector("#username-dialog");
const usernameForm = document.querySelector("#username-form");
const usernameInput = document.querySelector("#username-input");
const messageForm = document.querySelector("#message-form");
const messageInput = document.querySelector("#message-input");
const messages = document.querySelector("#messages");
const usersList = document.querySelector("#users-list");
const onlineCount = document.querySelector("#online-count");
const connectionStatus = document.querySelector("#connection-status");
const typingIndicator = document.querySelector("#typing-indicator");
const sendButton = messageForm.querySelector("button");
const usernameStorageKey = "chat-username";

let username = "";
let typingTimeout;

const savedUsername = localStorage.getItem(usernameStorageKey)?.trim();

if (savedUsername && savedUsername.length >= 2) {
  joinChat(savedUsername);
} else {
  usernameInput.focus();
}

usernameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const requestedUsername = usernameInput.value.trim();

  if (requestedUsername.length < 2) {
    usernameInput.setCustomValidity("Escribe al menos 2 caracteres.");
    usernameInput.reportValidity();
    return;
  }

  usernameInput.setCustomValidity("");
  localStorage.setItem(usernameStorageKey, requestedUsername.slice(0, 24));
  joinChat(requestedUsername);
});

function joinChat(requestedUsername) {
  username = requestedUsername.slice(0, 24);
  socket.emit("user:join", username);
  usernameDialog.close();
  messageInput.disabled = false;
  sendButton.disabled = false;
  messageInput.focus();
}

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = messageInput.value.trim();

  if (!message) {
    return;
  }

  socket.emit("chat:message", message);
  messageInput.value = "";
  socket.emit("chat:typing", false);
});

messageInput.addEventListener("input", () => {
  socket.emit("chat:typing", messageInput.value.trim().length > 0);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit("chat:typing", false), 1200);
});

socket.on("connect", () => {
  connectionStatus.textContent = "Conectado";
  connectionStatus.classList.add("is-connected");
});

socket.on("disconnect", () => {
  connectionStatus.textContent = "Conexion perdida";
  connectionStatus.classList.remove("is-connected");
});

socket.on("users:list", (users) => {
  onlineCount.textContent = users.length;
  usersList.replaceChildren(
    ...users.map((user) => {
      const item = document.createElement("li");
      item.className = "user-item";
      item.innerHTML = `<span class="user-avatar">${escapeHtml(user.charAt(0).toUpperCase())}</span><span>${escapeHtml(user)}</span>`;
      return item;
    }),
  );
});

socket.on("chat:message", (message) => {
  addMessage(message, message.username === username ? "own" : "");
});

socket.on("system:message", (message) => {
  addSystemMessage(message.text);
});

socket.on("chat:typing", ({ username: typingUsername, isTyping }) => {
  typingIndicator.textContent = isTyping
    ? `${typingUsername} esta escribiendo...`
    : "";
});

function addMessage(message, type) {
  const article = document.createElement("article");
  article.className = `message ${type}`;
  article.innerHTML = `
    <div class="message-meta"><strong>${escapeHtml(message.username)}</strong><time>${formatTime(message.timestamp)}</time></div>
    <p>${escapeHtml(message.text)}</p>
  `;
  messages.append(article);
  messages.scrollTop = messages.scrollHeight;
}

function addSystemMessage(text) {
  const note = document.createElement("p");
  note.className = "system-message";
  note.textContent = text;
  messages.append(note);
  messages.scrollTop = messages.scrollHeight;
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat("es", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function escapeHtml(value) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#039;",
        '"': "&quot;",
      })[character],
  );
}
