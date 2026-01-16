"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLLMProvider = getLLMProvider;
var gemini_1 = require("./gemini");
function getLLMProvider() {
    var _a;
    var provider = (_a = process.env.LLM_PROVIDER) !== null && _a !== void 0 ? _a : "gemini";
    switch (provider) {
        case "gemini":
            return new gemini_1.GeminiProvider();
        default:
            throw new Error("Unsupported LLM provider: ".concat(provider));
    }
}
