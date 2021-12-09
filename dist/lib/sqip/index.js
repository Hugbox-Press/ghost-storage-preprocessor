"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqip = exports.resolvePlugins = void 0;
const tslib_1 = require("tslib");
const path_1 = (0, tslib_1.__importDefault)(require("path"));
const debug_1 = (0, tslib_1.__importDefault)(require("debug"));
const fs_extra_1 = (0, tslib_1.__importDefault)(require("fs-extra"));
const probe_image_size_1 = (0, tslib_1.__importDefault)(require("probe-image-size"));
const node_vibrant_1 = (0, tslib_1.__importDefault)(require("node-vibrant"));
const sharp_1 = (0, tslib_1.__importDefault)(require("sharp"));
const term_img_1 = (0, tslib_1.__importDefault)(require("term-img"));
const cli_table3_1 = (0, tslib_1.__importDefault)(require("cli-table3"));
const chalk_1 = (0, tslib_1.__importDefault)(require("chalk"));
const helpers_1 = require("./helpers");
const debug = (0, debug_1.default)("sqip");
const mainKeys = ["originalWidth", "originalHeight", "width", "height", "type"];
const PALETTE_KEYS = [
    "Vibrant",
    "DarkVibrant",
    "LightVibrant",
    "Muted",
    "DarkMuted",
    "LightMuted",
];
// Resolves plugins based on a given config
// Array of plugin names or config objects, even mixed.
async function resolvePlugins(plugins) {
    return Promise.all(plugins.map(async (plugin) => {
        if (typeof plugin === "string") {
            plugin = { name: plugin };
        }
        const { name } = plugin;
        if (!name) {
            throw new Error(`Unable to read plugin name from:\n${JSON.stringify(plugin, null, 2)}`);
        }
        const moduleName = name.indexOf("sqip-plugin-") !== -1 ? name : `sqip-plugin-${name}`;
        try {
            debug(`Loading ${moduleName}`);
            const moduleNameFull = path_1.default.join(__dirname, "plugins", moduleName);
            const Plugin = require(moduleNameFull);
            return { ...plugin, Plugin: Plugin.default };
        }
        catch (err) {
            if (err.code === "MODULE_NOT_FOUND") {
                throw new Error(`Unable to load plugin "${moduleName}". Try installing it via:\n\n npm install ${moduleName}`);
            }
            throw err;
        }
    }));
}
exports.resolvePlugins = resolvePlugins;
async function processFile({ buffer, outputFileName, config, }) {
    const { output, silent, parseableOutput } = config;
    const result = await processImage({ buffer, config });
    const { content, metadata } = result;
    let outputPath;
    debug(`Processed ${outputFileName}`);
    // Write result svg if desired
    if (output) {
        try {
            // Test if output path already exists
            const stats = await fs_extra_1.default.stat(output);
            // Throw if it is a file and already exists
            if (!stats.isDirectory()) {
                throw new Error(`File ${output} already exists. Overwriting is not yet supported.`);
            }
            outputPath = path_1.default.resolve(output, `${outputFileName}.svg`);
        }
        catch (err) {
            // Output directory or file does not exist. We will create it later on.
            outputPath = output;
        }
        debug(`Writing ${outputPath}`);
        await fs_extra_1.default.writeFile(outputPath, content);
    }
    // Gather CLI output information
    if (!silent) {
        if (outputPath) {
            console.log(`Stored at: ${outputPath}`);
        }
        // Generate preview
        if (!parseableOutput) {
            // Convert to png for image preview
            const preview = await (0, sharp_1.default)(Buffer.from(content)).png().toBuffer();
            try {
                (0, term_img_1.default)(preview, {
                    fallback: () => {
                        // SVG results can still be outputted as string
                        if (metadata.type === "svg") {
                            console.log(content.toString());
                            return;
                        }
                        // No fallback preview solution yet for non-svg files.
                        console.log(`Unable to render a preview for ${metadata.type} files on this machine. Try using https://iterm2.com/`);
                    },
                });
            }
            catch (err) {
                if (err.name !== "UnsupportedTerminalError") {
                    throw err;
                }
            }
        }
        // Metadata
        const tableConfig = parseableOutput
            ? {
                chars: {
                    top: "",
                    "top-mid": "",
                    "top-left": "",
                    "top-right": "",
                    bottom: "",
                    "bottom-mid": "",
                    "bottom-left": "",
                    "bottom-right": "",
                    left: "",
                    "left-mid": "",
                    mid: "",
                    "mid-mid": "",
                    right: "",
                    "right-mid": "",
                    middle: " ",
                },
                style: { "padding-left": 0, "padding-right": 0 },
            }
            : undefined;
        // Figure out which metadata keys to show
        // @todo why is this unused?
        // const allKeys = [...mainKeys, 'palette']
        const mainTable = new cli_table3_1.default(tableConfig);
        mainTable.push(mainKeys);
        mainTable.push(mainKeys.map((key) => String(metadata[key]) || "can not display"));
        console.log(mainTable.toString());
        // Show color palette
        const paletteTable = new cli_table3_1.default(tableConfig);
        paletteTable.push(PALETTE_KEYS);
        paletteTable.push(PALETTE_KEYS.map((key) => metadata.palette[key]?.hex)
            .filter((hex) => typeof hex === "string")
            .map((hex) => chalk_1.default.hex(hex)(hex)));
        console.log(paletteTable.toString());
        Object.keys(metadata)
            .filter((key) => ![...mainKeys, "palette"].includes(key))
            .forEach((key) => {
            console.log(chalk_1.default.bold(`${key}:`));
            console.log(metadata[key]);
        });
    }
    return result;
}
async function processImage({ buffer, config, }) {
    const originalSizes = probe_image_size_1.default.sync(buffer);
    const vibrant = node_vibrant_1.default.from(buffer);
    const palette = await vibrant.quality(0).getPalette();
    if (!originalSizes) {
        throw new Error("Unable to get image size");
    }
    const metadata = {
        originalWidth: originalSizes.width,
        originalHeight: originalSizes.height,
        palette,
        // @todo this should be set by plugins and detected initially
        type: "unknown",
        width: 0,
        height: 0,
    };
    // Load plugins
    const plugins = await resolvePlugins(config.plugins);
    // Determine output image size
    if (config.width && config.width > 0) {
        // Resize to desired output width
        try {
            buffer = await (0, sharp_1.default)(buffer).resize(config.width).toBuffer();
            const resizedMetadata = await (0, sharp_1.default)(buffer).metadata();
            metadata.width = resizedMetadata.width || 0;
            metadata.height = resizedMetadata.height || 0;
        }
        catch (err) {
            throw new Error("Unable to resize");
        }
    }
    else {
        // Fall back to original size, keep image as is
        metadata.width = originalSizes.width;
        metadata.height = originalSizes.height;
    }
    // Interate through plugins and apply them to last returned image
    for (const { name, options: pluginOptions, Plugin } of plugins) {
        debug(`Construct ${name}`);
        const plugin = new Plugin({
            sqipConfig: config,
            pluginOptions: pluginOptions || {},
            options: {},
        });
        debug(`Apply ${name}`);
        buffer = await plugin.apply(buffer, metadata);
    }
    return { content: buffer, metadata };
}
async function sqip(options) {
    // Build configuration based on passed options and default options
    const defaultOptions = {
        plugins: [
            { name: "primitive", options: { numberOfPrimitives: 8, mode: 0 } },
            "blur",
            "svgo",
            "data-uri",
        ],
        width: 300,
        parseableOutput: false,
        silent: true,
    };
    const config = Object.assign({}, defaultOptions, options);
    const { input, outputFileName, parseableOutput, silent } = config;
    if (parseableOutput) {
        chalk_1.default.level = 0;
    }
    // Validate configuration
    if (!input || input.length === 0) {
        throw new Error('Please provide an input image, e.g. sqip({ input: "input.jpg" })');
    }
    // If input is a Buffer
    if (Buffer.isBuffer(input)) {
        if (!outputFileName) {
            throw new Error(`${outputFileName} is required when passing image as buffer`);
        }
        return processFile({
            buffer: input,
            outputFileName,
            config,
        });
    }
    const files = await (0, helpers_1.locateFiles)(input);
    debug("Found files:");
    debug(files);
    // Test if all files are accessable
    for (const file of files) {
        try {
            debug("check file " + file);
            await fs_extra_1.default.access(file, fs_extra_1.default.constants.R_OK);
        }
        catch (err) {
            throw new Error(`Unable to read file ${file}`);
        }
    }
    // Iterate over all files
    const results = [];
    for (const filePath of files) {
        // Apply plugins to files
        if (!silent) {
            console.log(`Processing: ${filePath}`);
        }
        else {
            debug(`Processing ${filePath}`);
        }
        const buffer = await fs_extra_1.default.readFile(filePath);
        const result = await processFile({
            buffer,
            outputFileName: outputFileName || path_1.default.parse(filePath).name,
            config,
        });
        results.push(result);
    }
    debug(`Finished`);
    // Return as array when input was array or results is only one file
    if (Array.isArray(input) || results.length === 0) {
        return results;
    }
    return results[0];
}
exports.sqip = sqip;
