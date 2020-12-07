const fs = require("fs");
const file = fs.createWriteStream("../deploy-detail-v1.5.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);

const DODOApprove = artifacts.require("DODOApprove");
const DODOProxyV1 = artifacts.require("DODOV1Proxy01");
const DODOSellHelper = artifacts.require("DODOSellHelper");

const DEPLOY_ROUTE = false;

module.exports = async (deployer, network, accounts) => {
  let DODOSellHelperAddress = "";
  let WETHAddress = "";
  let DODOApproveAddress = "";
  let chiAddress = "";
  if (network == "kovan") {
    DODOSellHelperAddress = "0xbdEae617F2616b45DCB69B287D52940a76035Fe3";
    WETHAddress = "0x5eca15b12d959dfcf9c71c59f8b467eb8c6efd0b";
    // DODOApproveAddress = "0xbcf0fC05860b14cB3D62D1d4C7f531Ad2F28E0fE";
    DODOApproveAddress = "0x0C4a80B2e234448E5f6fD86e7eFA733d985004c8";
    chiAddress = "0x0000000000004946c0e9f43f4dee607b0ef1fa1c";
  } else if (network == "live") {
    DODOSellHelperAddress = "0x533da777aedce766ceae696bf90f8541a4ba80eb";
    WETHAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
    DODOApproveAddress = "0x4eC851895d85bfa6835241b3157ae10FfFD3BebC";
    chiAddress = "0x0000000000004946c0e9F43F4Dee607b0eF1fA1c";
  } else if (network == "bsclive") {
    DODOSellHelperAddress = "0x0F859706AeE7FcF61D5A8939E8CB9dBB6c1EDA33";
    WETHAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
    DODOApproveAddress = "0x19DA73be23Cea6bFA804Ec020041b8F3971BC522";
    chiAddress = "0x0000000000000000000000000000000000000000";
  } else return;

  logger.log("====================================================");
  logger.log("network type: " + network);
  logger.log("Deploy time: " + new Date().toLocaleString());

  if (DEPLOY_ROUTE) {
    logger.log("Deploy type: Proxy");
    if (DODOApproveAddress == "") {
      await deployer.deploy(DODOApprove);
      DODOApproveAddress = DODOApprove.address;
    }
    if (DODOSellHelperAddress == "") {
      await deployer.deploy(DODOSellHelper);
      DODOSellHelperAddress = DODOSellHelper.address;
    }
    logger.log("DODOApprove Address: ", DODOApproveAddress);
    logger.log("DODOSellHelper Address: ", DODOSellHelperAddress);
    await deployer.deploy(
      DODOProxyV1,
      DODOApproveAddress,
      DODOSellHelperAddress,
      WETHAddress,
      chiAddress
    );
    logger.log("DODOProxyV1 Address: ", DODOProxyV1.address);

    const DODOApproveInstance = await DODOApprove.at(DODOApproveAddress);
    var tx = await DODOApproveInstance.setDODOProxy(DODOProxyV1.address);
    logger.log("DODOApprovce setProxy tx: ", tx.tx);
  }
};
