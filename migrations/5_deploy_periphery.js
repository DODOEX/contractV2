const fs = require("fs");
const { deploySwitch } = require('../truffle-config.js')
const file = fs.createWriteStream("../deploy-detail-periphery.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);

const DODOBscToken = artifacts.require("DODOBscToken");
const DODOMigrationBSC = artifacts.require("DODOMigrationBSC");
const vDODOToken = artifacts.require("vDODOToken");
const DODOCirculationHelper = artifacts.require("DODOCirculationHelper");
const DODOApproveProxy = artifacts.require("DODOApproveProxy");

module.exports = async (deployer, network, accounts) => {

    let DODOTokenAddress = "";
    let DODOApproveProxyAddress = "";

    let DODOCirculationHelperAddress = "";
    let GovernanceAddress = "";
    let vDODOTokenAddress = "";
    let dodoTeam = "";

    if (network == "kovan") {
        DODOTokenAddress = "0x854b0f89BAa9101e49Bfb357A38071C9db5d0DFa";
        DODOApproveProxyAddress = "0xE2bf3e72E126f0AD4Aec07AdfA6cc345EEF43bDe";
        DODOCirculationHelperAddress = "";
        vDODOTokenAddress = "";
        GovernanceAddress = "0x0000000000000000000000000000000000000000";
        //Account
        multiSigAddress = accounts[0];
        dodoTeam = "0xaac153c1344cA14497A5dd22b1F70C28793625aa";
    } else if (network == "live") {
        DODOTokenAddress = "0x43dfc4159d86f3a37a5a4b3d4580b888ad7d4ddd";
        DODOApproveProxyAddress = "0x335aC99bb3E51BDbF22025f092Ebc1Cf2c5cC619";
        DODOCirculationHelperAddress = "";
        vDODOTokenAddress = "";
        GovernanceAddress = "0x0000000000000000000000000000000000000000";
        //Account
        multiSigAddress = "0x95C4F5b83aA70810D4f142d58e5F7242Bd891CB0";
        dodoTeam = "";
    } else if (network == "bsclive") {
        //Account
        multiSigAddress = "0x4073f2b9bB95774531b9e23d206a308c614A943a";
    } else return;

    logger.log("====================================================");
    logger.log("network type: " + network);
    logger.log("Deploy time: " + new Date().toLocaleString());


    if (deploySwitch.DODOBscToken && (network == "bsclive")) {
        logger.log("Deploy type: DODOBscToken");
        await deployer.deploy(DODOBscToken);
        DODOBscTokenAddress = DODOBscToken.address;
        logger.log("DODOBscTokenAddress: ", DODOBscTokenAddress);
        const dodoBscTokenInstance = await DODOBscToken.at(DODOBscTokenAddress);
        var tx = await dodoBscTokenInstance.initOwner("0x9c59990ec0177d87ED7D60A56F584E6b06C639a2");
        logger.log("Init DODOBscTokenAddress Tx:", tx.tx);
    }

    if (deploySwitch.BSCMigration && (network !== "bsclive")) {
        logger.log("Deploy type: DODOMigrationBSC");
        await deployer.deploy(DODOMigrationBSC, DODOTokenAddress, DODOApproveProxyAddress);
        DODOMigrationBSCAddress = DODOMigrationBSC.address;
        logger.log("DODOMigrationBSCAddress: ", DODOMigrationBSCAddress);
        const dodoMigrationBscInstance = await DODOMigrationBSC.at(DODOMigrationBSCAddress);
        var tx = await dodoMigrationBscInstance.initOwner(multiSigAddress);
        logger.log("Init DODOMigrationBSCAddress Tx:", tx.tx);
    }

    if (deploySwitch.vDODOToken) {
        logger.log("Deploy type: vDODOToken");

        if (vDODOTokenAddress == "") {
            await deployer.deploy(
                vDODOToken,
                GovernanceAddress,
                DODOTokenAddress,
                DODOApproveProxyAddress,
                dodoTeam
            );
            vDODOTokenAddress = vDODOToken.address;
            logger.log("vDODOTokenAddress: ", vDODOTokenAddress);
            const vDODOTokenInstance = await vDODOToken.at(vDODOTokenAddress);
            var tx = await vDODOTokenInstance.initOwner(multiSigAddress);
            logger.log("Init vDODOTokenAddress Tx:", tx.tx);
        }

        if (DODOCirculationHelperAddress == "") {
            await deployer.deploy(DODOCirculationHelper, vDODOTokenAddress, DODOTokenAddress);
            DODOCirculationHelperAddress = DODOCirculationHelper.address;
            logger.log("DODOCirculationHelperAddress: ", DODOCirculationHelperAddress);
            const DODOCirculationHelperInstance = await DODOCirculationHelper.at(DODOCirculationHelperAddress);
            var tx = await DODOCirculationHelperInstance.initOwner(multiSigAddress);
            logger.log("Init DODOCirculationHelperAddress Tx:", tx.tx);
        }

        if(network == 'kovan') {
            const vDODOTokenInstance = await vDODOToken.at(vDODOTokenAddress);
            //updateDODOCirculationHelper
            var tx = await vDODOTokenInstance.updateDODOCirculationHelper(DODOCirculationHelperAddress);
            logger.log("vDODOToken setDODOCirculationHelper tx: ", tx.tx);
            
            //ApproveProxy add
            const DODOApproveProxyInstance = await DODOApproveProxy.at(DODOApproveProxyAddress);
            tx = await DODOApproveProxyInstance.unlockAddProxy(vDODOTokenAddress);
            logger.log("DODOApproveProxy Unlock tx: ", tx.tx);
            tx = await DODOApproveProxyInstance.addDODOProxy();
            logger.log("DODOApproveProxy add tx: ", tx.tx);

            //Mint DODO first
            tx = await vDODOTokenInstance.mint("100000000000000000000000",dodoTeam);
            logger.log("vDODOToken first mint tx: ", tx.tx);
            
            //preDepositedBlockReward
            tx = await vDODOTokenInstance.preDepositedBlockReward("1000000000000000000000");
            logger.log("vDODOToken injected dodo tx: ", tx.tx);

            //changePerReward
            tx = await vDODOTokenInstance.changePerReward("100000000000000000");
            logger.log("vDODOToken changeReward tx: ", tx.tx);

        }
    }

};
