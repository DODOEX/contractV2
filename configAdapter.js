const { ETH_CONFIG } = require("./config/eth-config");
const { BSC_CONFIG } = require("./config/bsc-config");
const { HECO_CONFIG } = require("./config/heco-config");
const { KOVAN_CONFIG } = require("./config/kovan-config");
const { MBTEST_CONFIG } = require("./config/mbtest-config");
const { OKTEST_CONFIG } = require("./config/oktest-config");

exports.GetConfig = function (network, accounts) {
    var CONFIG = {}
    switch (network) {
        case "kovan":
            CONFIG = KOVAN_CONFIG
            CONFIG.multiSigAddress = accounts[0]
            CONFIG.defaultMaintainer = accounts[0]
            break;
        case "live":
            CONFIG = ETH_CONFIG
            break;
        case "bsclive":
            CONFIG = BSC_CONFIG
            break;
        case "heco":
            CONFIG = HECO_CONFIG
            break;
        case "mbtestnet":
            CONFIG = MBTEST_CONFIG
            CONFIG.multiSigAddress = accounts[0]
            CONFIG.defaultMaintainer = accounts[0]
            break;
        case "oktest":
            CONFIG = OKTEST_CONFIG
            CONFIG.multiSigAddress = accounts[0]
            CONFIG.defaultMaintainer = accounts[0]
            break;
    }
    return CONFIG
}