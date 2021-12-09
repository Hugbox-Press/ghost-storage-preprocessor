interface GhostConfig {
  url: string;
  paths: {
    contentPath: string;
  };
}

// const config: GhostConfig = require("../../../../../config.production.json");
const config: GhostConfig = require("../config.production.json");

config.url = new URL(config.url).toString();

export default config;
