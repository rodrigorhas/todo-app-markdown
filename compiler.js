const fs = require("fs");
const defaultFileNameToDigest = "log.txt";

var filePath = process.argv[2];

if(!filePath) {
	filePath = process.cwd() + "/" + defaultFileNameToDigest;
	
	if (!fs.existsSync(filePath)) {
	}
}

var HTML = {
	br: "<br />"
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
	return (row) ? row.replace(/\t/g, "") : row;
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
	return (row) ? row.replace(/\s+/, " ") : row;
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

	var SYMBOL_REGEX = /\$|\-\>|\<\-|\#|\-|\*|\=\>/;

	var multilineMode = false;

	var multilineBuffer = {
		startLoop: null,
		stopLoop: null,
		string: "",
		buffering: false,

		clear: function () {
			this.startLoop = null;
			this.stopLoop = null;
			this.buffering = false;
			this.string = "";
		}
	};

	var doc = null;

	var getSymbols = function (row) {
		return row.match(SYMBOL_REGEX);
	}

	var removeSymbols = function (row) {
		return row.replace(SYMBOL_REGEX, "");
	}

	var createListItem = function (row, avoidChangeValue) {
		var li = {id: ++$index, children: [], tags: []};

		var r = removeTabs(row);

		var hasSymbol = false;

		r = r.replace(SYMBOL_REGEX, function () {

			hasSymbol = true;

			console.log("[ROW SYMBOL] :: ", arguments[0]);

			switch(arguments[0]) {
				case "$":
				li.important = true;
				break;

				case "-":
				li.type = "normal";
				break;

				case "*":
				li.type = "ul";
				break;

				case "->":
				if(!avoidChangeValue)
					multilineMode = true;
				break;

				case "<-":
				if(!avoidChangeValue)
					multilineMode = false;
				break;

				case "=>":
				li.answer = true;
				break;

				case "#":
				if(!avoidChangeValue)
					hide = true;
				break;

				case "|":
				break;
			}

			return "";
		});

		if(!hasSymbol && !multilineMode) {
			console.log("sem symbol e fora do mtlmode");
			return;
		}

		if(!avoidChangeValue && multilineMode && !multilineBuffer.buffering) {
			console.log("[MTLM] :: ", "on");
			multilineBuffer.startLoop = $loop;

			var multilineTemplate = doc.slice($loop -1).join('\n').match(/\-\>([^\<\-]+)\<\-/);

			if(multilineTemplate) {
				multilineTemplate = multilineTemplate[0]
				.replace(/(\W)+?\-\>/, "")
				.replace(/\-\>(\W)+?/, "")
				.replace(/(\t)+?\<\-/, "")
				.replace(/\<\-(\t)+?/, "");

				multilineBuffer.string = multilineTemplate.split('\n');

				// count including empty rows
				multilineBuffer.stopLoop = multilineBuffer.startLoop + multilineBuffer.string.length;

				// skip empty rows
				multilineBuffer.string = multilineBuffer.string.filter(function (a) {if(/\w+[^\\t]/.test(a)) return a});
			}

			console.log(multilineBuffer);

			return;
		}

		if(hide) return;

		console.log("[ITEM NORMAL]");

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

		var getFirstWordPosition = function (row) {
			var m = row.match(/\w/);
			return (m) ? m.index : 0;
		}

		li.text = r.substring(getFirstWordPosition(r));

		console.log(li);

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
		doc = file.split(/\n/g);

		function startProcess ($arr) {
			for (var index = 0; index < $arr.length; index++) {
				var row = $arr[index];

				++$loop;

				console.log('[LOOP] :: ', $loop);

				if(multilineMode) {
					console.log("[MTLM ON]");
					var buffer = multilineBuffer;

					processMultline(buffer.string);

					multilineMode = false;
				}

				if(
					multilineBuffer.stopLoop &&
					multilineBuffer.stopLoop != $loop &&
					multilineBuffer.stopLoop > $loop) {
					console.log("[SKIP]");
				continue;
			}

			if(multilineMode) {
				multilineMode = false;
				multilineBuffer.clear();
			}

			if(!row.length) continue;

				// set vars 

				var currentDepth = countMatch(row, "\t");
				var nextRow = doc[index + 1];
				var nextDepth = (nextRow) ? countMatch(nextRow, "\t") : null;
				var prevRow = doc[index - 1];
				var prevDepth = (prevRow) ? countMatch(prevRow, "\t") : null;

				var checkDepth = function () {return nextDepth && (nextDepth > currentDepth)};
				var prevCheckDepth = function () {return prevDepth && (prevDepth < currentDepth || prevDepth == currentDepth)};

				var checkIfNeedChangeDepth = function ($li) {
					if(checkDepth()) {
						lastObj = $li;
						trace.add(lastObj);
					}
				}

				var getRow = function ($index) {

					var $r;

					if(typeof $index == "string") {
						$r = $index;
					}

					else {
						$r = (!$index) ? nextRow : doc[$index];
					}

					if(!$r) return null;

					var dig = removeTabs($r)
					var symbs = getSymbols(dig);
					symbs = (symbs) ? symbs[0] : "";
					dig = removeSymbols(dig);

					return {
						raw: $r,
						digested: dig,
						line: $loop,
						depth: countMatch($r, "\t"),
						symbol: symbs
					}
				}

				processRow(row);

				function processMultline (row) {
					console.log("[START PROCESSING MTLM]");
					var tempRow = [];
					var buffer = multilineBuffer;
					var diff = buffer.stopLoop - buffer.startLoop;

					if(diff) {
						var l = -1;

						while(typeof ++l == "number") {

							// minus 1 to get first multiline row
							// var $nextRow = getRow(buffer.startLoop - 1 + l);

							console.log('[WHILE] :: ' + l);

							var $nextRow = getRow(row[l]);

							console.log("[$nextRow.symbol] :: ", $nextRow.symbol || "null symbol");

							if($nextRow && $nextRow.symbol == "") {
								console.log("<ROW:"+l+">", $nextRow.digested);
								tempRow.push($nextRow.digested);
							}

							else {
								console.log("[WARNING] :: ", "<loop:" + $loop +">" , "<loop interno:" + l +">", $nextRow);
								break;
							}

							if(l == row.length) break;
						}

						//console.log("[MULTLINE TEXT] :: ", tempRow);

						if(tempRow.length) {
							//console.log("[GENERATED LI] :: ", createListItem(tempRow.join("<br>"), true));
							//console.log("[MULTLINE TEXT] :: ", tempRow);

							var li = createListItem(tempRow.join(HTML.br), true);
							lastObj.children.push(li);

							checkIfNeedChangeDepth(li);
						}
					}
				}

				function processRow ($row) {
					if(currentDepth) {

						if(prevCheckDepth() == false) hide = false;

						// changes hide value
						var li = createListItem($row, false);

						if(hide || multilineMode) return;

						var dres = depth.hasChange(currentDepth);

						if(!li) {
							throw new Error("Missing <LI> on loop ", $loop);
						}

						if(!lastObj) {
							lastObj = trace.last();
						}

						if(dres) {
							if(dres == "+") {
								lastObj.children.push(li);

								li.children = [];

								checkIfNeedChangeDepth(li);
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

							checkIfNeedChangeDepth(li);
						}
					}
				}
			};

			console.info("[COMPILED AT " + new Date().getTime() + "]");

			fs.writeFile("app.json", JSON.stringify(data, null, 2), "utf8", (err) => {
				if(err)
					throw err
			})
		}

		startProcess(doc);
	})
}

module.exports = init;