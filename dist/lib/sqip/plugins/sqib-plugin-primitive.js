"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const path_1 = (0, tslib_1.__importDefault)(require("path"));
const os_1 = (0, tslib_1.__importDefault)(require("os"));
const execa_1 = (0, tslib_1.__importDefault)(require("execa"));
const debug_1 = (0, tslib_1.__importDefault)(require("debug"));
const types_1 = require("../types");
const helpers_1 = require("../helpers");
const debug = (0, debug_1.default)("sqip-plugin-primitive");
const VENDOR_DIR = path_1.default.resolve(__dirname, "..", "..", "..", "primitive-binaries");
let primitiveExecutable = "primitive";
// Since Primitive is only interested in the larger dimension of the input image, let's find it
const findLargerImageDimension = ({ width, height, }) => (width > height ? width : height);
class PrimitivePlugin extends types_1.SqipPlugin {
    static get cliOptions() {
        return [
            {
                name: "numberOfPrimitives",
                alias: "n",
                type: Number,
                description: "The number of primitive shapes to use to build the SQIP SVG",
                defaultValue: 8,
            },
            {
                name: "mode",
                alias: "m",
                type: Number,
                description: "The style of primitives to use: \n0=combo, 1=triangle, 2=rect, 3=ellipse, 4=circle, 5=rotatedrect, 6=beziers, 7=rotatedellipse, 8=polygon",
                defaultValue: 0,
            },
            {
                name: "rep",
                type: Number,
                description: "add N extra shapes each iteration with reduced search (mostly good for beziers",
                defaultValue: 0,
            },
            // @todo we might support this by throwing every result into the image array sqip uses
            // {
            //   name: 'nth',
            //   type: Number,
            //   description: 'save every Nth frame (only when %d is in output path)',
            //   defaultValue: 1
            // },
            {
                name: "alpha",
                type: Number,
                description: "color alpha (use 0 to let the algorithm choose alpha for each shape)",
                defaultValue: 128,
            },
            {
                name: "background",
                type: String,
                description: "starting background color (hex)",
                defaultValue: "DarkMuted",
            },
            {
                name: "cores",
                type: Number,
                description: "number of parallel workers (default uses all cores)",
                defaultValue: 0,
            },
        ];
    }
    constructor(options) {
        super(options);
        const { pluginOptions } = options;
        this.options = {
            numberOfPrimitives: 8,
            mode: 0,
            rep: 0,
            alpha: 128,
            background: "DarkMuted",
            cores: 0,
            ...pluginOptions,
        };
    }
    options = {};
    async apply(imageBuffer, metadata) {
        if (metadata.type === "svg") {
            throw new Error("Primitive needs a raster image buffer as input. Check if you run this plugin in the first place.");
        }
        await this.checkForPrimitive();
        const { numberOfPrimitives, mode, rep, alpha, background: userBg, cores, } = this.options;
        const { width, height, palette } = metadata;
        const background = userBg
            ? (0, helpers_1.parseColor)({ color: userBg, palette })
            : palette["Muted"]?.hex;
        const result = await (0, execa_1.default)(primitiveExecutable, [
            "-i",
            "-",
            "-o",
            "-",
            "-n",
            String(numberOfPrimitives),
            "-m",
            String(mode),
            "-s",
            String(findLargerImageDimension({ width, height })),
            "-rep",
            String(rep),
            "-a",
            String(alpha),
            "-bg",
            String(background),
            "-j",
            String(cores),
        ], { input: imageBuffer });
        metadata.type = "svg";
        return Buffer.from(result.stdout);
    }
    // Sanity check: use the exit state of 'type' to check for Primitive availability
    async checkForPrimitive() {
        const platform = os_1.default.platform();
        const primitivePath = path_1.default.join(VENDOR_DIR, `primitive-${platform}-${os_1.default.arch()}${platform === "win32" ? ".exe" : ""}`);
        try {
            await (0, promises_1.access)(primitivePath, fs_1.constants.X_OK);
            debug(`Found primitive binary at ${primitivePath}`);
            primitiveExecutable = primitivePath;
            return;
        }
        catch (e) {
            // noop
        }
        // Test if primitive is available as global executable
        try {
            if (platform === "win32") {
                await (0, execa_1.default)("where", ["primitive"]);
            }
            else {
                await (0, execa_1.default)("type", ["primitive"]);
            }
        }
        catch (e) {
            throw new Error("Please ensure that Primitive (https://github.com/hashbite/primitive, written in Golang) is installed and globally available.");
        }
        debug(`Found globally available primitive binary`);
        primitiveExecutable = "primitive";
    }
}
exports.default = PrimitivePlugin;
