const fs = require("./fs");
const express = require("express");
const PORT = process.env.PORT || 3000;
const { Server } = require("socket.io");
const enableUserList =
	process.env.ENABLE_USER_LIST !== undefined
		? process.env.ENABLE_USER_LIST == 1
			? true
			: false
		: true;
const enableFileHistory =
	process.env.ENABLE_FILE_HISTORY !== undefined
		? process.env.ENABLE_FILE_HISTORY == 1
			? true
			: false
		: false;

const app = express();
const server = new (require("http").Server)(app);
app.use(express.urlencoded({ extended: true }));
app.use(express.json())

let io;
io = new Server(server);

const path = require("path");
const users = new Map();
if (enableFileHistory) {
	fs.readFromEnd("file.log", 50).then((data) => {
		console.log(data);
		for (const entry of JSON.parse("[" + data.join(",") + "]")) {
			sendMessage(entry, null, true);
		}
	});
}
const history = [];
app.use(express.static(path.join(__dirname, "public"), {'extensions': ['html']}));

function checkUserName(username){
	if (!username || username == "") {
		const err = new Error("Please provide a username.");
		err.data = { usernameRelated: true };
		return err;
	}
	if (username.length > 32) {
		const err = new Error("Username too long! Try another username.");
		err.data = { usernameRelated: true };
		return err;
	}
	if (users.has(username)) {
		const err = new Error("Username already taken! Try another username.");
		err.data = { usernameRelated: true };
		return err
	}
	return false
}

io.use((socket, next) => {
	const username = escape(socket.handshake.auth.username);
	err = checkUserName(username)
	if (err){
		return next(err);
	}
	socket.username = username;
	next();
});

io.on("connection", (socket) => {
	console.log(`A user joined! ${socket.username}`);
	const obj = {
		timestamps: [],
		status: socket.handshake.auth.status || 0,
		socket,
	};
	console.log(typeof socket.username)
	users.set(socket.username, obj);
	socket.emit("history", history);
	updateUserList();
	sendMessage({
		type: "SYSTEM",
		color: "green",
		text: `<b>${socket.username}</b> joined the chat!`,
	});
	socket.on("newMessage", (message) => {
		if (!message || message.trim() == "" || typeof(message) !== "string") {
			return;
		}
		if (message.split(/\r|\r\n|\n/).length > 10){
			return sendMessage(
				{
					type: "SYSTEM",
					color: "red",
					text: "Too many new lines! Try to reduce your new lines.",
				},
				socket
			);
		}
		if (obj.timestamps.length > 11) {
			return sendMessage(
				{
					type: "SYSTEM",
					color: "red",
					text: "You are sending messages too fast! Take a break.",
				},
				socket
			);
		}
		const msg = message
		if (msg.length > 500) {
			return sendMessage(
				{
					type: "SYSTEM",
					color: "red",
					text: "You cant send messages longer than 500 characters!",
				},
				socket
			);
		}
		const time = Date.now();
		let i = 0;
		while (time - obj.timestamps[i] > 10000) {
			obj.timestamps.shift();
		}
		obj.timestamps.push(Date.now());
		sendMessage({
			type: "USER",
			username: socket.username,
			message: msg,
		});
	});
	socket.on("disconnect", (reason) => {
		if (users.has(socket.username)) {
			users.delete(socket.username);
			updateUserList();
			sendMessage({
				type: "SYSTEM",
				color: "red",
				text: `<b>${socket.username}</b> left the chat!`,
			});
			console.log(`User ${socket.username} left! Reason: ${reason}`);
		}
	});
	socket.on("status", (number) => {
		if (number in statuses) {
			obj.status = number;
		} else {
			return;
		}
		updateUserList();
	});
	socket.on("sendFile", (file) => {
		const allowedTypes = ["image/png"]
		if (file.size >= 5000000 || !allowedTypes.includes(file.mimeType)){
			return;
		}
		sendFile({
			info: {username: socket.username},
			file: file,
			})
	});
});

function addEntry(data) {
	if (history.length === 300) {
		history.shift();
	}
	history.push(data);
	if (enableFileHistory) {
		fs.append("file.log", JSON.stringify(data) + "\n");
	}
}

function sendMessage(data, socket, raw) {
	if (!raw) {
		data.timestamp = Date.now();
	}
	if (socket) {
		return socket.emit("newMessage", data);
	}
	io.sockets.emit("newMessage", data);
	addEntry(data);
}

//TEST
function sendFile(fileData, socket, raw) {
	console.log("sending file to client");
	if (!raw) {
		fileData.info.timestamp = Date.now();
	}
	if (socket) {
		return socket.emit("newFile", fileData);
	}
	io.sockets.emit("newFile", fileData);
	console.log(fileData);
	//addEntry(data); //make it a dict with a keyword "type" and check if image
}
//TEST

const statuses = {
	0: "🟢",
	1: "🟡",
	2: "🔴",
};

function makeUserList() {
	const arr = [];
	for (const [username, data] of users.entries()) {
		arr.push(`${username} (${statuses[data.status]})`);
	}
	return arr;
}

function updateUserList() {
	if (enableUserList) {
		io.sockets.emit("users", [...makeUserList()]);
	} else {
		io.sockets.emit("users", {
			length: users.size,
		});
	}
}

function escape(s) {
	let replace = {
		"&": "&amp;",
		'"': "&quot;",
		"<": "&lt;",
		">": "&gt;",
	};
	return s.replace(/[&"<>]/g, (c) => replace[c]);
}

app.get('/source', (req , res) => {
	res.redirect("https://github.com/NihalNavath/NihChat-Socketio-demo-app");
})

app.post('/api/usernamecheck', (req , res) => {
	const username = req.body.username

	const check = checkUserName(username)
	if (!check){
		res.json({error: false})
	} else {
		const data = {
			error: check.message,
			usernameRelated: check.data.usernameRelated
		}
		console.log(data)
		res.json(data)
	}
})

server.listen(PORT, () => {
	console.log(`listening on localhost:${PORT}`);
});
