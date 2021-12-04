const inputField = document.getElementById("chat-box");
const emojiContainer = document.getElementById("emoji-container");

let emojiUsing;
let emojiData;
let emojiDataArray;

let emojiSearch;

let SelectedEmojiNumber;
let cursorPosition;

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

	cursorPosition = e.target.selectionStart;
	testIfEmojiKeyword();
	if (e.key === "Enter" && emojiUsing) {
		replaceTextWithEmoji();
	}
	//else if (e.key === "ArrowRight" || (e.key === "ArrowLeft" && emojiUsing)) {
	//e.preventDefault();
	//selectorUtil(e);
	//else if (emojiUsing) {
	//emojiSuggest();
	else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
		testIfEmojiKeyword();
	}
};

function testIfEmojiKeyword() {
	const substr = inputField.value.substr(0, cursorPosition);
	const wordBeforeCursorIsEmoji = substr.charAt(substr.lastIndexOf(" ") + 1) === ":";
	if (wordBeforeCursorIsEmoji) {
		emojiUsing = true;
		return emojiSuggest(substr.slice(substr.lastIndexOf(" ") + 2));
	} else if (!wordBeforeCursorIsEmoji && emojiContainer.innerHTML.length > 1) {
		emojiContainer.innerHTML = "";
	}
	emojiUsing = false;
}

function emojiSuggest() {
	const str = inputField.value;
	if (!str.match(/:/g)) {
		if (emojiContainer.innerHTML.length > 1) {
			emojiContainer.innerHTML = "";
		}
		return;
	}
	const tempojiSearch = cutString(str, cursorPosition).substr(str.indexOf(":") + 1);
	emojiSearch = tempojiSearch
		.split(":")
		.pop()
		.split(/(?<=^\S+)\s/, 1)[0]
		.toLocaleLowerCase();
	if (!emojiSearch) {
		return;
	}

	const suggestions = emojiDataArray.filter(function (data) {
		return data.toLocaleLowerCase().startsWith(emojiSearch);
	});
	showPossibleSuggestions(suggestions);
}

function showPossibleSuggestions(suggestions) {
	if (suggestions && suggestions.length) {
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
//(Disabled for now, todo enable.)
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
		inputField.value = inputField.value.replace(`:${emojiSearch}`, e.target.innerText);
		emojiContainer.innerHTML = "";
		emojiUsing = false;
	}
});

function replaceTextWithEmoji() {
	const selectedEmoji = emojiContainer.childNodes[SelectedEmojiNumber].innerHTML;
	inputField.value = inputField.value.replace(`:${emojiSearch}`, selectedEmoji);
	emojiContainer.innerHTML = "";
	emojiUsing = false;
}

inputField.addEventListener("click", (e) => {
	cursorPosition = e.target.selectionStart;
	testIfEmojiKeyword();
});

function cutString(str, length) {
	if (str.length > length) {
		return str.substr(0, length);
	}
	return str;
}
