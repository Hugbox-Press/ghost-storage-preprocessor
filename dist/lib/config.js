"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getConfig = () => {
    const path = "../../../../../../config.production.json";
    // const path = "../../test/config.production.json"
    const config = require(path);
    config.url = new URL(config.url).toString();
    return config;
};
exports.default = getConfig;
