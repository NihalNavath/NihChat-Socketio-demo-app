// DOM Elements
const chatDiv = document.getElementById("chat-area");
const clientErrorDiv = document.getElementById("client-error");
const clientErrorText = document.getElementById("error-contents");
const clientHideButton = document.getElementById("hide-error");
const onlineList = document.getElementById("online-list");
const onlineUsersPanel = document.getElementById("online-list-names");
const onlineUsersPanel2 = document.getElementById("online-list-names2");
const messageContainer = document.getElementById("message-container");
const chatField = document.getElementById("chat-box");
const settingsPanel = document.getElementById("settings-menu");
const srcDiv = document.getElementById("source-text-container");
const totalOnline = document.getElementById("online-list");
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
let userAwayFromChat = false;
let userAwayNotified = false;
let unreadMessages = 0;

let file;



//Local storage
const lsStatus = localStorage.getItem("status");

const statusesDivName = {
	0: "status-online",
	1: "status-away",
	2: "status-dnd",
};

// Connection related
connect()

function connect() {
	if (!firstConnect) {
		return;
	}
	let stop = false;
	const username = readCookie("socket_username")
	if (!username){
		location.href = "/"
	}
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
	socket.on("newFile", function (data) {
		sendImage(data);
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
			firstConnect = false;
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
				if (e.key == "Enter" && file){
					sendFile(file);
					return;
				}
				else if (e.key == "Enter" && !e.shiftKey) {
					preMessageCheck(message)
				}
			});
		}
	});

	socket.on("connect_error", (error) => {
		
		if (stop || socket.reconnecting) {
			return;
		}
		if (error.data?.usernameRelated) {
			alert(error.message + " Reloading!");
			return returnToHome()
		} else {
			alert(`Error detected! ${error}`);
			return returnToHome()
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
		: (pinbutton.innerHsTML = "📌");
}

function selectFile(event){
	if (event.target.files[0].size >= 5000000){
		showError("File is too op! File can't exceed 5 mb in size.")
		return 
	}

	showFilePreview(event.target.files[0])
}

// Message related
function preMessageCheck(message){
	if (!message){
		message = chatField.value;
	}
	if (message.trim() === "" ){
		return chatField.value = "";
	}
	if (message.trim().length > 500) {
		return showError(
			"Message is too long! It can't exceed 500 characters in length"
		);
	}
	if (message.split(/\r|\r\n|\n/).length > 10){
		return showError(
			"Too many white spaces! This looks like spam. Try to reduce the new line count."
		);
	}
	sendMessage(socket, message);
	chatField.value = "";
}

function sendMessage(socket, message) {
	socket.emit("newMessage", message);
}

function sendFile(file){
	file = {
		"file": file,
		"name": file.name,
		"mimeType": file.type,
		"size": file.size
	}
	socket.emit("sendFile", file);
	file = null;
}

function systemMessage(data) {
	if (userAwayFromChat ){
		unreadMessages += 1
		updateTitle()

		if (!userAwayNotified){ 
		userAwayNotified = true
		const awayDiv = document.createElement("div");
		awayDiv.className = "unread-separator"
		awayDiv.setAttribute("aria-label", "unread")
		messageContainer.appendChild(awayDiv);
		}
	}

	const p = document.createElement("p");
	p.className = "system-message";
	p.innerHTML = data.text;
	p.style.color = data.color;
	messageContainer.appendChild(p);
}

function normalMessage(data) {
	if (userAwayFromChat ){
		unreadMessages += 1
		updateTitle()

		if (!userAwayNotified){ 
		userAwayNotified = true
		const awayDiv = document.createElement("div");
		awayDiv.className = "unread-separator"
		awayDiv.setAttribute("aria-label", "unread")
		messageContainer.appendChild(awayDiv);
		}
	}
	const p = document.createElement("p");
	const timestamp = new Date(data.timestamp);
	p.className = "message";
	p.innerHTML = `<b title="${timestamp.getHours()}:${timestamp.getMinutes()}:${timestamp.getSeconds()}">${
		data.username
	}</b>: ${data.message}`;
	messageContainer.appendChild(p);
}

//IMAGE
function sendImage(data) {
	const container = document.createElement("div");
	container.className = "image-container"
	const p = document.createElement("p");
	const timestamp = new Date(data.timestamp);
	p.className = "message";
	p.innerHTML = `<b title="${timestamp.getHours()}:${timestamp.getMinutes()}:${timestamp.getSeconds()}">${
		data.username
	}</b>: ${data.message}`;

	const img = document.createElement("img");
	
	img.className = "img";
	
	const blob = new Blob([file])
	const url = URL.createObjectURL(blob);

	img.src = url;

	container.appendChild(p);
	container.appendChild(img);
	messageContainer.appendChild(container);
}

function showFilePreview(file){
	const blob = new Blob([file])
	const url = URL.createObjectURL(blob);

	document.getElementById("file-preview-container").setAttribute("src", url)
}

function clearMessages() {
	messageContainer.innerHTML = "";
}
// Utilities
document.addEventListener("visibilitychange", newMessageInfo);
totalOnline.addEventListener("mouseover", showPanel);
onlineUsersPanel.addEventListener("mouseleave", hidePanel);

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

function updateTitle(){
	document.title = `(${unreadMessages}) NihChat`
}

function newMessageInfo(){
	switch(document.visibilityState) {
		case "hidden":
		  	userAwayFromChat = true;
			break;
		case "visible":
			userAwayFromChat = false;
			userAwayNotified = false;
			unreadMessages = 0;
			document.title = "NihChat";
			break;
	  }
}

function returnToHome(){
	location.href = "/"
}

function showSettings() {
	settingsPanel.style.display = "block";
}

function readCookie(name) {
	let result = document.cookie.match("(^|[^;]+)\\s*" + name + "\\s*=\\s*([^;]+)")
	return result ? result.pop() : ""
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
