//check if username is saved in local storage
const lsName = "autologin";
const lsUsername = localStorage.getItem("username");
const nameField = document.getElementById("name");
const pwdField = document.getElementById("password");
let currentPref = localStorage.getItem(lsName)
	? Boolean(parseInt(localStorage.getItem(lsName)))
	: null;
let pwdFieldActive;
let adminNames;

let contributorsPageActive = false;

let contributorsPagePopulated = false;

async function populateAdminNames(){
	await fetch("/api/admins")
		.then((response) => {
			return response.json();
		}).then((res) => {
			adminNames = res;
		}	
		);
}

if (lsUsername) {
	const usernameField = document.getElementById("name");
	usernameField.value = lsUsername;

	checkIfAdmin();
	if (!pwdFieldActive) {
		autoLogin();
	} else {
		showError("Auto login is disabled as you are an admin, please login with your password.");
	}
}

function autoLogin() {
	if (currentPref) {
		document.getElementById("login-btn").click();
	}
}

async function checkIfAdmin() {	
	if (!adminNames){
		await populateAdminNames();
	}	
		if (adminNames.includes(nameField.value.toLowerCase())) {
			pwdField.style.display = "block";
			pwdFieldActive = true;
		} else {
			if (pwdFieldActive) {
				pwdField.style.display = "none";
				pwdFieldActive = false;
			}
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

nameField.onkeyup = () => {
	checkIfAdmin();
};

// eslint-disable-next-line no-unused-vars
async function connect() {
	const usernameField = document.getElementById("name");
	const username = usernameField.value.normalize("NFC");

	if (pwdFieldActive) {
		const unAuthorized = await fetch("/api/authorize", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ username: username, password: pwdField.value }),
		})
			.then((response) => {
				return response.json();
			})
			.then((res) => {
				if (!res.result) {
					showError(res.error);
					pwdField.value = "";
					return true;
				} else {
					document.cookie = "socket_token=" + res.token;
				}
			});
		if (unAuthorized) {
			return;
		}
	}

	await fetch("/api/usernamecheck", {
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

//Contributors Code
function showContributorsPage(){
	const ContributorsPage = document.getElementById("contributor-page");
	const contriButton = document.getElementById("contributors-btn");
	if (!contributorsPageActive) {
		if (!contributorsPagePopulated) {
		populateContributors();
		}
	ContributorsPage.style.backgroundColor = "#aaff98";
	contriButton.innerHTML = "❌";

	ContributorsPage.style.opacity = 1;
	ContributorsPage.style.width = "95vw";
	ContributorsPage.style.height = "95vh";
	} else {
		ContributorsPage.style.backgroundColor = "White";
		contriButton.innerHTML = '<img class="contributions-btn" src="/imgs/git-branch.png">';

		ContributorsPage.style.opacity = 0;
		ContributorsPage.style.width = 0;
		ContributorsPage.style.height = 0;
	}
	contributorsPageActive = !contributorsPageActive;
}

async function populateContributors(){
	contributorsPagePopulated = true;
	await fetch("/api/contributors")
	.then((response) => {
		return response.json();
	}).then((res) => {
		res.pop() //poping out the timestamp, which is the last element in the array.
		const contributors = document.getElementById("contributors-div");
		for (let i = 0; i < res.length; i++) {
			const profile = res[i];

			const div = document.createElement("div");
			div.className = "profile";

			div.innerHTML += `<img src="${profile.avatar}">`;
			div.innerHTML += `<h2>${profile.name}</h2>`
			div.innerHTML += `<h4>Contributions:- ${profile.contributions}</h4>`
			div.innerHTML += `<a href='${profile.github_link}'><button class="github-link max-width pointer"></button></a>`

			contributors.appendChild(div);
		}
	});
}