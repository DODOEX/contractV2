const fs = require("fs");
const { deploySwitch } = require('../truffle-config.js')
const file = fs.createWriteStream("../deploy-detail-periphery.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);
const { GetConfig } = require("../configAdapter.js")

const DODORecharge = artifacts.require("DODORecharge");
const DvmTemplate = artifacts.require("DVM");
const CpTemplate = artifacts.require("CP");
const vDODOToken = artifacts.require("vDODOToken");
const DODOCirculationHelper = artifacts.require("DODOCirculationHelper");
const DODOMine = artifacts.require("DODOMine");
const FeeRateImpl = artifacts.require("FeeRateImpl");
const WETH9 = artifacts.require("WETH9");
const DODOToken = artifacts.require("DODOToken");
const UpCrowdPoolingFactory = artifacts.require("UpCrowdPoolingFactory");
const CpFactory = artifacts.require("CrowdPoolingFactory");

module.exports = async (deployer, network, accounts) => {
    let CONFIG = GetConfig(network, accounts)
    if (CONFIG == null) return;

    let DODOTokenAddress = CONFIG.DODO;
    let DODOApproveProxyAddress = CONFIG.DODOApproveProxy;

    let DODOCirculationHelperAddress = CONFIG.DODOCirculationHelper;
    let GovernanceAddress = CONFIG.Governance;
    let vDODOTokenAddress = CONFIG.vDODOToken;
    let dodoTeam = CONFIG.dodoTeam;

    let CloneFactoryAddress = CONFIG.CloneFactory;
    let DefaultMtFeeRateAddress = CONFIG.FeeRateModel;
    let DefaultPermissionAddress = CONFIG.PermissionManager;
    let CpTemplateAddress = CONFIG.CP;
    let DvmFactoryAddress = CONFIG.DVMFactory;
    let DvmTemplateAddress = CONFIG.DVM;

    let multiSigAddress = CONFIG.multiSigAddress;
    let defaultMaintainer = CONFIG.defaultMaintainer;

    if (deploySwitch.UpCP) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: UpCrowdPoolingFactory");
        await deployer.deploy(
            UpCrowdPoolingFactory,
            CloneFactoryAddress,
            CpTemplateAddress,
            DvmFactoryAddress,
            defaultMaintainer,
            DefaultMtFeeRateAddress,
            DefaultPermissionAddress
        );
        logger.log("UpCrowdPoolingFactory address: ", UpCrowdPoolingFactory.address);
        const UpCpFactoryInstance = await UpCrowdPoolingFactory.at(UpCrowdPoolingFactory.address);
        var tx = await UpCpFactoryInstance.initOwner(multiSigAddress);
        logger.log("Init UpCpFactory Tx:", tx.tx);
    }

    if (deploySwitch.CPFactory) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: CrowdPoolingFactory");
        await deployer.deploy(
            CpFactory,
            CloneFactoryAddress,
            CpTemplateAddress,
            DvmFactoryAddress,
            defaultMaintainer,
            DefaultMtFeeRateAddress,
            DefaultPermissionAddress
        );
        logger.log("CrowdPoolingFactory address: ", CpFactory.address);
        const cpFactoryInstance = await CpFactory.at(CpFactory.address);
        var tx = await cpFactoryInstance.initOwner(multiSigAddress);
        logger.log("Init CpFactory Tx:", tx.tx);
    }

    if(deploySwitch.DVM) {
        await deployer.deploy(DvmTemplate);
        DvmTemplateAddress = DvmTemplate.address;
        logger.log("DvmTemplateAddress: ", DvmTemplateAddress);
    }

    if (deploySwitch.CP) {
        await deployer.deploy(CpTemplate);
        CpTemplateAddress = CpTemplate.address;
        logger.log("CpTemplateAddress: ", CpTemplateAddress);
    }

    if (deploySwitch.FEERATEIMPL) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: FeeRateImpl");
        await deployer.deploy(FeeRateImpl);
        var FeeRateImplAddress = FeeRateImpl.address;
        logger.log("FeeRateImplAddress: ", FeeRateImplAddress);
        const feeRateImplInstance = await FeeRateImpl.at(FeeRateImplAddress);
        var tx = await feeRateImplInstance.initOwner(multiSigAddress);
        logger.log("Init feeRateImpl Tx:", tx.tx);
    }

    if (deploySwitch.DODO) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: DODOToken");
        await deployer.deploy(DODOToken);
        logger.log("DODOTokenAddress: ", DODOToken.address);
    }

    if (deploySwitch.WETH) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: WETH9");
        await deployer.deploy(WETH9);
        var WETH9Address = WETH9.address;
        logger.log("WETH9Address: ", WETH9Address);
    }

    if (deploySwitch.MINE) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: DODOMine");
        await deployer.deploy(DODOMine, DODOTokenAddress, 5008500);
        DODOMineAddress = DODOMine.address;
        logger.log("DODOMineAddress: ", DODOMineAddress);
        const dodoMineInstance = await DODOMine.at(DODOMineAddress);
        //Add dodo
        var tx = await dodoMineInstance.addLpToken(DODOTokenAddress, "3000000000000000000000", true);
        logger.log("Add DODO Tx:", tx.tx);
        //set BLockReward
        tx = await dodoMineInstance.setReward("1000000000000000", true);
        logger.log("Set blockReward Tx:", tx.tx);

        //transfer DODO to Vault

        //transfer owner
    }


    if (deploySwitch.DODORecharge) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: DODORecharge");
        await deployer.deploy(DODORecharge, DODOTokenAddress, DODOApproveProxyAddress);
        DODORechargeAddress = DODORecharge.address;
        logger.log("DODORechargeAddress: ", DODORechargeAddress);
        const dodoRechargeInstance = await DODORecharge.at(DODORechargeAddress);
        var tx = await dodoRechargeInstance.initOwner(multiSigAddress);
        logger.log("Init DODORechargeAddress Tx:", tx.tx);
    }


    if (deploySwitch.vDODOToken) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
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

        if (network == 'kovan') {
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
