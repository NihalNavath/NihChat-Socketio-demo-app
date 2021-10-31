//check if username is saved in local storage
const lsUsername = localStorage.getItem("username");

if (lsUsername) {
	const usernameField = document.getElementById("name");
	usernameField.value = lsUsername;
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
