const fs = require("fs");
const Web3 = require('web3');
const { deploySwitch } = require('../truffle-config.js')
// const file = fs.createWriteStream("../deploy-detail-v2.0.txt", { 'flags': 'a' });
// let logger = new console.Console(file, file);


const FeeRateModelLogic = artifacts.require("FeeRateModelLogic");
const FeeRateModelLogicUpdate = artifacts.require("FeeRateModelLogicUpdate");


module.exports = async (deployer, network, accounts) => {
    let FeeRateModelLogicAddress;
    let FeeRateModelLogicUpdateAddress;
    await deployer.deploy(FeeRateModelLogic);
    FeeRateModelLogicAddress = FeeRateModelLogic.address;
    // logger.log("FeeRateModelLogicAddress: ", FeeRateModelLogicAddress);

    await deployer.deploy(FeeRateModelLogicUpdate);
    FeeRateModelLogicUpdateAddress = FeeRateModelLogicUpdate.address;
    // logger.log("FeeRateModelLogicUpdateAddress: ", FeeRateModelLogicUpdateAddress);
};
