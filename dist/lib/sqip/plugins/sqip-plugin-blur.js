"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
const types_1 = require("../types");
const PRIMITIVE_SVG_ELEMENTS = "circle, ellipse, line, polygon, path, rect, g";
const patchSVGGroup = (svg) => {
    const $ = (0, helpers_1.loadSVG)(svg);
    const $svg = $("svg");
    const $primitiveShapes = $svg.children(PRIMITIVE_SVG_ELEMENTS);
    // Check if actual shapes are grouped
    if ($primitiveShapes.filter("g").length === 1) {
        const $group = $("<g/>");
        const $realShapes = $primitiveShapes.not("rect:first-child");
        $group.append($realShapes);
        $svg.append($group);
    }
    return $.html();
};
class SVGPlugin extends types_1.SqipPlugin {
    static get cliOptions() {
        return [
            {
                // @ts-ignore
                name: "blur",
                alias: "b",
                type: Number,
                description: "Set the stdDeviation value for the GaussianBlur SVG filter. See: https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feGaussianBlur",
                defaultValue: 12,
            },
        ];
    }
    constructor(options) {
        super(options);
        const { pluginOptions } = options;
        this.options = { blur: 12, ...pluginOptions };
    }
    apply(imageBuffer, metadata) {
        let svg = this.prepareSVG(imageBuffer.toString(), metadata);
        if (this.options.blur) {
            svg = this.applyBlurFilter(svg);
        }
        return Buffer.from(svg);
    }
    // Prepare SVG. For now, this will just ensure that the viewbox attribute is set
    prepareSVG(svg, metadata) {
        const $ = (0, helpers_1.loadSVG)(svg);
        const $svg = $("svg");
        const { width, height } = metadata;
        // Ensure viewbox
        if (!$svg.is("[viewBox]")) {
            if (!(width && height)) {
                throw new Error(`SVG is missing viewBox attribute while Width and height were not passed:\n\n${svg}`);
            }
            $svg.attr("viewBox", `0 0 ${width} ${height}`);
        }
        const $bgRect = $svg
            .children(PRIMITIVE_SVG_ELEMENTS)
            .filter("rect:first-child[fill]");
        // Check if filling background rectangle exists
        // This must exist for proper blur and other transformations
        if (!$bgRect.length) {
            throw new Error(`The SVG must have a rect as first shape element which represents the svg background color:\n\n${svg}`);
        }
        // Remove x and y attributes since they default to 0
        // @todo test in rare browsers
        $bgRect.removeAttr("x");
        $bgRect.removeAttr("y");
        // Improve compression via simplifying fill
        $bgRect.attr("width", "100%");
        $bgRect.attr("height", "100%");
        return $.html();
    }
    applyBlurFilter(svg) {
        if (!this.options.blur) {
            return svg;
        }
        const patchedSVG = patchSVGGroup(svg);
        const $ = (0, helpers_1.loadSVG)(patchedSVG);
        const blurFilterId = "b";
        $("svg > g").attr("filter", `url(#${blurFilterId})`);
        $("svg").prepend(`<filter id="${blurFilterId}"><feGaussianBlur stdDeviation="${this.options.blur}" />`);
        return $.html();
    }
}
exports.default = SVGPlugin;
