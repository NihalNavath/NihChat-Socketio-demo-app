const fs = require("./fs");
const asyncReader = require("fs/promises").readFile;
const express = require("express");
const bcrypt = require("bcryptjs");
const fetch = require('cross-fetch');
const PORT = process.env.PORT || 3000;
const { Server } = require("socket.io");
const app = express();
const server = new (require("http").Server)(app);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const io = new Server(server);
const path = require("path");
const users = new Map();
const usedIds = new Set();
const history = [];
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

let tipList;
let emojiData;
let adminHash;
let adminAuthTokens = [];

let contributors = [];

//Password/Hashing related
const saltRounds = 10;

bcrypt.genSalt(saltRounds, function (err, salt) {
	asyncReader("json/admin.json", { encoding: "utf8" }).then((data) => {
		const adminData = JSON.parse(data);
		adminHash = bcrypt.hashSync(adminData.nihal, salt);
		console.info("Admin hash generated.");
	});
	
});

function checkUserName(_username) {
	const username = replaceSpecialCharacter(escape(_username));
	if (!username || typeof username !== "string" || username === "") {
		const err = new Error("Please provide a username.");
		err.data = { usernameRelated: true };
		return err;
	} else if (username.length > 32) {
		const err = new Error("Username too long! Try another username.");
		err.data = { usernameRelated: true };
		return err;
	} else if (users.has(username)) {
		const err = new Error("Username already taken! Try another username.");
		err.data = { usernameRelated: true };
		return err;
	}
	return false;
}

io.use((socket, next) => {
	// socket.conn is same for multiple sockets over the same connection
	if (usedIds.has(socket.conn.id)) {
		return next(new Error("Already logged in"));
	}
	const username = socket.handshake.auth.username;
	const err = checkUserName(username);
	if (err) {
		return next(err);
	}
	socket.username = username;
	const validLogin = checkIfValidLogin(socket);
	if (!validLogin) {
		return next(new Error("Invalid login, lol you tried."));
	}

	usedIds.add(socket.conn.id);
	next();
});
const validFileTypes = ["image"];
io.on("connection", (socket) => {
	console.log(`A user joined! ${socket.username}`);
	const obj = {
		messageTimestamps: [],
		fileTimestamps: [],
		status: socket.handshake.auth.status || 0,
		socket,
	};
	users.set(socket.username, obj);
	socket.emit("history", history);
	updateUserList();
	sendMessage({
		type: "SYSTEM",
		color: "green",
		text: `<b>${socket.username}</b> joined the chat!`,
	});
	socket.on("newMessage", (message) => {
		if (message && typeof message === "string") {
			message = replaceSpecialCharacter(escape(message.trim()));
		} else {
			return;
		}
		if (message === "") {
			return;
		}
		if (message.length > 500) {
			return sendMessage(
				{
					type: "SYSTEM",
					color: "red",
					text: "You cant send messages longer than 500 characters!",
				},
				socket
			);
		}
		if (message.split(/\r|\r\n|\n/).length > 10) {
			return sendMessage(
				{
					type: "SYSTEM",
					color: "red",
					text: "Too many new lines! Try to reduce your new lines.",
				},
				socket
			);
		}
		const time = Date.now();
		let i = 0;
		while (time - obj.messageTimestamps[i] > 20000) {
			obj.messageTimestamps.shift();
			i++;
		}
		if (obj.messageTimestamps.length > 11) {
			return sendMessage(
				{
					type: "SYSTEM",
					color: "red",
					text: "You are sending messages too fast! Take a break.",
				},
				socket
			);
		}
		obj.messageTimestamps.push(Date.now());
		sendMessage({
			type: "USER",
			username: socket.username,
			message: parseMarkdown(message),
		});
	});
	socket.on("newFile", (file) => {
		if (!file || typeof file !== "object") {
			return;
		}
		if (!file.type || !validFileTypes.includes(file.type)) {
			return;
		}
		if (!file.data) {
			return;
		}
		console.log(file);
		const time = Date.now();
		let i = 0;
		while (time - obj.fileTimestamps[i] > 20000) {
			obj.fileTimestamps.shift();
			i++;
		}
		if (obj.fileTimestamps.length > 11) {
			return sendMessage(
				{
					type: "SYSTEM",
					color: "red",
					text: "You are sending files too fast! Take a break.",
				},
				socket
			);
		}
		obj.fileTimestamps.push(Date.now());
		sendMessage({
			type: "USER",
			username: socket.username,
			message: parseMarkdown(message),
		});
	});
	socket.on("disconnect", (reason) => {
		if (users.has(socket.username)) {
			if (socket.handshake.auth.token && adminAuthTokens.includes(socket.handshake.auth.token)) {
			adminAuthTokens.splice(adminAuthTokens.indexOf(socket.handshake.auth.token), 1);
			}
			users.delete(socket.username);
			usedIds.delete(socket.conn.id);
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
			updateUserList();
		}
	});
});

function addEntry(data) {
	if (history.length === 300) {
		history.shift();
	}
	history.push(data);
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

function sendFile(fileData, socket, raw) {
	if (!raw) {
		fileData.timestamp = Date.now();
	}
	if (socket) {
		return socket.emit("newFile", fileData);
	}
	io.sockets.emit("newFile", fileData);
	addEntry(fileData);
}

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
	io.sockets.emit("users", [...makeUserList()]);
}

function escape(s) {
	let replace = {
		"&": "&amp;",
		'"': "&quot;",
		"'": "&#039;",
		"<": "&lt;",
		">": "&gt;",
	};
	return s.replace(/[&"'<>]/g, (c) => replace[c]);
}

// move functions to utils?
function replaceSpecialCharacter(str) {
	return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function getWelcomeTip() {
	if (!tipList) {
		const data = await asyncReader("json/tips.json", { encoding: "utf8" });
		tipList = JSON.parse(data);
	}

	return tipList ? tipList[Math.floor(Math.random() * tipList.length)] : [];
}

async function cacheEmojiData() {
	const data = await asyncReader("json/emojis.json", { encoding: "utf8" });
	return JSON.parse(data);
}

function parseMarkdown(string) {
	return string.replace(/\*(.*?)\*/gi, '<span style="font-style: italic">$1</span>');
	//add more support, I suck at regex.
}

function checkIfValidLogin(socket) {
	//check if socket.username doesn't contain nihal
	if (!socket.username.includes("nihal")) {
		return true;
	}

	if (!socket.handshake.auth.token) {
		return false;
	}

	if (!adminAuthTokens.includes(socket.handshake.auth.token)) {
		return false;
	} else {
		return true;
	}
}

async function authorize(password) {
	await new Promise((resolve) => setTimeout(resolve, 10));

	return await bcrypt.compare(password, adminHash);
}

async function populateContributors(){
	await fetch("https://api.github.com/repos/NihalNavath/NihChat-Socketio-demo-app/contributors?q=contributions&order=desc")
	.then(res => {
		if (res.status >= 400) {
		  throw new Error("Bad response from server");
		}
		return res.json();
	  })
	  .then(user => {
		for (var i = 0; i < 10; i++){
			if (user[i].type === "User") {
				const dict = {}
				dict.name = user[i].login;
				dict.avatar = user[i].avatar_url;
				dict.contributions = user[i].contributions;
				dict.github_link = user[i].html_url;
				contributors.push(dict);
			}
		}
	  })
	  .catch(err => {
		console.error(err);
	  });
	  contributors[contributors.length] = Date.now();
	console.info("Contributors dict has been populated");
}

app.get("/source", (req, res) => {
	res.redirect("https://github.com/NihalNavath/NihChat-Socketio-demo-app");
});

app.post("/api/usernamecheck", (req, res) => {
	const username = replaceSpecialCharacter(req.body.username);

	const check = checkUserName(username);
	if (!check) {
		res.json({ error: false });
	} else {
		const data = {
			error: check.message,
			usernameRelated: check.data.usernameRelated,
		};
		res.json(data);
	}
});

app.get("/api/randomtip", async (req, res) => {
	const tip = await getWelcomeTip();
	res.json({ tip: tip });
});

app.post("/api/authorize", async (req, res) => {
	const password = req.body.password;
	if (!password) {
		return res.json({ error: "Fucking enter a password bitch :)" });
	}
	if (typeof password !== "string") { 
		return res.json({ error: "Tryin' to crash me huh? Fuck you." });
	}  
	const result = await authorize(password);
	if (!result) {
		res.json({ result: result, error: "Incorrect password or username" });
	} else {
		const token = Math.random().toString(36).substr(2);
		adminAuthTokens.push(token);
		res.json({ result, token });
	}
});

app.get("/api/contributors", async (req, res) => {
	if (!Object.keys(contributors).length || Math.abs(Date.now() - contributors[contributors.length - 1]) > 1000 * 60 * 60 * 24) {
		await populateContributors();
	}
	res.json(contributors);
});

app.get("/api/emojidata", async (req, res) => {
	if (!emojiData) {
		emojiData = await cacheEmojiData();
	}

	res.json(emojiData);
});

server.listen(PORT, () => {
	console.log(`listening on localhost:${PORT}`);
});
