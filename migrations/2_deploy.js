const fs = require('fs');
const file = fs.createWriteStream('../deploy-detail.txt');
let logger = new console.Console(file, file);

const SmartApprove = artifacts.require("SmartApprove");
const SmartSwap = artifacts.require("SmartSwap");
const DODOSellHelper = artifacts.require("DODOSellHelper");

const DEPLOY_ROUTE = true;

module.exports = async (deployer, network) => {
  logger.log("====================================================");
  logger.log("network type: " + network);
  logger.log("Deploy time: " + new Date().toLocaleString());

  if (DEPLOY_ROUTE) {
    logger.log("Deploy type: Smart Route");
    await deployer.deploy(SmartApprove);
    await deployer.deploy(DODOSellHelper);
    logger.log("SmartApprove Address: ",SmartApprove.address);
    logger.log("DODOSellHelper Address: ",DODOSellHelper.address);

    await deployer.deploy(SmartSwap,SmartApprove.address,DODOSellHelper.address);
    logger.log("SmartSwap Address: ",SmartSwap.address);

    const SmartApproveInstance = await SmartApprove.deployed();
    var tx = await SmartApproveInstance.setSmartSwap(SmartSwap.address);
    logger.log("SmartApprovce setSmartSwap tx: ",tx.tx);
  }
};



