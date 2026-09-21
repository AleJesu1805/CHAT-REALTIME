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
let socket;
let reconnectTimer;

const savedUsername = localStorage.getItem(usernameStorageKey)?.trim();

connect();

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
  sendEvent("user:join", username);
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

  sendEvent("chat:message", message);
  messageInput.value = "";
  sendEvent("chat:typing", false);
});

messageInput.addEventListener("input", () => {
  sendEvent("chat:typing", messageInput.value.trim().length > 0);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => sendEvent("chat:typing", false), 1200);
});

function connect() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${window.location.host}`);

  socket.addEventListener("open", () => {
    connectionStatus.textContent = "Conectado";
    connectionStatus.classList.add("is-connected");

    if (username) {
      sendEvent("user:join", username);
    }
  });

  socket.addEventListener("message", (event) => {
    let message;

    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }

    handleEvent(message.event, message.data);
  });

  socket.addEventListener("close", () => {
    connectionStatus.textContent = "Conexion perdida";
    connectionStatus.classList.remove("is-connected");
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 1500);
  });
}

function sendEvent(event, data) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ event, data }));
  }
}

function handleEvent(event, data) {
  if (event === "users:list") {
    onlineCount.textContent = data.length;
    usersList.replaceChildren(
      ...data.map((user) => {
        const item = document.createElement("li");
        item.className = "user-item";
        item.innerHTML = `<span class="user-avatar">${escapeHtml(user.charAt(0).toUpperCase())}</span><span>${escapeHtml(user)}</span>`;
        return item;
      }),
    );
  }

  if (event === "chat:message") {
    addMessage(data, data.username === username ? "own" : "");
  }

  if (event === "chat:history") {
    messages.replaceChildren();
    data.forEach((message) => {
      addMessage(message, message.username === username ? "own" : "");
    });
  }

  if (event === "system:message") {
    addSystemMessage(data.text);
  }

  if (event === "chat:typing") {
    typingIndicator.textContent = data.isTyping
      ? `${data.username} esta escribiendo...`
      : "";
  }
}

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
