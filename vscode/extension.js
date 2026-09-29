const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

let server = null;
let inbox = Buffer.alloc(0);
let waiting = new Map();
let next = 1;
let problems = null;
let remembered = null;

function activate(context) {
	remembered = context.globalState;
	problems = vscode.languages.createDiagnosticCollection("flag");
	context.subscriptions.push(
		problems,
		{ dispose: stop },
		vscode.workspace.onDidOpenTextDocument(opened),
		vscode.workspace.onDidChangeTextDocument((event) => {
			const doc = event.document;
			if (doc.languageId !== "flag" || doc.uri.scheme !== "file" || event.contentChanges.length === 0) return;
			notify("textDocument/didChange", {
				textDocument: { uri: doc.uri.toString(), version: doc.version },
				contentChanges: [{ text: doc.getText() }],
			});
		}),
		vscode.workspace.onDidCloseTextDocument((doc) => {
			if (doc.languageId === "flag" && doc.uri.scheme === "file") {
				notify("textDocument/didClose", { textDocument: { uri: doc.uri.toString() } });
			}
		}),
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration("flag")) {
				stop();
				start();
			}
		}),
		vscode.languages.registerHoverProvider("flag", {
			async provideHover(doc, position) {
				const answer = await request("textDocument/hover", spot(doc, position));
				return answer ? new vscode.Hover(new vscode.MarkdownString(answer.contents.value)) : null;
			},
		}),
		vscode.languages.registerDefinitionProvider("flag", {
			async provideDefinition(doc, position) {
				const answer = await request("textDocument/definition", spot(doc, position));
				return answer ? answer.map((found) => new vscode.Location(vscode.Uri.parse(found.uri), range(found.range))) : null;
			},
		})
	);
	start();
}

function start() {
	const settings = vscode.workspace.getConfiguration("flag");
	const folders = vscode.workspace.workspaceFolders;
	const root = folders && folders.length > 0 ? folders[0].uri : null;
	const system = { linux: "linux", darwin: "macos", win32: "windows" }[process.platform];
	const machine = { x64: "x86_64", arm64: "arm64" }[process.arch];
	const inside = path.join(__dirname, "server", `${system}-${machine}`, executable("flagls"));
	let command = settings.get("server") || (fs.existsSync(inside) ? inside : null);
	if (!command) {
		advise(
			"flagls",
			`Flag: flagls doesn't come for ${process.platform} ${process.arch}, so there are no errors, hover or go to definition. Build it and set flag.server.`,
			"https://github.com/FramaLuna/flag-lsp#build-from-source"
		);
		return;
	}
	if (root && !path.isAbsolute(command) && path.basename(command) !== command) command = path.join(root.fsPath, command);
	const places = [path.dirname(command), ...(process.env.PATH || "").split(path.delimiter)];
	if (!places.some((folder) => folder && fs.existsSync(path.join(folder, executable("flagc"))))) {
		advise(
			"flagc",
			"Flag: flagc is not in your PATH, so there are no errors, hover or go to definition.",
			"https://github.com/FramaLuna/flag-lang#installation"
		);
		return;
	}
	inbox = Buffer.alloc(0);
	server = spawn(command, [], { stdio: ["pipe", "pipe", "ignore"] });
	const self = server;
	server.on("error", (err) => {
		if (server === self) vscode.window.showErrorMessage(`flag: cannot run ${command} (${err.message}), set flag.server`);
	});
	server.stdin.on("error", () => {});
	server.stdout.on("data", (chunk) => {
		if (server === self) receive(chunk);
	});
	server.on("exit", (code) => {
		if (server !== self) return;
		server = null;
		problems.clear();
		for (const done of waiting.values()) done(null);
		waiting.clear();
		vscode.window.showErrorMessage(`flag: flagls stopped (${code})`, "Restart").then((choice) => {
			if (choice) start();
		});
	});
	request("initialize", {
		processId: process.pid,
		rootUri: root ? root.toString() : null,
		capabilities: {},
		initializationOptions: { exclude: settings.get("exclude") || [], memory: settings.get("memory") || false },
	});
	notify("initialized", {});
	for (const doc of vscode.workspace.textDocuments) opened(doc);
}

function executable(name) {
	return process.platform === "win32" ? name + ".exe" : name;
}

function advise(name, text, link) {
	if (remembered.get(`hide.${name}`)) return;
	vscode.window.showInformationMessage(text, "How to install", "Don't show again").then((choice) => {
		if (choice === "How to install") vscode.env.openExternal(vscode.Uri.parse(link));
		if (choice === "Don't show again") remembered.update(`hide.${name}`, true);
	});
}

function stop() {
	if (!server) return;
	const old = server;
	server = null;
	old.kill();
	problems.clear();
	for (const done of waiting.values()) done(null);
	waiting.clear();
}

function opened(doc) {
	if (doc.languageId !== "flag" || doc.uri.scheme !== "file") return;
	notify("textDocument/didOpen", {
		textDocument: { uri: doc.uri.toString(), languageId: "flag", version: doc.version, text: doc.getText() },
	});
}

function spot(doc, position) {
	return { textDocument: { uri: doc.uri.toString() }, position: { line: position.line, character: position.character } };
}

function range(from) {
	return new vscode.Range(from.start.line, from.start.character, from.end.line, from.end.character);
}

function request(method, params) {
	const id = next++;
	return new Promise((resolve) => {
		waiting.set(id, resolve);
		if (!write({ jsonrpc: "2.0", id, method, params })) {
			waiting.delete(id);
			resolve(null);
		}
	});
}

function notify(method, params) {
	write({ jsonrpc: "2.0", method, params });
}

function write(message) {
	if (!server) return false;
	const body = Buffer.from(JSON.stringify(message), "utf8");
	server.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
	server.stdin.write(body);
	return true;
}

function receive(chunk) {
	inbox = Buffer.concat([inbox, chunk]);
	for (;;) {
		const split = inbox.indexOf("\r\n\r\n");
		if (split < 0) return;
		const found = /Content-Length: *(\d+)/i.exec(inbox.slice(0, split).toString("ascii"));
		const start = split + 4;
		const length = found ? Number(found[1]) : 0;
		if (inbox.length < start + length) return;
		const message = JSON.parse(inbox.slice(start, start + length).toString("utf8"));
		inbox = inbox.slice(start + length);
		if (message.method === "textDocument/publishDiagnostics") {
			publish(message.params);
		} else if (waiting.has(message.id)) {
			const done = waiting.get(message.id);
			waiting.delete(message.id);
			done(message.result);
		}
	}
}

function publish(params) {
	problems.set(
		vscode.Uri.parse(params.uri),
		params.diagnostics.map((given) => {
			const severity = given.severity === 2 ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Error;
			const shown = new vscode.Diagnostic(range(given.range), given.message, severity);
			shown.source = "flagc";
			shown.relatedInformation = given.relatedInformation.map(
				(note) =>
					new vscode.DiagnosticRelatedInformation(
						new vscode.Location(vscode.Uri.parse(note.location.uri), range(note.location.range)),
						note.message
					)
			);
			return shown;
		})
	);
}

function deactivate() {
	stop();
}

module.exports = { activate, deactivate };
