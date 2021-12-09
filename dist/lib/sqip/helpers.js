"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseColor = exports.locateFiles = exports.loadSVG = void 0;
const tslib_1 = require("tslib");
const path_1 = (0, tslib_1.__importDefault)(require("path"));
const cheerio_1 = (0, tslib_1.__importDefault)(require("cheerio"));
const debug_1 = (0, tslib_1.__importDefault)(require("debug"));
const expand_tilde_1 = (0, tslib_1.__importDefault)(require("expand-tilde"));
const fast_glob_1 = (0, tslib_1.__importDefault)(require("fast-glob"));
const fs_extra_1 = (0, tslib_1.__importDefault)(require("fs-extra"));
const debug = (0, debug_1.default)("sqip");
const loadSVG = (svg) => {
    return cheerio_1.default.load(svg, {
        normalizeWhitespace: true,
        xmlMode: true,
    });
};
exports.loadSVG = loadSVG;
async function locateFiles(input) {
    const enhancedInput = (0, expand_tilde_1.default)(input);
    let globPattern = enhancedInput;
    try {
        const stat = await fs_extra_1.default.lstat(enhancedInput);
        if (stat.isFile()) {
            debug(`input ${input} is a file. Skip file search.`);
            return [enhancedInput];
        }
        if (stat.isDirectory()) {
            debug(`input ${input} is a directory. Enhancing with * to match all files.`);
            globPattern = `${path_1.default.resolve(enhancedInput)}/*`;
        }
    }
    catch (err) {
        if (err.code !== "ENOENT") {
            throw err;
        }
    }
    // Find all files matching the enhanced glob
    const files = await (0, fast_glob_1.default)(globPattern, {
        onlyFiles: true,
        extglob: true,
        absolute: true,
    });
    // Test if files are found
    if (!files.length) {
        throw new Error(`Unable to find any files via ${globPattern}. Make sure the file exists.

If you are using globbing patterns, the following features are supported:

https://github.com/micromatch/micromatch#matching-features`);
    }
    return files;
}
exports.locateFiles = locateFiles;
function parseColor({ palette, color }) {
    // @todo test, fallback to or detect transparent as color (for bg)
    return palette[color]?.hex || color;
}
exports.parseColor = parseColor;
