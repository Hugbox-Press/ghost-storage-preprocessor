"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// const config: GhostConfig = require("../../../../../config.production.json");
const config = require("../config.production.json");
config.url = new URL(config.url).toString();
exports.default = config;
