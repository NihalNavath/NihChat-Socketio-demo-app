// DOM Elements
const chatDiv = document.getElementById("chat-area");
const clientErrorDiv = document.getElementById("client-error");
const clientErrorText = document.getElementById("error-contents");
const clientHideButton = document.getElementById("hide-error");
const usernameField = document.getElementById("name");
const onlineList = document.getElementById("online-list");
const onlineUsersPanel = document.getElementById("online-list-names");
const onlineUsersPanel2 = document.getElementById("online-list-names2");
const messageContainer = document.getElementById("message-container");
const chatField = document.getElementById("chat-box");
const settingsCog = document.getElementById("gui-settings");
const settingsPanel = document.getElementById("settings-menu");
const errorDiv = document.getElementById("error");
const srcDiv = document.getElementById("source-text-container");
const totalOnline = document.getElementById("online-list");
const loginDiv = document.getElementById("login");
const onlineButton = document.getElementById("status-online");
const awayButton = document.getElementById("status-away");
const dndButton = document.getElementById("status-dnd");
const connectingDiv = document.getElementById("connecting-message");
const messageContainerBorder = document.getElementById(
	"message-container-border"
);
const attempts = document.getElementById("attempt-number");
const pinButton = document.getElementById("pinbutton");
const clearChatButton = document.getElementById("clear-messages");
const promptDiv = document.getElementById("client-prompt");
const promptDivTitle = document.getElementById("prompt-title");
const promptDivText = document.getElementById("prompt-text");
const promptButtonYes = document.getElementById("prompt-button-yes");
const promptButtonNo = document.getElementById("prompt-button-no");
// Variables
const enableUserList = true;
let firstConnect = true;
let pinned = false;
let settingsGuiOpened = false;

//Local storage
const lsUsername = localStorage.getItem("username");
if (lsUsername) {
	usernameField.value = lsUsername;
}
const lsStatus = localStorage.getItem("status");

const statusesDivName = {
	0: "status-online",
	1: "status-away",
	2: "status-dnd",
};

// Connection related
function connect() {
	if (!firstConnect) {
		return;
	}
	let stop = false;
	const username = usernameField.value;
	localStorage.setItem("username", username);
	socket = io({
		auth: {
			username: username,
			status: lsStatus,
		},
		transports: ["websocket"],
		reconnection: false,
		autoConnect: false,
	});
	let status = lsStatus || 0;
	socket.on("newMessage", function (data) {
		switch (data.type) {
			case "SYSTEM": {
				systemMessage(data);
				break;
			}
			case "USER": {
				normalMessage(data);
				break;
			}
			default: {
				alert(
					"Received unknown message! Is app out of date? Reloading!"
				);
				location.reload();
				return;
			}
		}
		messageContainerBorder.scrollTop =
			messageContainerBorder.scrollHeight -
			messageContainerBorder.clientHeight;
	});

	socket.on("history", (historyEntries) => {
		for (const historyEntry of historyEntries) {
			switch (historyEntry.type) {
				case "SYSTEM": {
					systemMessage(historyEntry);
					break;
				}
				case "USER": {
					normalMessage(historyEntry);
					break;
				}
				default: {
					alert(
						"Received unknown message! Is app out of date? Reloading!"
					);
					location.reload();
					return;
				}
			}
		}
	});

	socket.on("users", (data) => {
		updateUsers(data.length, data);
	});

	socket.io.on("close", () => {
		if (stop || socket.reconnecting) {
			return;
		}
		reconnect(socket, 0);
	});

	socket.io.on("close", () => {
		if (stop) {
			return;
		}
		connectingDiv.style.display = "block";
		chatDiv.style.filter = "blur(2px)";
		chatDiv.style.pointerEvents = "none";
		systemMessage({
			text: "Disconnected! Reconnecting.....",
			color: "blue",
		});
	});

	socket.on("connect", () => {
		if (stop) {
			return;
		}
		if (!firstConnect) {
			connectingDiv.style.display = "none";
			chatDiv.style.filter = "none";
			chatDiv.style.pointerEvents = "all";
			systemMessage({
				text: "Reconnected!",
				color: "blue",
			});
		} else {
			loginDiv.style.display = "none";
			chatDiv.style.display = "block";
			document.body.style.backgroundColor = "white";
			firstConnect = false;
			srcDiv.style.display = "none";
			const currentStatusDiv = document.getElementById(
				statusesDivName[status]
			);
			currentStatusDiv.style.backgroundColor = "grey";
			onlineButton.addEventListener("click", function (e) {
				const num = 0;
				socket.emit("status", num);
				localStorage.setItem("status", num);
				const lastStatusDiv = document.getElementById(
					statusesDivName[status]
				);
				lastStatusDiv.style.backgroundColor = "";
				const currentStatusDiv = document.getElementById(
					statusesDivName[num]
				);
				currentStatusDiv.style.backgroundColor = "grey";
				status = num;
			});
			awayButton.addEventListener("click", function (e) {
				const num = 1;
				socket.emit("status", num);
				localStorage.setItem("status", num);
				const lastStatusDiv = document.getElementById(
					statusesDivName[status]
				);
				lastStatusDiv.style.backgroundColor = "";
				const currentStatusDiv = document.getElementById(
					statusesDivName[num]
				);
				currentStatusDiv.style.backgroundColor = "grey";
				status = num;
			});
			dndButton.addEventListener("click", function (e) {
				const num = 2;
				socket.emit("status", num);
				localStorage.setItem("status", num);
				const lastStatusDiv = document.getElementById(
					statusesDivName[status]
				);
				// lastStatusDiv.style.backgroundColor = "none";
				// delete lastStatusDiv.style.backgroundColor;
				lastStatusDiv.style.backgroundColor = "";
				const currentStatusDiv = document.getElementById(
					statusesDivName[num]
				);
				currentStatusDiv.style.backgroundColor = "grey";
				status = num;
			});
			chatField.addEventListener("keyup", function (e) {
				const message = chatField.value;
				if (e.key == "Enter" && message.trim() != "") {
					if (message.trim().length > 500) {
						showError(
							"Message is too long! It can't exceed 500 characters in length"
						);
						return;
					}
					sendMessage(socket, message.trim());
					chatField.value = "";
				}
			});
		}
	});

	socket.on("connect_error", (error) => {
		if (stop || socket.reconnecting) {
			return;
		}
		if (error.data?.usernameRelated) {
			if (!firstConnect) {
				alert(error.message + " Reloading!");
				return location.reload();
			}
			const text = error.message.fontcolor("red");
			errorDiv.style.fontSize = "20px";
			if (errorDiv.innerHTML) {
				errorDiv.textContent = "";
			}
			errorDiv.innerHTML = text;
			errorDiv.style.backgroundColor = "lightblue";
			stop = true;
		} else {
			alert(`Error detected! ${error}`);
			return location.reload();
		}
	});

	socket.connect();
}

function reconnect(socket, attemptsNumber) {
	if (++attemptsNumber > 10) {
		alert("Cannot reconnect! Reloading!");
		return location.reload();
	}
	attempts.innerHTML = `Attempt ${attemptsNumber}/10`;
	socket.reconnecting = true;
	socket.io.open((err) => {
		if (err) {
			setTimeout(() => reconnect(socket, attemptsNumber), 2000);
		}
		socket.reconnecting = false;
	});
}
// Online list and user related
function updateUsers(num, users) {
	onlineList.innerHTML = `Total Online - ${num}`;
	if (enableUserList) {
		updateList(users);
	}
}
function updateList(users) {
	onlineUsersPanel2.innerHTML = users
		.map((v) => `<p class="online-list-name">${v}</p>`)
		.join("");
}

function showPanel() {
	onlineUsersPanel.style.width = "250px";
}

function hidePanel() {
	if (!pinned) {
		onlineUsersPanel.style.width = "0px";
	}
}

function pin() {
	pinbutton.innerHTML = (pinned = !pinned)
		? (pinbutton.innerHTML = "📍")
		: (pinbutton.innerHTML = "📌");
}
// Message related
function sendMessage(socket, message) {
	socket.emit("newMessage", message);
}

function systemMessage(data) {
	const p = document.createElement("p");
	p.className = "system-message";
	p.innerHTML = data.text;
	p.style.color = data.color;
	messageContainer.appendChild(p);
}

function normalMessage(data) {
	const p = document.createElement("p");
	const timestamp = new Date(data.timestamp);
	p.className = "message";
	p.innerHTML = `<b title="${timestamp.getHours()}:${timestamp.getMinutes()}:${timestamp.getSeconds()}">${
		data.username
	}</b>: ${data.message}`;
	messageContainer.appendChild(p);
}

function clearMessages() {
	messageContainer.innerHTML = "";
}
// Utilities
totalOnline.addEventListener("mouseover", showPanel);
onlineUsersPanel.addEventListener("mouseleave", hidePanel);
settingsCog.addEventListener("click", showSettings);
clientHideButton.addEventListener("click", () => {
	clientErrorDiv.style.display = "none";
});
clearChatButton.addEventListener("click", () => {
	prompt(
		"Are You Sure?",
		"Are you sure you want to clear the chat? There is no going back!",
		() => {
			messageContainer.innerHTML = "";
			systemMessage({
				text: "Cleared chat!",
				color: "blue",
			});
		}
	);
});
function sourceCodeOpen() {
	window.open(
		"https://github.com/SegsyNihal/NihChat-Socketio-demo-app",
		"_blank"
	);
}

function showSettings() {
	if (!settingsGuiOpened) {
		settingsPanel.style.display = "block";
		settingsGuiOpened = true;
	} else {
		settingsPanel.style.display = "none";
		settingsGuiOpened = false;
	}
}

function showError(error) {
	clientErrorText.innerText = error;
	clientErrorDiv.style.display = "block";
}

function prompt(title, text, yesAction, noAction) {
	promptDivText.innerHTML = text;
	promptDivTitle.innerHTML = title;
	promptDiv.style.display = "block";
	const yesActionEvent = () => {
		if (yesAction) {
			yesAction();
		}
		promptButtonYes.removeEventListener("click", yesActionEvent);
		promptButtonNo.removeEventListener("click", noActionEvent);
		promptDiv.style.display = "none";
	};
	const noActionEvent = () => {
		if (noAction) {
			noAction();
		}
		promptButtonYes.removeEventListener("click", yesActionEvent);
		promptButtonNo.removeEventListener("click", noActionEvent);
		promptDiv.style.display = "none";
	};
	promptButtonYes.addEventListener("click", yesActionEvent);
	promptButtonNo.addEventListener("click", noActionEvent);
}
