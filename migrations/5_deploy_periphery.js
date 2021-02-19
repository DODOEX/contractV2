const fs = require("fs");
const { deploySwitch } = require('../truffle-config.js')
const file = fs.createWriteStream("../deploy-detail-periphery.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);

const DODOBscToken = artifacts.require("DODOBscToken");
const DODORecharge = artifacts.require("DODORecharge");
const DODOMigrationBSC = artifacts.require("DODOMigrationBSC");
const vDODOToken = artifacts.require("vDODOToken");
const DODOCirculationHelper = artifacts.require("DODOCirculationHelper");
const DODOApproveProxy = artifacts.require("DODOApproveProxy");
const DODOMine = artifacts.require("DODOMine");

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
        vDODOTokenAddress = "0xf7119Bf8bE41Dd9080Bd0A9AB04788B5EcA140d5";
        GovernanceAddress = "0x0000000000000000000000000000000000000000";
        //Account
        multiSigAddress = accounts[0];
        dodoTeam = "0xaac153c1344cA14497A5dd22b1F70C28793625aa";
    } else if (network == "live") {
        DODOTokenAddress = "0x43dfc4159d86f3a37a5a4b3d4580b888ad7d4ddd";
        DODOApproveProxyAddress = "0x335aC99bb3E51BDbF22025f092Ebc1Cf2c5cC619";
        DODOCirculationHelperAddress = "";
        vDODOTokenAddress = "0xc4436fBAE6eBa5d95bf7d53Ae515F8A707Bd402A";
        GovernanceAddress = "0x0000000000000000000000000000000000000000";
        //Account
        multiSigAddress = "0x95C4F5b83aA70810D4f142d58e5F7242Bd891CB0";
        dodoTeam = "0x95C4F5b83aA70810D4f142d58e5F7242Bd891CB0";
    } else if (network == "bsclive") {
        DODOTokenAddress = "0x67ee3Cb086F8a16f34beE3ca72FAD36F7Db929e2";
        DODOApproveProxyAddress = "0xB76de21f04F677f07D9881174a1D8E624276314C";
        //Account
        multiSigAddress = "0xcaa42F09AF66A8BAE3A7445a7f63DAD97c11638b";
    } else return;

    logger.log("====================================================");
    logger.log("network type: " + network);
    logger.log("Deploy time: " + new Date().toLocaleString());


    
    if (deploySwitch.MINE) {
        logger.log("Deploy type: DODOMine");
        await deployer.deploy(DODOMine, DODOTokenAddress, 5008500);
        DODOMineAddress = DODOMine.address;
        logger.log("DODOMineAddress: ", DODOMineAddress);
        const dodoMineInstance = await DODOMine.at(DODOMineAddress);
        //Add dodo
        var tx = await dodoMineInstance.addLpToken(DODOTokenAddress,"3000000000000000000000",true);
        logger.log("Add DODO Tx:", tx.tx);
        //set BLockReward
        tx = await dodoMineInstance.setReward("1000000000000000", true);
        logger.log("Set blockReward Tx:", tx.tx);

        //transfer DODO to Vault

        //transfer owner
    }
    
    
    if (deploySwitch.DODORecharge) {
        logger.log("Deploy type: DODORecharge");
        await deployer.deploy(DODORecharge, DODOTokenAddress, DODOApproveProxyAddress);
        DODORechargeAddress = DODORecharge.address;
        logger.log("DODORechargeAddress: ", DODORechargeAddress);
        const dodoRechargeInstance = await DODORecharge.at(DODORechargeAddress);
        var tx = await dodoRechargeInstance.initOwner(multiSigAddress);
        logger.log("Init DODORechargeAddress Tx:", tx.tx);
    }

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

        if (network == 'kovan') {
            //ApproveProxy add
            const DODOApproveProxyInstance = await DODOApproveProxy.at(DODOApproveProxyAddress);
            tx = await DODOApproveProxyInstance.unlockAddProxy(DODOMigrationBSCAddress);
            logger.log("DODOApproveProxy Unlock tx: ", tx.tx);
            tx = await DODOApproveProxyInstance.addDODOProxy();
            logger.log("DODOApproveProxy add tx: ", tx.tx);
        }
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
            // const DODOApproveProxyInstance = await DODOApproveProxy.at(DODOApproveProxyAddress);
            // tx = await DODOApproveProxyInstance.unlockAddProxy(vDODOTokenAddress);
            // logger.log("DODOApproveProxy Unlock tx: ", tx.tx);
            // tx = await DODOApproveProxyInstance.addDODOProxy();
            // logger.log("DODOApproveProxy add tx: ", tx.tx);

            // //Mint DODO first
            // tx = await vDODOTokenInstance.mint("100000000000000000000000",dodoTeam);
            // logger.log("vDODOToken first mint tx: ", tx.tx);
            
            // //preDepositedBlockReward
            // tx = await vDODOTokenInstance.preDepositedBlockReward("100000000000000000000000");
            // logger.log("vDODOToken injected dodo tx: ", tx.tx);

            // //changePerReward
            // tx = await vDODOTokenInstance.changePerReward("100000000000000000");
            // logger.log("vDODOToken changeReward tx: ", tx.tx);

        }
    }

};
