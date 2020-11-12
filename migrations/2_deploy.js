const fs = require('fs');
const file = fs.createWriteStream('../deploy-detail.txt');
let logger = new console.Console(file, file);

const SmartApprove = artifacts.require("SmartApprove");
const SmartSwap = artifacts.require("SmartSwap");
const DODOSellHelper = artifacts.require("DODOSellHelper");

const DEPLOY_ROUTE = true;

module.exports = async (deployer, network) => {
  let DODOSellHelperAddress = ""
  if(network == 'kovan'){
    DODOSellHelperAddress = "0xbdEae617F2616b45DCB69B287D52940a76035Fe3";
  }else {
    DODOSellHelperAddress = "";
  }

  logger.log("====================================================");
  logger.log("network type: " + network);
  logger.log("Deploy time: " + new Date().toLocaleString());

  if (DEPLOY_ROUTE) {
    logger.log("Deploy type: Smart Route");
    await deployer.deploy(SmartApprove);
    if(DODOSellHelperAddress == "") {
      await deployer.deploy(DODOSellHelper);
      DODOSellHelperAddress = DODOSellHelper.address;
    }
    logger.log("SmartApprove Address: ",SmartApprove.address);
    logger.log("DODOSellHelper Address: ",DODOSellHelperAddress);

    await deployer.deploy(SmartSwap,SmartApprove.address,DODOSellHelperAddress);
    logger.log("SmartSwap Address: ",SmartSwap.address);

    const SmartApproveInstance = await SmartApprove.deployed();
    var tx = await SmartApproveInstance.setSmartSwap(SmartSwap.address);
    logger.log("SmartApprovce setSmartSwap tx: ",tx.tx);
  }
};



