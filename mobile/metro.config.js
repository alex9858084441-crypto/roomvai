const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Принудительно слушаем на всех интерфейсах (включая IPv4),
// чтобы телефон по локальной сети мог подключиться к Metro.
config.server = {
  ...config.server,
  host: "0.0.0.0",
};

module.exports = config;
