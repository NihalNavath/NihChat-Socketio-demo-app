const inputField = document.getElementById("chat-box");
const emojiContainer = document.getElementById("emoji-container");

let emojiUsing;
let emojiData;
let emojiDataArray;

let SelectedEmojiNumber;

//get emojis
getEmojis();
function getEmojis() {
	fetch("/api/emojidata", {
		method: "GET",
	})
		.then((response) => {
			return response.json();
		})
		.then((res) => {
			emojiData = res;
			emojiDataArray = Object.keys(emojiData);
		});
}

inputField.onkeyup = (e) => {
	if (!e.key) {
		return;
	}
	if (e.key === ":") {
		emojiUsing = true;
	} else if (e.key === "Enter" && emojiUsing) {
		replaceTextWithEmoji();
	} else if (e.key === "ArrowRight" || (e.key === "ArrowLeft" && emojiUsing)) {
		e.preventDefault();
		selectorUtil(e);
	} else if (emojiUsing) {
		emojiSuggest();
	}
};

function emojiSuggest() {
	const str = inputField.value;
	if (!str.match(/:/g)) {
		if (emojiContainer.innerHTML.length > 1) {
			emojiContainer.innerHTML = "";
		}
		return;
	}
	const tempojiSearch = str.substr(str.indexOf(":") + 1);
	const emojiSearch = tempojiSearch
		.split(":")
		.pop()
		.split(/(?<=^\S+)\s/, 1)[0]
		.toLocaleLowerCase();
	//console.log(emojiSearch);
	if (!emojiSearch) {
		return;
	}

	const suggestions = emojiDataArray.filter(function (data) {
		return data.toLocaleLowerCase().startsWith(emojiSearch);
	});
	showPossibleSuggestions(suggestions);
}

function showPossibleSuggestions(suggestions) {
	if (suggestions) {
		emojiContainer.innerHTML = "";
		const sug = suggestions.map((data) => {
			return (data = '<div class="emoji clickable">' + emojiData[data] + "</div>");
		});
		for (var i = 0; i < sug.length; i++) {
			emojiContainer.innerHTML += sug[i];
		}

		emojiContainer.childNodes[0].style.border = "1px solid red";
		SelectedEmojiNumber = 0;
	}
}

//Selector util
function selectorUtil(event) {
	if (SelectedEmojiNumber || SelectedEmojiNumber === 0) {
		emojiContainer.childNodes[SelectedEmojiNumber].style.border = null;
		switch (event.key) {
			case "ArrowLeft":
				SelectedEmojiNumber === 0
					? (SelectedEmojiNumber = emojiContainer.childElementCount - 1)
					: (SelectedEmojiNumber -= 1);
				emojiContainer.childNodes[SelectedEmojiNumber].style.border = "1px solid red";
				break;
			case "ArrowRight":
				emojiContainer.childElementCount - 1 < SelectedEmojiNumber + 1
					? (SelectedEmojiNumber = 0)
					: (SelectedEmojiNumber += 1);
				emojiContainer.childNodes[SelectedEmojiNumber].style.border = "1px solid red";
				break;
		}
	}
}

emojiContainer.addEventListener("click", (e) => {
	if (e.target.classList.contains("emoji")) {
		inputField.value =
			inputField.value.substr(0, inputField.value.lastIndexOf(":")) + e.target.innerText;
		emojiContainer.innerHTML = "";
		emojiUsing = false;
	}
});

function replaceTextWithEmoji() {
	const selectedEmoji = emojiContainer.childNodes[SelectedEmojiNumber].innerHTML;
	inputField.value =
		inputField.value.substr(0, inputField.value.lastIndexOf(":")) + selectedEmoji;
	emojiContainer.innerHTML = "";
	emojiUsing = false;
}
