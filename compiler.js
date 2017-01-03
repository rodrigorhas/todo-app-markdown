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

var countMatch = function (row, symbol, str) {
	if(symbol !== "") {
		var splited = row.split(symbol);

		if(splited) {
			splited = splited[0];

			return splited.split(str).length || 0;
		}
	}

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

var getRow = function ($index, $loop, $doc) {

	var res = {
		raw: "",
		digested: "",
		line: null,
		depth: null,
		symbol: ""
	}

	var $r;

	if(typeof $index == "string") {
		$r = $index;
	}

	else {
		$r = (!$index) ? null : $doc[$index];
	}

	if(!$r) return res;

	var dig = removeTabs($r)
	var symbs = getSymbols(dig);
	symbs = (symbs) ? symbs[0] : "";
	dig = removeSymbols(dig);

	return {
		raw: $r,
		digested: dig,
		line: $loop,
		depth: countMatch($r, symbs, "\t"),
		symbol: symbs
	}
}

var getSymbols = function (row) {
	return row.match(SYMBOL_REGEX);
}

var removeSymbols = function (row) {
	return row.replace(SYMBOL_REGEX, "");
}

const SYMBOL_REGEX = /\$|\-\>|\<\-|\#|\-|\*|\=\>/;

var createListItem = function (li) {

	li.details = {};

	var r = removeTabs(li.row);

	var hide = false;

	r = r.replace(SYMBOL_REGEX, function () {

		switch(arguments[0]) {
			case "$":
			li.details.important = true;
			break;

			case "-":
			li.details.type = "normal";
			break;

			case "*":
			li.details.type = "ul";
			break;

			case "->":
				//multilineMode = true;
				li.details.type = "multilineModeOn";
			break;

			case "<-":
				//multilineMode = false;
			break;

			case "=>":
			li.details.answer = true;
			break;

			case "#":
				hide = true;
			break;

			case "|":
			break;
		}

		return "";
	});

	if(hide) return;

	console.log("[ITEM NORMAL]");

	var extractedTags = extractTags(r);

	r = trim(extractedTags.row);

	if(extractedTags.matches.length) {
		li.details.tags = extractedTags.matches;
	}

	else { // add default tag [em aberto]
		li.details.tags = [new Tag("em aberto", "danger")];
	}

	if(li.details.important) {
		li.details.tags.push(new Tag("urgente", "important"))
	}

	if(li.details.tags.length > 1) li.details.tags.sort();

	var getFirstWordPosition = function (row) {
		var m = row.match(/\w/);
		return (m) ? m.index : 0;
	}

	li.details.text = r.substring(getFirstWordPosition(r));

	//console.log(li);

	return li;
}

function init () {
	fs.readFile(filePath, 'utf8', (err, file) => {
		const doc = file.split(/\n/g);

		function start ($arr) {
			var data = [];
			var response = {};

			// #block 1
			var $baseItemUniqueId = 0;
			var $skip = 0;

			var createBaseItem = function (uId) {
				return {id: uId || ++$baseItemUniqueId, children: []}
			}

			var Create = {
				multilineModeOn: function ($arr) {

					var item = {
						id: $arr[0].id,
						children: $arr,
						depth: $arr[0].depth,
						row: $arr[0].row,
						parent: $arr[0].parent,
						digested: $arr[0].digested,
						symbol: $arr[0].symbol,
						details: $arr[0].details,
					}

					var text = "";

					item.children = item.children.filter(function ($item) {
						if($item.details.type == "normal") {
							text += $item.details.text;

							return false;
						}

						return true;
					})

					item.details.text = text;

					item.children = item.children.map(function ($i) {
						$i.parent = item.id;
						return $i;
					});

					item.details.type = "multilineModeOn";

					item.reduced = true;

					return item;
				},

				ul: function ($arr) {

					var item = {
						id: $arr[0].id,
						children: $arr,
						depth: $arr[0].depth,
						row: $arr[0].row,
						parent: $arr[0].parent,
						digested: $arr[0].digested,
						symbol: $arr[0].symbol,
						details: $arr[0].details,
					}

					item.children = item.children.map(function ($i) {
						$i.parent = item.id;
						return $i;
					})

					item.reduced = true;

					return item;
				},

				normal: function ($arr) {
					console.log('###################################3');
					var item = createBaseItem($arr[0].id);

					item.type = "normal";

					item.children = $arr;
					
					return $arr;
				}
			}

			$arr.forEach(function ($row, index) {

				if($row == "") {
					++$skip;
					return false;
				}

				//console.log("[ROW] :: ", $row);

				var currentDepth = countMatch($row, getRow($row, null, $arr).symbol, "\t");
				var nextRow = data[index + 1 - $skip];
				var nextDepth = (nextRow) ? countMatch(nextRow, getRow(nextRow, null, $arr).symbol, "\t") : null;
				var prevRow = data[index - 1 - $skip];
				var prevDepth = (prevRow) ? prevRow.depth : null;

				/*console.log("[PREV] :: ", prevDepth);
				console.log("[CURR] :: ", currentDepth);
				console.log("[NEXT] :: ", nextDepth);*/

				var checkNextDepth = function () {return nextDepth && (nextDepth > currentDepth)};
				var prevDepthIsLess = function () {return prevDepth && (prevDepth < currentDepth)};
				var prevDepthIsEqual = function () {return prevDepth && (prevDepth == currentDepth)};

				var item = createBaseItem();

				item.depth = currentDepth;
				item.row = $row;

				if(prevDepthIsLess()) {
					item.parent = prevRow.id;
				}

				else if(prevDepthIsEqual()) {
					item.parent = prevRow.parent;
				}

				else {
					if(item.depth == 1 || index == 0) {
						item.parent = 0;
					}

					else {
						item.parent = item.depth - 1;
					}
				}

				data.push(item);
			});

			/*console.log("## DATA ##");
			console.log(data.map(function (d) {
				return {id: d.id, depth: d.depth -1, parent: d.parent}
			}));*/

			data = data.sort(function (itemA, itemB) {
				var keyA = itemA.depth;
				var keyB = itemB.depth;

				if(keyA < keyB) return -1;
			    if(keyA > keyB) return 1;
			    return 0;
			});

			//console.log(data);

			// #block 2

			function recursive ($recArr) {

				if(!$recArr.length) {
					/*console.log('## END RECURSIVE ##');
					console.log('## RETURNING ##');
					console.log(null);*/
					return null;
				}

				//console.log("[RECURSIVE ARR] :: ", $recArr);

				//console.log("[RECURSIVE DEPTH :: ]");

				var max_depth = (function () {
					return Math.max.apply(null, $recArr.map(function (m) {
						return m.depth;
					}));
				})()
				
				if(!isFinite(max_depth)) {
					/*console.log('## END RECURSIVE ##');
					console.log('## RETURNING ##');
					console.log($recArr);*/
					return null;
				}

				//console.log("[MAX_DEPTH] :: ", max_depth);

				var sliceAt = {
					first: (function () {
						return $recArr.map(function (m) {
							return m.depth;
						}).indexOf(max_depth)
					})(),
					last: (function () {
						return $recArr.map(function (m) {
							return m.depth;
						}).lastIndexOf(max_depth);
					})()
				}

				var sliced = $recArr.slice(sliceAt.first, sliceAt.last + 1);

				/*console.log("[SLICEAT] :: ", sliceAt);

				console.log("[PROCESSING DEPTH] :: ", max_depth, sliced.length);*/

				sliced = sliced.map(function ($s) {
					var row = getRow($s.row);

					var item = $s;

					item.digested = row.digested;
					item.symbol = row.symbol;

					return createListItem(item);

					//console.log(item);
				});


				// NORMALIZE SLICED


				sliced = sliced.map(function ($s) {
					if($s.type) {
						console.log("[SLICED TYPE]", $s.type);
					}

					else return $s;
				});

				if(sliceAt.first == -1) {
					/*console.log('## END RECURSIVE ##');
					console.log('## RETURNING ##');
					console.log(sliced.length);*/
					return sliced;
				}

				//console.log("[LASTRECURSIVE SLICE] :: ", "(0, "+ sliceAt.first +")");

				var lastRecursive = recursive($recArr.slice(0, sliceAt.first));

				response[max_depth] = sliced;

				return lastRecursive || sliced;
			}

			function createTree (obj) {
				var keys = Object.keys(obj);
				var $res = null;

				for (var i = keys.length - 1; i >= 0; i--) {
					var depth = keys[i];

					var types = {};

					obj[depth].forEach(function ($s) {
						if(!$s.details.type) {
							$s.details.type = "normal";
						}

						if(!types[$s.details.type])
							types[$s.details.type] = []
						
						types[$s.details.type].push($s);

					});

					if(Object.keys(types).length) {
						//console.log("[TYPE KEYS] :: ", Object.keys(types));
						//console.log(types);

						//console.log("[obj[depth] Before] :: ", obj[depth]);
						obj[depth] = [];

						for(var keyType in types) {
							var $typeArr = types[keyType];

							if(Create[keyType]) {
								//console.log("[TRANSFORMING KEY] :: ", keyType);

								var toPush = Create[keyType]($typeArr);

								if(Array.isArray(toPush)) {
									obj[depth].push.apply(obj[depth], toPush);
								}

								else {
									if(toPush.GIVEN) console.log("[AAAAAAAA MLK]");
									obj[depth].push(toPush);
								}

								//console.log('[obj[depth] After] :: ', obj[depth].length, $typeArr.length);
								//console.log("[TRANFORMED] :: ", toPush);
							}

							else {
								//console.log("[MISSING KEY TYPE] :: ", keyType);
								//console.log("[obj[depth].length before] :: ", obj[depth].length);
								obj[depth].push.apply(obj[depth], $typeArr);
								//console.log("[obj[depth].length after] :: ", obj[depth].length);
							}

						}

						/*console.log("[ul formeds] :: ", obj[depth].filter(function ($f) {
							return $f.GIVEN == true;
						}).length)*/
					}

					obj[depth].forEach(function ($item) {
						if($item.GIVEN) console.log("[AAA MLK 2] :: ", $item)
						if($item.parent) {
							var prevDepth = obj[depth-1];

							if(prevDepth) {

								prevDepth.forEach(function ($prevItem) {

									if($prevItem.id == $item.parent) {
										if($item.GIVEN) console.log();
										$prevItem.children.push($item);
									}
								});
							}
						}

						else {
							$res = obj[depth];
							return;
						}
					});
				}

				return $res;
			}

			recursive(data);

			WriteFile(createTree(response));
		}

		function WriteFile (data) {
			var $data;

			console.log("[DATA]", data);

			try {
				$data = JSON.stringify(data, null, 2);

				fs.writeFile("app.json", $data, "utf8", (err) => {
					if(err)
						throw new Error(err);
				});
			}

			catch (e) {
				throw new Error(e);
			}

		}

		start(doc);
	});
}

module.exports = init;