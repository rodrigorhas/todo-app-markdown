const fs = require("fs");
const defaultFileNameToDigest = "log.txt";

var filePath = process.argv[2];

if(!filePath) {
	filePath = process.cwd() + "/" + defaultFileNameToDigest;
	
	if (!fs.existsSync(filePath)) {
	}
}

var depth = [null, 1];

depth.last = function () {
	return this[1];
}

depth.oldDepth = function () {
	return this[0];
}

depth.hasChange = function (given) {
	if(this.last() != given) {
		var res = "";

		if(given > this.last()) {
			res = "+";
		}

		else {
			res = "-";
		}

		this[0] = this[1];
		this[1] = given;

		return res;
	}

	return false;
}

var matchTag = function (row) {
	var res = row.match(/\#\[(.*?)\]/);

	if(res)
		return {text: res[1], index: res[2]};
	else
		return false;
}

var countMatch = function (row, str) {
	return row.split(str).length || 0;
}

var removeTabs = function (row) {
	return row.replace(/\t/g, "");
}

var Tag = function (text, color) {
	return {text: text, color: color || "default"};
}

var extractTags = function (row) {
	var res = {
		matches: []
	};

	row = row.replace(/\[(.*?)\]/g, function (all, text) {
		if(text) {
			text = text.toLowerCase();
			switch(text) {
				case "concluido":
				text = new Tag(text, "success");
				break;

				case "em andamento":
				text = new Tag(text, "warning");
				break;

				default:
				text = new Tag(text, "info");
				break;
			}

			res.matches.push(text);

			// remove tag from string
			return "";
		}
	});

	res.row = row;

	return res;
}

var trim = function (row) {
	if(row)
		return row.replace(/\s+/, " ");
}

function init () {
	var $loop = 0;
	var $index = 0;
	var createUnorderedList = function () {
		return {id: ++$index, children: []};
	};
	var data = createUnorderedList();
	var lastObj = data;
	var trace = [data];
	var hide = false;

	var createListItem = function (row, index) {
		var li = {id: ++$index, children: [], tags: []};

		var r = removeTabs(row);
		var symbol = r[0];

		switch(symbol) {
			case "$":
			li.important = true;
			break;

			case "-":
			li.important = false;
			break;

			case "#":
			hide = true;
			break;

			case "|":
			break;
		}


		if(hide) return;

		var extractedTags = extractTags(r);

		r = trim(extractedTags.row);

		if(extractedTags.matches.length) {
			li.tags = extractedTags.matches;
		}

		else { // add default tag [em aberto]
			li.tags = [new Tag("em aberto", "danger")];
		}

		if(li.important) {
			li.tags.push(new Tag("urgente", "important"))
		}

		if(li.tags.length > 1) li.tags.sort();

		li.text = r.substring(2);

		return li;
	}

	trace.last = function () {
		var l = this.slice(-1);
		return (l.length) ? l[0] : data;
	}

	trace.parent = function () {
		this.pop();
		return this.last();
	}

	trace.add = function (o) {
		this.push(o);
	}

	fs.readFile(filePath, 'utf8', (err, file) => {
		var doc = file.split(/\n/g);

		doc = doc.filter(row => {
			return (row) ? row : false;
		});

		for (var index = 0; index < doc.length; index++) {
			var row = doc[index];

			++$loop;

			var currentDepth = countMatch(row, "\t");
			var nextRow = doc[index + 1];
			var nextDepth = (nextRow) ? countMatch(nextRow, "\t") : null;
			var prevRow = doc[index - 1];
			var prevDepth = (prevRow) ? countMatch(prevRow, "\t") : null;

			var checkDepth = function () {return nextDepth && (nextDepth > currentDepth)};
			var prevCheckDepth = function () {return prevDepth && (prevDepth < currentDepth || prevDepth == currentDepth)};

			if(currentDepth) {

				if(prevCheckDepth() == false) hide = false;

				// changes hide value
				var li = createListItem(row, index);

				if(hide) continue;

				var dres = depth.hasChange(currentDepth);

				var checkIfNeedChangeDepth = function () {
					if(nextDepth && checkDepth()) {
						lastObj = li;
						trace.add(lastObj);
					}
				}

				if(!lastObj) {
					lastObj = trace.last();
				}

				if(dres) {
					if(dres == "+") {
						lastObj.children.push(li);

						li.children = [];

						checkIfNeedChangeDepth();
					}

					else if(dres == "-") {
						var diff = depth.oldDepth() - depth.last();

						if(diff) {
							for (var i = diff - 1; i >= 0; i--) {
								lastObj = trace.parent();
							}

						}

						lastObj.children.push(li);
					}
				}

				else {
					lastObj.children.push(li);

					checkIfNeedChangeDepth();
				}
			}
		};

		console.info("[COMPILED AT " + new Date().getTime() + "]");

		fs.writeFile("app.json", JSON.stringify(data, null, 2), "utf8", (err) => {
			if(err)
				throw err
		})
	})
}

module.exports = init;