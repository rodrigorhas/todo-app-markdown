var browserSync = require("browser-sync");
const compiler = require("./compiler.js");

browserSync({
	open: 'local',
	browser: "google chrome",
	logLevel: "silent",
    files: [
        {
            match: ["log.txt"],
            fn:    function (event, file) {
            	if(event == "change") {
                	console.log("[CHANGE DETECTED]");
                	compiler();
                	browserSync.reload();
            	}
            }
        }
    ]
});

console.log("[SERVER RUNNING - WAITING FOR CHANGES ON 'log.txt']");