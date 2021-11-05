//check if username is saved in local storage
const lsName = "autologin";
const lsUsername = localStorage.getItem("username");
let currentPref = localStorage.getItem(lsName)
	? Boolean(parseInt(localStorage.getItem(lsName)))
	: null;

if (lsUsername) {
	const usernameField = document.getElementById("name");
	usernameField.value = lsUsername;

	autoLogin();
}

function autoLogin() {
	if (currentPref) {
		document.getElementById("login-btn").click();
	}
}

// eslint-disable-next-line no-unused-vars
function setAutoLogin() {
	if (typeof Storage === "undefined") {
		return showError("sorry but your browser does not have local storage capability.");
	}

	currentPref = localStorage.getItem(lsName)
		? Boolean(parseInt(localStorage.getItem(lsName)))
		: null;
	if (!currentPref) {
		localStorage.setItem(lsName, 1);
	} else {
		localStorage.removeItem(lsName);
	}
}

// eslint-disable-next-line no-unused-vars
function connect() {
	const usernameField = document.getElementById("name");
	const username = usernameField.value;

	fetch("/api/usernamecheck", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ username }),
	})
		.then((response) => {
			return response.json();
		})
		.then((res) => {
			if (res.error) {
				showError(res.error);
			} else {
				localStorage.setItem("username", username);
				document.cookie = `socket_username=${username}`;
				location.href = "/mainapp";
			}
		});
}

function showError(error) {
	const errorDiv = document.getElementById("error");
	errorDiv.innerHTML = error;
}
