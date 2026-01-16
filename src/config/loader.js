"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadYamlConfig = loadYamlConfig;
var fs = require("fs");
var YAML = require("yaml");
function loadYamlConfig(path) {
    if (!fs.existsSync(path)) {
        throw new Error("Config file not found: ".concat(path));
    }
    var raw = fs.readFileSync(path, "utf-8");
    return YAML.parse(raw);
}
