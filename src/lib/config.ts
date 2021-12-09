interface GhostConfig {
  url: string;
  paths: {
    contentPath: string;
  };
}

const getConfig = () => {
  const config: GhostConfig = require("../../../../../config.production.json");
  // const config: GhostConfig = require("../config.production.json");

  config.url = new URL(config.url).toString();

  return config;
};

export default getConfig;
