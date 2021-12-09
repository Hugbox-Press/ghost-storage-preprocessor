interface GhostConfig {
  url: string;
  paths: {
    contentPath: string;
  };
}

const config: GhostConfig = require("../../../../../config.production.json");

export default config;
