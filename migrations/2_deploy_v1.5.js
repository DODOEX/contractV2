const fs = require("fs");
const { deploySwitch } = require('../truffle-config.js')
const file = fs.createWriteStream("../deploy-detail-v1.5.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);

const DODOApproveProxy = artifacts.require("DODOApproveProxy");
const DODOV1Proxy04 = artifacts.require("DODOV1Proxy04");
const DODOSellHelper = artifacts.require("DODOSellHelper");
const DODOSwapCalcHelper = artifacts.require("DODOSwapCalcHelper");

module.exports = async (deployer, network, accounts) => {
  let DODOSellHelperAddress = "";
  let WETHAddress = "";
  let DODOApproveProxyAddress = "";
  let chiAddress = "";
  let DODOSwapCalcHelperAddress = "";
  let ownerAddress = ""
  if (network == "kovan") {
    DODOSellHelperAddress = "0xbdEae617F2616b45DCB69B287D52940a76035Fe3";
    WETHAddress = "0x5eca15b12d959dfcf9c71c59f8b467eb8c6efd0b";
    DODOSwapCalcHelperAddress = "0x0473FFd7039435F1FC794281F2a05830A1a0108a";
    DODOApproveProxyAddress = "";
    chiAddress = "0x0000000000004946c0e9f43f4dee607b0ef1fa1c";
    ownerAddress = accounts[0];
  } else if (network == "live") {
    DODOSellHelperAddress = "0x533da777aedce766ceae696bf90f8541a4ba80eb";
    WETHAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
    DODOApproveProxyAddress = "0x335aC99bb3E51BDbF22025f092Ebc1Cf2c5cC619";
    chiAddress = "0x0000000000004946c0e9F43F4Dee607b0eF1fA1c";
    DODOSwapCalcHelperAddress = "0x3C02477f1B3C70D692be95a6e3805E02bba71206";
    ownerAddress = "0x95C4F5b83aA70810D4f142d58e5F7242Bd891CB0";
  } else if (network == "bsclive") {
    DODOSellHelperAddress = "0x0F859706AeE7FcF61D5A8939E8CB9dBB6c1EDA33";
    WETHAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
    DODOApproveProxyAddress = "0xB76de21f04F677f07D9881174a1D8E624276314C";
    chiAddress = "0x0000000000000000000000000000000000000000";
    DODOSwapCalcHelperAddress = "0xb0199C2c8ADF1E6c1e41De60A62E993406Cb8C02";
    ownerAddress = "0x4073f2b9bB95774531b9e23d206a308c614A943a";
  } else return;

  if (deploySwitch.DEPLOY_V1) {

    logger.log("====================================================");
    logger.log("network type: " + network);
    logger.log("Deploy time: " + new Date().toLocaleString());
    var tx;

    logger.log("Deploy type: Proxy");
    if (DODOApproveProxyAddress == "") {
      await deployer.deploy(DODOApproveProxy);
      DODOApproveProxyAddress = DODOApproveProxy.address;
      logger.log("DODOApproveProxy Address: ", DODOApproveDODOApproveProxyAddressAddress);
    }
    if (DODOSellHelperAddress == "") {
      await deployer.deploy(DODOSellHelper);
      DODOSellHelperAddress = DODOSellHelper.address;
    }
    if (DODOSwapCalcHelperAddress == "") {
      await deployer.deploy(DODOSwapCalcHelper, DODOSellHelperAddress);
      DODOSwapCalcHelperAddress = DODOSwapCalcHelper.address;
      logger.log("DODOSwapCalcHelperAddress: ", DODOSwapCalcHelperAddress);
    }

    await deployer.deploy(
      DODOV1Proxy04,
      DODOApproveProxyAddress,
      DODOSellHelperAddress,
      WETHAddress,
      chiAddress
    );
    logger.log("DODOV1Proxy04 Address: ", DODOV1Proxy04.address);
    const DODOProxyInstance = await DODOV1Proxy04.at(DODOV1Proxy04.address);
    tx = await DODOProxyInstance.initOwner(ownerAddress);
    logger.log("Set DODOProxy Owner tx: ", tx.tx);

    // const DODOApproveInstance = await DODOApprove.at(DODOApproveAddress);
    // tx = await DODOApproveInstance.init(ownerAddress, DODOProxyV1.address);
    // logger.log("Set DODOApprove Owner And Init Set Proxy tx: ", tx.tx);

    // var tx1 = await DODOProxyV1Instance.addWhiteList("0x111111125434b319222cdbf8c261674adb56f3ae");
    // var tx2 = await DODOProxyV1Instance.addWhiteList("0xdef1c0ded9bec7f1a1670819833240f027b25eff");
    // logger.log("AddWhiteList tx1: ", tx1.tx);
    // logger.log("AddWhiteList tx2: ", tx2.tx);
  }
};
