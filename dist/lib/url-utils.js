"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const UrlUtils = require("@tryghost/url-utils");
const config_1 = (0, tslib_1.__importDefault)(require("./config"));
/**
 * Returns a subdirectory URL, if defined so in the config.
 * @callback getSubdirFn
 * @return {string} a subdirectory if configured.
 */
function getSubdir() {
    const config = (0, config_1.default)();
    // Parse local path location
    let { pathname } = new URL(config.url);
    let subdir;
    // Remove trailing slash
    if (pathname !== "/") {
        pathname = pathname.replace(/\/$/, "");
    }
    subdir = pathname === "/" ? "" : pathname;
    return subdir;
}
/**
 * Returns the base URL of the site as set in the config.
 *
 * Secure:
 * If the request is secure, we want to force returning the site url as https.
 * Imagine Ghost runs with http, but nginx allows SSL connections.
 *
 * @callback getSiteUrlFn
 * @param {boolean} [secure] optionally force the url to be secure
 * @return {string} returns the url as defined in config, but always with a trailing `/`
 */
function getSiteUrl(secure = false) {
    const config = (0, config_1.default)();
    let siteUrl = config.url;
    if (secure) {
        siteUrl = siteUrl.replace("http://", "https://");
    }
    if (!siteUrl.match(/\/$/)) {
        siteUrl += "/";
    }
    return siteUrl;
}
/**
 *
 * @callback getAdminUrlFn
 * @returns {string} returns the url as defined in config, but always with a trailing `/`
 */
function getAdminUrl() {
    let adminUrl = this.get("admin:url");
    const subdir = this.getSubdir();
    if (!adminUrl) {
        return;
    }
    if (!adminUrl.match(/\/$/)) {
        adminUrl += "/";
    }
    adminUrl = `${adminUrl}${subdir}`;
    if (!adminUrl.match(/\/$/)) {
        adminUrl += "/";
    }
    adminUrl = deduplicateSubdirectory(adminUrl, this.getSiteUrl());
    return adminUrl;
}
/**
 * Remove duplicated directories from the start of a path or url's path
 *
 * @param {string} url URL or pathname with possible duplicate subdirectory
 * @param {string} rootUrl Root URL with an optional subdirectory
 * @returns {string} URL or pathname with any duplicated subdirectory removed
 */
const deduplicateSubdirectory = function deduplicateSubdirectory(url, rootUrl) {
    // force root url to always have a trailing-slash for consistent behaviour
    if (!rootUrl.endsWith("/")) {
        rootUrl = `${rootUrl}/`;
    }
    // Cleanup any extraneous slashes in url for consistent behaviour
    url = url.replace(/(^|[^:])\/\/+/g, "$1/");
    const parsedRoot = new URL(rootUrl);
    // do nothing if rootUrl does not have a subdirectory
    if (parsedRoot.pathname === "/") {
        return url;
    }
    const subdir = parsedRoot.pathname.replace(/(^\/|\/$)+/g, "");
    // we can have subdirs that match TLDs so we need to restrict matches to
    // duplicates that start with a / or the beginning of the url
    const subdirRegex = new RegExp(`(^|/)${subdir}/${subdir}(/|$)`);
    return url.replace(subdirRegex, `$1${subdir}/`);
};
const urlUtils = new UrlUtils({
    getSubdir,
    getSiteUrl,
    getAdminUrl,
    apiVersions: "",
    defaultApiVersion: "",
    slugs: "",
    redirectCacheMaxAge: 999999,
    baseApiPath: "/ghost/api",
});
exports.default = urlUtils;
