const fs = require("fs/promises");

async function append(input, text) {
	await fs.appendFile(input, text);
}

async function prepend(input, text) {
	const data = await fs.readFile(input);
	const fd = await fs.open(input, "w+");
	const toInsert = Buffer.from(text);
	await fd.write(toInsert, 0, toInsert.length, 0);
	await fd.write(data, 0, data.length, toInsert.length);
	await fd.close();
}

module.exports = { append, prepend };
