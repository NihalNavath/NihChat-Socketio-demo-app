const { createReadStream } = require("fs");
const fsPromises = require("fs/promises");
const { createInterface } = require("readline");
async function read(input, maxLineCount) {
	await fsPromises.stat(input).then((stat) => {
		if (!stat.isFile()) {
			throw new Error("file does not exist");
		}
	});
	const fileStream = createReadStream(input);
	const rl = createInterface({
		input: fileStream,
		crlfDelay: Infinity,
	});
	const lines = [];
	for await (const line of rl) {
		lines.push(line);
		if (maxLineCount && lines.length >= maxLineCount) {
			rl.close();
			rl.removeAllListeners();
			return lines;
		}
	}
	return lines;
}
async function readFromEnd(input, maxLineCount) {
	const NEW_LINE_CHARACTERS = ["\n"];
	const readPreviousCharacter = function (stat, file, currentCharacterCount) {
		return file
			.read(Buffer.alloc(1), 0, 1, stat.size - 1 - currentCharacterCount)
			.then((bytesReadAndBuffer) => {
				return String.fromCharCode(bytesReadAndBuffer.buffer[0]);
			});
	};
	return new Promise((resolve, reject) => {
		let self = {
			stat: null,
			file: null,
		};

		fsPromises
			.stat(input)
			.then((exists) => {
				if (!exists.isFile()) {
					throw new Error("file does not exist");
				}
			})
			.then(() => {
				let promises = [];
				promises.push(
					fsPromises.stat(input).then((stat) => (self.stat = stat))
				);
				promises.push(
					fsPromises
						.open(input, "r")
						.then((file) => (self.file = file))
				);
				return Promise.all(promises);
			})
			.then(() => {
				let chars = 0;
				let lineCount = 0;
				let lines = "";
				const whileLoop = function () {
					if (lines.length > self.stat.size) {
						lines = lines.substring(lines.length - self.stat.size);
					}

					if (
						lines.length >= self.stat.size ||
						lineCount >= maxLineCount
					) {
						if (
							NEW_LINE_CHARACTERS.includes(lines.substring(0, 1))
						) {
							lines = lines.substring(1);
						}
						self.file.close();
						return resolve(
							Buffer.from(lines, "binary")
								.toString("utf-8")
								.split("\n")
						);
					}

					return readPreviousCharacter(self.stat, self.file, chars)
						.then((nextCharacter) => {
							lines = nextCharacter + lines;
							if (
								NEW_LINE_CHARACTERS.includes(nextCharacter) &&
								lines.length > 1
							) {
								lineCount++;
							}
							chars++;
						})
						.then(whileLoop);
				};
				return whileLoop();
			})
			.catch((err) => {
				if (self.file !== null) {
					self.file.close().catch(() => {});
				}
				return reject(err);
			});
	});
}
module.exports = { read, readFromEnd };
