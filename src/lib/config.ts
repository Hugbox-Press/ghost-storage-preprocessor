interface GhostConfig {
  url: string;
  paths: {
    contentPath: string;
  };
}

const getConfig = () => {
  const path = "../../../../../../config.production.json";
  // const path = "../../test/config.production.json"
  const config: GhostConfig = require(path);

  config.url = new URL(config.url).toString();

  return config;
};

export default getConfig;
