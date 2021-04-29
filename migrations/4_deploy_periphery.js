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
const MultiCall = artifacts.require("Multicall");
const LockedTokenVault = artifacts.require("LockedTokenVault");
const DODORouteProxy = artifacts.require("DODORouteProxy");
const DODOCpProxy = artifacts.require("DODOCpProxy");

const DspTemplate = artifacts.require("DSP");
const DspFactory = artifacts.require("DSPFactory");
const DODODspProxy = artifacts.require("DODODspProxy");
const DODOV2RouteHelper = artifacts.require("DODOV2RouteHelper");

const ERC20Mine = artifacts.require("ERC20Mine");
const vDODOMine = artifacts.require("vDODOMine");

module.exports = async (deployer, network, accounts) => {
    let CONFIG = GetConfig(network, accounts)
    if (CONFIG == null) return;

    let WETHAddress = CONFIG.WETH;
    let DODOTokenAddress = CONFIG.DODO;
    let DODOApproveProxyAddress = CONFIG.DODOApproveProxy;

    let DspTemplateAddress = CONFIG.DSP;
    let DspFactoryAddress = CONFIG.DSPFactory;
    let DvmFactoryAddress = CONFIG.DVMFactory;
    let DppFactoryAddress = CONFIG.DPPFactory;
    let UpCpFactoryAddress = CONFIG.UpCpFactory;
    let CpFactoryAddress = CONFIG.CrowdPoolingFactory;


    let DODOCirculationHelperAddress = CONFIG.DODOCirculationHelper;
    let GovernanceAddress = CONFIG.Governance;
    let vDODOTokenAddress = CONFIG.vDODOToken;
    let dodoTeam = CONFIG.dodoTeam;

    let CloneFactoryAddress = CONFIG.CloneFactory;
    let DefaultMtFeeRateAddress = CONFIG.FeeRateModel;
    let DefaultPermissionAddress = CONFIG.PermissionManager;
    let CpTemplateAddress = CONFIG.CP;
    let DvmTemplateAddress = CONFIG.DVM;

    let multiSigAddress = CONFIG.multiSigAddress;
    let defaultMaintainer = CONFIG.defaultMaintainer;

    if (deploySwitch.ERC20Mine) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: ERC20Mine");

        var erc20TokenAddress = "0x86a7649aD78F6a0432189C99B909fe1E6682E0d8";
        var owner = multiSigAddress;

        await deployer.deploy(ERC20Mine);

        logger.log("erc20Mine address: ", ERC20Mine.address);
        const erc20MineInstance = await ERC20Mine.at(ERC20Mine.address);
        var tx = await erc20MineInstance.init(owner, erc20TokenAddress);
        logger.log("Init ERC20Mine Tx:", tx.tx);

        //add Token
        var reward0Token = "0xd7f02d1b4f9495b549787808503ecfd231c3fbda"
        var reward1Token = "0xfe1133ea03d701c5006b7f065bbf987955e7a67c"
        var rewardPerBlock = "10000000000000000" //0.01
        var startBlock = 24368900
        var endBlock = 25368900
        tx = await erc20MineInstance.addRewardToken(
            reward0Token,
            rewardPerBlock,
            startBlock,
            endBlock
        );
        logger.log("Add rewardToken0 Tx:", tx.tx);

        // tx = await erc20MineInstance.addRewardToken(
        //     reward1Token,
        //     rewardPerBlock,
        //     startBlock,
        //     endBlock
        // );
        // logger.log("Add rewardToken1 Tx:", tx.tx);

        //TODO: TransferReward to RewardVault
    }

    if (deploySwitch.LockedVault) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: LockedVault");
        await deployer.deploy(
            LockedTokenVault,
            "0xd8C30a4E866B188F16aD266dC3333BD47F34ebaE",
            1616468400,
            2592000,
            "100000000000000000"
        );
        logger.log("LockedVault address: ", LockedTokenVault.address);
        //TODO: approve && deposit
    }

    if (deploySwitch.DSP) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: DSP");

        if (DspTemplateAddress == "") {
            await deployer.deploy(DspTemplate);
            DspTemplateAddress = DspTemplate.address;
            logger.log("DspTemplateAddress: ", DspTemplateAddress);
        }

        if (DspFactoryAddress == "") {
            await deployer.deploy(
                DspFactory,
                CloneFactoryAddress,
                DspTemplateAddress,
                defaultMaintainer,
                DefaultMtFeeRateAddress
            );
            DspFactoryAddress = DspFactory.address;
            logger.log("DspFactoryAddress: ", DspFactoryAddress);
            const DspFactoryInstance = await DspFactory.at(DspFactoryAddress);
            var tx = await DspFactoryInstance.initOwner(multiSigAddress);
            logger.log("Init DspFactory Tx:", tx.tx);
        }

        await deployer.deploy(DODOV2RouteHelper, DvmFactoryAddress, DppFactoryAddress, DspFactoryAddress);
        DODOV2RouteHelperAddress = DODOV2RouteHelper.address;
        logger.log("DODOV2RouteHelper Address: ", DODOV2RouteHelperAddress);

        await deployer.deploy(
            DODODspProxy,
            DspFactoryAddress,
            WETHAddress,
            DODOApproveProxyAddress
        );
        logger.log("DODODspProxy Address: ", DODODspProxy.address);
    }

    if (deploySwitch.CpProxy) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: DODOCpProxy");
        await deployer.deploy(
            DODOCpProxy,
            WETHAddress,
            CpFactoryAddress,
            UpCpFactoryAddress,
            DODOApproveProxyAddress
        );
        logger.log("CpProxy address: ", DODOCpProxy.address);
    }


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

    if (deploySwitch.MultiCall) {
        await deployer.deploy(MultiCall);
        MultiCallAddress = MultiCall.address;
        logger.log("MultiCallAddress: ", MultiCallAddress);
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

    if (deploySwitch.DVM) {
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

    if (deploySwitch.MULTIHOP) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: DODORouteProxy");

        await deployer.deploy(
            DODORouteProxy,
            WETHAddress,
            DODOApproveProxyAddress
        );

        logger.log("DODORouteProxy Address: ", DODORouteProxy.address);
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
