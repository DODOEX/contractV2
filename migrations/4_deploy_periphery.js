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
const DODOApproveProxy = artifacts.require("DODOApproveProxy");

const DspTemplate = artifacts.require("DSP");
const DspFactory = artifacts.require("DSPFactory");
const DODODspProxy = artifacts.require("DODODspProxy");
const DODOV2RouteHelper = artifacts.require("DODOV2RouteHelper");

const ERC20Mine = artifacts.require("ERC20Mine");
const vDODOMine = artifacts.require("vDODOMine");
const ERC20V2Factory = artifacts.require("ERC20V2Factory");
const ERC20 = artifacts.require("InitializableERC20");
const CustomERC20 = artifacts.require("CustomERC20");

const ERC20MineV3 = artifacts.require("ERC20MineV3");
const DODOMineV3Registry = artifacts.require("DODOMineV3Registry");
const DODOMineV3Proxy = artifacts.require("DODOMineV3Proxy");


const CurveAdapter = artifacts.require("CurveUnderlyingAdapter");

module.exports = async (deployer, network, accounts) => {
    let CONFIG = GetConfig(network, accounts)
    if (CONFIG == null) return;

    let WETHAddress = CONFIG.WETH;
    let DODOTokenAddress = CONFIG.DODO;
    let DODOApproveProxyAddress = CONFIG.DODOApproveProxy;
    let WETH = CONFIG.WETH;

    let DspTemplateAddress = CONFIG.DSP;
    let DspFactoryAddress = CONFIG.DSPFactory;
    let DvmFactoryAddress = CONFIG.DVMFactory;
    let DppFactoryAddress = CONFIG.DPPFactory;
    let UpCpFactoryAddress = CONFIG.UpCpFactory;
    let CpFactoryAddress = CONFIG.CrowdPoolingFactory;
    let ERC20V2FactoryAddress = CONFIG.ERC20V2Factory;

    let DODOCirculationHelperAddress = CONFIG.DODOCirculationHelper;
    let GovernanceAddress = CONFIG.Governance;
    let vDODOTokenAddress = CONFIG.vDODOToken;
    let dodoTeam = CONFIG.dodoTeam;

    let CloneFactoryAddress = CONFIG.CloneFactory;
    let DefaultMtFeeRateAddress = CONFIG.FeeRateModel;
    let DefaultPermissionAddress = CONFIG.PermissionManager;
    let CpTemplateAddress = CONFIG.CP;
    let DvmTemplateAddress = CONFIG.DVM;
    let CustomERC20Address = CONFIG.CustomERC20;
    let ERC20Address = CONFIG.ERC20;

    let multiSigAddress = CONFIG.multiSigAddress;
    let defaultMaintainer = CONFIG.defaultMaintainer;

    let ERC20MineV3Address = CONFIG.ERC20MineV3;
    let DODOMineV3RegistryAddress = CONFIG.DODOMineV3Registry;
    let DODOMineV3ProxyAddress = CONFIG.DODOMineV3Proxy;


    if (deploySwitch.MineV3) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: MineV3");

        if (ERC20MineV3Address == "") {
            await deployer.deploy(ERC20MineV3);
            ERC20MineV3Address = ERC20MineV3.address;
            logger.log("ERC20MineV3Address: ", ERC20MineV3Address);
        }

        if (DODOMineV3RegistryAddress == "") {
            await deployer.deploy(DODOMineV3Registry);
            DODOMineV3RegistryAddress = DODOMineV3Registry.address;
            logger.log("DODOMineV3RegistryAddress: ", DODOMineV3RegistryAddress);

            const dodoMineV3RegistryInstance = await DODOMineV3Registry.at(DODOMineV3RegistryAddress);
            var tx = await dodoMineV3RegistryInstance.initOwner(multiSigAddress);
            logger.log("Init DODOMineV3Registry Tx:", tx.tx);
        }

        if (DODOMineV3ProxyAddress == "") {
            await deployer.deploy(
                DODOMineV3Proxy,
                CloneFactoryAddress,
                ERC20MineV3Address,
                DODOApproveProxyAddress,
                DODOMineV3RegistryAddress
            );
            DODOMineV3ProxyAddress = DODOMineV3Proxy.address;
            logger.log("DODOMineV3ProxyAddress: ", DODOMineV3ProxyAddress);

            const dodoMineV3ProxyInstance = await DODOMineV3Proxy.at(DODOMineV3ProxyAddress);
            var tx = await dodoMineV3ProxyInstance.initOwner(multiSigAddress);
            logger.log("Init DODOMineV3Proxy Tx:", tx.tx);
        }

        if (network == 'kovan' || network == 'rinkeby') {
            const dodoMineV3RegistryInstance = await DODOMineV3Registry.at(DODOMineV3RegistryAddress);
            var tx = await dodoMineV3RegistryInstance.addAdminList(DODOMineV3ProxyAddress);
            logger.log("DODOMineV3RegistryAddress Init tx: ", tx.tx);

            const DODOApproveProxyInstance = await DODOApproveProxy.at(DODOApproveProxyAddress);
            tx = await DODOApproveProxyInstance.unlockAddProxy(DODOMineV3ProxyAddress);
            logger.log("DODOApproveProxy Unlock tx: ", tx.tx);

            tx = await DODOApproveProxyInstance.addDODOProxy();
            logger.log("DODOApproveProxy AddProxy tx: ", tx.tx);
        }

    }

    if (deploySwitch.ERC20V2Factory) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: ERC20V2Factory");

        if (ERC20Address == "") {
            await deployer.deploy(ERC20);
            ERC20Address = ERC20.address;
            logger.log("ERC20Address: ", ERC20Address);
        }
        if (CustomERC20Address == "") {
            await deployer.deploy(CustomERC20);
            CustomERC20Address = CustomERC20.address;
            logger.log("CustomERC20Address: ", CustomERC20Address);
        }

        if (ERC20V2FactoryAddress == "") {
            await deployer.deploy(
                ERC20V2Factory,
                CloneFactoryAddress,
                ERC20Address,
                CustomERC20Address
            );
            ERC20V2FactoryAddress = ERC20V2Factory.address;
            logger.log("ERC20V2FactoryAddress: ", ERC20V2FactoryAddress);

            const erc20V2FactoryInstance = await ERC20V2Factory.at(ERC20V2FactoryAddress);
            var tx = await erc20V2FactoryInstance.initOwner(multiSigAddress);
            logger.log("Init ERC20V2Factory Tx:", tx.tx);
        }

    }


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

        if (network == 'kovan' || network == 'rinkeby') {
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

            // //Mint DODO first
            tx = await vDODOTokenInstance.mint("100000000000000000000000",dodoTeam);
            logger.log("vDODOToken first mint tx: ", tx.tx);

            // //preDepositedBlockReward
            tx = await vDODOTokenInstance.preDepositedBlockReward("10000000000000000000000000");
            logger.log("vDODOToken injected dodo tx: ", tx.tx);

            // //changePerReward
            tx = await vDODOTokenInstance.changePerReward("10000000000000000");
            logger.log("vDODOToken changeReward tx: ", tx.tx);

        }
    }

    if (deploySwitch.test_ADAPTER) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: test - Adapter");

        await deployer.deploy(CurveAdapter);

        logger.log("test_Adapter Address: ", CurveAdapter.address);
    }
};
