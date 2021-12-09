"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getConfig = () => {
    // const config: GhostConfig = require("../../../../../../config.production.json");
    const config = require("../../test/config.production.json");
    config.url = new URL(config.url).toString();
    return config;
};
exports.default = getConfig;
