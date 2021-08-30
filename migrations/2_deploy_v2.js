const fs = require("fs");
const { deploySwitch } = require('../truffle-config.js')
const file = fs.createWriteStream("../deploy-detail-v2.0.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);
const { GetConfig } = require("../configAdapter.js")

const CloneFactory = artifacts.require("CloneFactory");
const FeeRateModelTemplate = artifacts.require("FeeRateModel");
const FeeRateDIP3 = artifacts.require("FeeRateDIP3Impl");
const PermissionManagerTemplate = artifacts.require("PermissionManager");
const DODOSellHelper = artifacts.require("DODOSellHelper");
const DODOV1PmmHelper = artifacts.require("DODOV1PmmHelper");
const DODOV2RouteHelper = artifacts.require("DODOV2RouteHelper");
const DODOSwapCalcHelper = artifacts.require("DODOSwapCalcHelper");
const ERC20Helper = artifacts.require("ERC20Helper");
const MultiCall = artifacts.require("Multicall");
const DODOCalleeHelper = artifacts.require("DODOCalleeHelper");

const DvmTemplate = artifacts.require("DVM");
const DspTemplate = artifacts.require("DSP");
const DppTemplate = artifacts.require("DPP");
const DppAdminTemplate = artifacts.require("DPPAdmin");
const CpTemplate = artifacts.require("CP");
const ERC20Template = artifacts.require("InitializableERC20");
const CustomERC20Template = artifacts.require("CustomERC20");
const ERC20MineV2 = artifacts.require("ERC20Mine");
const ERC20MineV3 = artifacts.require("ERC20MineV3");

const ERC20V2Factory = artifacts.require("ERC20V2Factory");
const DvmFactory = artifacts.require("DVMFactory");
const DppFactory = artifacts.require("DPPFactory");
const DspFactory = artifacts.require("DSPFactory");
const CpFactory = artifacts.require("CrowdPoolingFactory");
const UpCpFactory = artifacts.require("UpCrowdPoolingFactory");
const MineV3Registry = artifacts.require("DODOMineV3Registry");
const MineV2Factory = artifacts.require("DODOMineV2Factory");

const DODOApprove = artifacts.require("DODOApprove");
const DODOApproveProxy = artifacts.require("DODOApproveProxy");

const DODODspProxy = artifacts.require("DODODspProxy");
const DODOCpProxy = artifacts.require("DODOCpProxy");
const DODORouteProxy = artifacts.require("DODORouteProxy");
const DODOMineV3Proxy = artifacts.require("DODOMineV3Proxy");
const DODOProxyV2 = artifacts.require("DODOV2Proxy02");

const DODOV1Adapter = artifacts.require("DODOV1Adapter");
const DODOV2Adapter = artifacts.require("DODOV2Adapter");
const UniAdapter = artifacts.require("UniAdapter");


module.exports = async (deployer, network, accounts) => {
    let CONFIG = GetConfig(network, accounts)
    if (CONFIG == null) return;
    //TOKEN
    let WETHAddress = CONFIG.WETH;

    //Helper
    let DODOSellHelperAddress = CONFIG.DODOSellHelper;
    let DODOCalleeHelperAddress = CONFIG.DODOCalleeHelper;
    let DODORouteV2HelperAddress = CONFIG.DODOV2RouteHelper;
    let DODOV1PmmHelperAddress = CONFIG.DODOV1PmmHelper;
    let DODOSwapCalcHelperAddress = CONFIG.DODOSwapCalcHelper;
    let ERC20HelperAddress = CONFIG.ERC20Helper;
    let MultiCallAddress = CONFIG.MultiCall;

    //Template
    let CloneFactoryAddress = CONFIG.CloneFactory;
    let DefaultMtFeeRateAddress = CONFIG.FeeRateModel;
    let FeeRateDIP3Address = CONFIG.FeeRateDIP3;
    let DefaultPermissionAddress = CONFIG.PermissionManager;
    let DvmTemplateAddress = CONFIG.DVM;
    let DspTemplateAddress = CONFIG.DSP;
    let DppTemplateAddress = CONFIG.DPP;
    let DppAdminTemplateAddress = CONFIG.DPPAdmin;
    let CpTemplateAddress = CONFIG.CP;
    let ERC20TemplateAddress = CONFIG.ERC20;
    let CustomERC20TemplateAddress = CONFIG.CustomERC20;
    let MineV2TemplateAddress = CONFIG.ERC20MineV2;
    let MineV3TemplateAddress = CONFIG.ERC20MineV3;

    //Facotry
    let DvmFactoryAddress = CONFIG.DVMFactory;
    let DspFactoryAddress = CONFIG.DSPFactory;
    let DppFactoryAddress = CONFIG.DPPFactory;
    let CpFactoryAddress = CONFIG.CrowdPoolingFactory;
    let UpCpFactoryAddress = CONFIG.UpCpFactory;
    let ERC20V2FactoryAddress = CONFIG.ERC20V2Factory;
    let DODOMineV3RegistryAddress = CONFIG.DODOMineV3Registry;
    let DODOMineV2FactoryAddress = CONFIG.DODOMineV2Factory;

    //Approve
    let DODOApproveAddress = CONFIG.DODOApprove;
    let DODOApproveProxyAddress = CONFIG.DODOApproveProxy;

    //Adapter
    let DODOV1AdpaterAddress = CONFIG.DODOV1Adapter;
    let DODOV2AdapterAddress = CONFIG.DODOV2Adapter;
    let UniAdapterAddress = CONFIG.UniAdapter;

    //Proxy
    let DODOV2ProxyAddress = CONFIG.DODOV2Proxy;
    let DODODspProxyAddress = CONFIG.DSPProxy;
    let DODOCpProxyAddress = CONFIG.CpProxy;
    let DODOMineV3ProxyAddress = CONFIG.DODOMineV3Proxy;
    let DODORouteProxyAddress = CONFIG.RouteProxy;


    //Account
    let multiSigAddress = CONFIG.multiSigAddress;
    let defaultMaintainer = CONFIG.defaultMaintainer;


    if (deploySwitch.DEPLOY_V2) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: V2");
        logger.log("multiSigAddress: ", multiSigAddress)

        //Helper
        if (MultiCallAddress == "") {
            await deployer.deploy(MultiCall);
            MultiCallAddress = MultiCall.address;
            logger.log("MultiCallAddress: ", MultiCallAddress);
        }

        if (DODOSellHelperAddress == "") {
            await deployer.deploy(DODOSellHelper);
            DODOSellHelperAddress = DODOSellHelper.address;
            logger.log("DODOSellHelper Address: ", DODOSellHelperAddress);
        }

        if (DODOSwapCalcHelperAddress == "") {
            await deployer.deploy(DODOSwapCalcHelper, DODOSellHelperAddress);
            logger.log("DODOSwapCalcHelper Address: ", DODOSwapCalcHelper.address);
        }

        if (ERC20HelperAddress == "") {
            await deployer.deploy(ERC20Helper);
            logger.log("ERC20Helper Address: ", ERC20Helper.address);
        }

        if (DODOCalleeHelperAddress == "") {
            await deployer.deploy(DODOCalleeHelper, WETHAddress);
            DODOCalleeHelperAddress = DODOCalleeHelper.address;
            logger.log("DODOCalleeHelperAddress: ", DODOCalleeHelperAddress);
        }

        if (DODOV1PmmHelperAddress == "") {
            await deployer.deploy(DODOV1PmmHelper);
            DODOV1PmmHelperAddress = DODOV1PmmHelper.address;
            logger.log("DODOV1RouterHelper Address: ", DODOV1PmmHelperAddress);
        }

        //Template
        if (CloneFactoryAddress == "") {
            await deployer.deploy(CloneFactory);
            CloneFactoryAddress = CloneFactory.address;
            logger.log("CloneFactoryAddress: ", CloneFactoryAddress);
        }

        if (DefaultMtFeeRateAddress == "") {
            await deployer.deploy(FeeRateModelTemplate);
            DefaultMtFeeRateAddress = FeeRateModelTemplate.address;
            logger.log("DefaultMtFeeRateAddress: ", DefaultMtFeeRateAddress);
            const defaultMtFeeRateInstance = await FeeRateModelTemplate.at(DefaultMtFeeRateAddress);
            var tx = await defaultMtFeeRateInstance.initOwner(multiSigAddress);
            logger.log("Init DefaultMtFeeRateAddress Tx:", tx.tx);
        }

        if (FeeRateDIP3Address == "") {
            await deployer.deploy(FeeRateDIP3);
            FeeRateDIP3Address = FeeRateDIP3.address;
            logger.log("FeeRateDIP3 Address: ", FeeRateDIP3Address);
            const feeRateDIP3Instance = await FeeRateDIP3.at(FeeRateDIP3Address);
            var tx = await feeRateDIP3Instance.initOwner(multiSigAddress);
            logger.log("Init FeeRateDIP3 Tx:", tx.tx);
        }

        if (DefaultPermissionAddress == "") {
            await deployer.deploy(PermissionManagerTemplate);
            DefaultPermissionAddress = PermissionManagerTemplate.address;
            logger.log("DefaultPermissionAddress: ", DefaultPermissionAddress);
            const defaultPermissionInstance = await PermissionManagerTemplate.at(DefaultPermissionAddress);
            var tx = await defaultPermissionInstance.initOwner(multiSigAddress);
            logger.log("Init DefaultPermissionAddress Tx:", tx.tx);
        }

        if (DvmTemplateAddress == "") {
            await deployer.deploy(DvmTemplate);
            DvmTemplateAddress = DvmTemplate.address;
            logger.log("DvmTemplateAddress: ", DvmTemplateAddress);
        }

        if (DspTemplateAddress == "") {
            await deployer.deploy(DspTemplate);
            DspTemplateAddress = DspTemplate.address;
            logger.log("DspTemplateAddress: ", DspTemplateAddress);
        }

        if (DppTemplateAddress == "") {
            await deployer.deploy(DppTemplate);
            DppTemplateAddress = DppTemplate.address;
            logger.log("DppTemplateAddress: ", DppTemplateAddress);
        }

        if (DppAdminTemplateAddress == "") {
            await deployer.deploy(DppAdminTemplate);
            DppAdminTemplateAddress = DppAdminTemplate.address;
            logger.log("DppAdminTemplateAddress: ", DppAdminTemplateAddress);
        }

        if (CpTemplateAddress == "") {
            await deployer.deploy(CpTemplate);
            CpTemplateAddress = CpTemplate.address;
            logger.log("CpTemplateAddress: ", CpTemplateAddress);
        }

        if (ERC20TemplateAddress == "") {
            await deployer.deploy(ERC20Template);
            ERC20TemplateAddress = ERC20Template.address;
            logger.log("ERC20TemplateAddress: ", ERC20TemplateAddress);
        }

        if (CustomERC20TemplateAddress == "") {
            await deployer.deploy(CustomERC20Template);
            CustomERC20TemplateAddress = CustomERC20Template.address;
            logger.log("CustomERC20TemplateAddress: ", CustomERC20TemplateAddress);
        }

        if (MineV2TemplateAddress == "") {
            await deployer.deploy(ERC20MineV2);
            MineV2TemplateAddress = ERC20MineV2.address;
            logger.log("MineV2TemplateAddress: ", MineV2TemplateAddress);
        }

        if (MineV3TemplateAddress == "") {
            await deployer.deploy(ERC20MineV3);
            MineV3TemplateAddress = ERC20MineV3.address;
            logger.log("MineV3TemplateAddress: ", MineV3TemplateAddress);
        }


        //Approve
        if (DODOApproveAddress == "") {
            await deployer.deploy(DODOApprove);
            DODOApproveAddress = DODOApprove.address;
            logger.log("DODOApprove Address: ", DODOApproveAddress);
        }

        if (DODOApproveProxyAddress == "") {
            await deployer.deploy(DODOApproveProxy, DODOApproveAddress);
            DODOApproveProxyAddress = DODOApproveProxy.address;
            logger.log("DODOApproveProxy Address: ", DODOApproveProxyAddress);
        }


        //Factory
        if (ERC20V2FactoryAddress == "") {
            await deployer.deploy(
                ERC20V2Factory,
                CloneFactoryAddress,
                ERC20TemplateAddress,
                CustomERC20TemplateAddress
            );
            ERC20V2FactoryAddress = ERC20V2Factory.address;
            logger.log("ERC20V2FactoryAddress: ", ERC20V2FactoryAddress);
            const ERC20V2FactoryInstance = await ERC20V2Factory.at(ERC20V2FactoryAddress);
            var tx = await ERC20V2FactoryInstance.initOwner(multiSigAddress);
            logger.log("Init ERC20V2Factory Tx:", tx.tx);
        }

        if (DvmFactoryAddress == "") {
            await deployer.deploy(
                DvmFactory,
                CloneFactoryAddress,
                DvmTemplateAddress,
                defaultMaintainer,
                DefaultMtFeeRateAddress
            );
            DvmFactoryAddress = DvmFactory.address;
            logger.log("DvmFactoryAddress: ", DvmFactoryAddress);
            const DvmFactoryInstance = await DvmFactory.at(DvmFactoryAddress);
            var tx = await DvmFactoryInstance.initOwner(multiSigAddress);
            logger.log("Init DvmFactory Tx:", tx.tx);
        }

        if (DppFactoryAddress == "") {
            await deployer.deploy(
                DppFactory,
                CloneFactoryAddress,
                DppTemplateAddress,
                DppAdminTemplateAddress,
                defaultMaintainer,
                DefaultMtFeeRateAddress,
                DODOApproveProxyAddress
            );
            DppFactoryAddress = DppFactory.address;
            logger.log("DppFactoryAddress: ", DppFactoryAddress);
            const DppFactoryInstance = await DppFactory.at(DppFactoryAddress);
            var tx = await DppFactoryInstance.initOwner(multiSigAddress);
            logger.log("Init DppFactory Tx:", tx.tx);
        }

        if (UpCpFactoryAddress == "") {
            await deployer.deploy(
                UpCpFactory,
                CloneFactoryAddress,
                CpTemplateAddress,
                DvmFactoryAddress,
                defaultMaintainer,
                DefaultMtFeeRateAddress,
                DefaultPermissionAddress
            );
            UpCpFactoryAddress = UpCpFactory.address;
            logger.log("UpCrowdPoolingFactory address: ", UpCpFactory.address);
            const UpCpFactoryInstance = await UpCpFactory.at(UpCpFactory.address);
            var tx = await UpCpFactoryInstance.initOwner(multiSigAddress);
            logger.log("Init UpCpFactory Tx:", tx.tx);
        }

        if (CpFactoryAddress == "") {
            await deployer.deploy(
                CpFactory,
                CloneFactoryAddress,
                CpTemplateAddress,
                DvmFactoryAddress,
                defaultMaintainer,
                DefaultMtFeeRateAddress,
                DefaultPermissionAddress
            );
            CpFactoryAddress = CpFactory.address;
            logger.log("CpFactoryAddress: ", CpFactoryAddress);
            const CpFactoryInstance = await CpFactory.at(CpFactoryAddress);
            var tx = await CpFactoryInstance.initOwner(multiSigAddress);
            logger.log("Init CpFactory Tx:", tx.tx);
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

        if (DODOMineV2FactoryAddress == "") {
            await deployer.deploy(
                MineV2Factory,
                CloneFactoryAddress,
                MineV2TemplateAddress,
                defaultMaintainer
            );
            DODOMineV2FactoryAddress = MineV2Factory.address;
            logger.log("DODOMineV2FactoryAddress: ", DODOMineV2FactoryAddress);
        }

        if (DODOMineV3RegistryAddress == "") {
            await deployer.deploy(MineV3Registry);
            DODOMineV3RegistryAddress = MineV3Registry.address;
            logger.log("DODOMineV3RegistryAddress: ", DODOMineV3RegistryAddress);

            const dodoMineV3RegistryInstance = await MineV3Registry.at(DODOMineV3RegistryAddress);
            var tx = await dodoMineV3RegistryInstance.initOwner(multiSigAddress);
            logger.log("Init DODOMineV3Registry Tx:", tx.tx);
        }

        if (DODORouteV2HelperAddress == "") {
            await deployer.deploy(DODOV2RouteHelper, DvmFactoryAddress, DppFactoryAddress, DspFactoryAddress);
            DODOV2RouteHelperAddress = DODOV2RouteHelper.address;
            logger.log("DODOV2RouteHelper Address: ", DODOV2RouteHelperAddress);
        }

        //Adapter
        if (DODOV1AdpaterAddress == "") {
            await deployer.deploy(DODOV1Adapter, DODOSellHelperAddress);
            logger.log("DODOV1Adapter Address: ", DODOV1Adapter.address);
        }
        if (DODOV2AdapterAddress == "") {
            await deployer.deploy(DODOV2Adapter)
            logger.log("DODOV2Adapter Address: ", DODOV2Adapter.address);
        }
        if (UniAdapterAddress == "") {
            await deployer.deploy(UniAdapter)
            logger.log("UniAdapter Address: ", UniAdapter.address);
        }


        //Proxy 
        if (DODOV2ProxyAddress == "") {
            await deployer.deploy(
                DODOProxyV2,
                DvmFactoryAddress,
                DppFactoryAddress,
                WETHAddress,
                DODOApproveProxyAddress,
                DODOSellHelperAddress
            );
            await deployer.deploy(
                DODOProxyV2
            );
            DODOV2ProxyAddress = DODOProxyV2.address;
            logger.log("DODOV2Proxy02 Address: ", DODOProxyV2.address);
            const DODOProxyV2Instance = await DODOProxyV2.at(DODOProxyV2.address);
            var tx = await DODOProxyV2Instance.initOwner(multiSigAddress);
            logger.log("Init DODOProxyV2 Tx:", tx.tx);
        }

        if (DODODspProxyAddress == "") {
            await deployer.deploy(
                DODODspProxy,
                DspFactoryAddress,
                WETHAddress,
                DODOApproveProxyAddress
            );
            DODODspProxyAddress = DODODspProxy.address;
            logger.log("DODODspProxy Address: ", DODODspProxy.address);
        }

        if (DODOCpProxyAddress == "") {
            await deployer.deploy(
                DODOCpProxy,
                WETHAddress,
                CpFactoryAddress,
                UpCpFactoryAddress,
                DODOApproveProxyAddress
            );
            DODOCpProxyAddress = DODOCpProxy.address;
            logger.log("CpProxy address: ", DODOCpProxy.address);
        }

        if (DODOMineV3ProxyAddress == "") {
            await deployer.deploy(
                DODOMineV3Proxy,
                CloneFactoryAddress,
                MineV3TemplateAddress,
                DODOApproveProxyAddress,
                DODOMineV3RegistryAddress
            );
            DODOMineV3ProxyAddress = DODOMineV3Proxy.address;
            logger.log("DODOMineV3ProxyAddress: ", DODOMineV3ProxyAddress);

            const dodoMineV3ProxyInstance = await DODOMineV3Proxy.at(DODOMineV3ProxyAddress);
            var tx = await dodoMineV3ProxyInstance.initOwner(multiSigAddress);
            logger.log("Init DODOMineV3Proxy Tx:", tx.tx);
        }

        if (DODORouteProxyAddress == "") {
            await deployer.deploy(
                DODORouteProxy,
                WETHAddress,
                DODOApproveProxyAddress
            );
            DODOApproveProxyAddress = DODORouteProxy.address;
            logger.log("DODORouteProxy Address: ", DODORouteProxy.address);
        }


        if (network == 'kovan' || network == 'rinkeby') {
            var tx;
            //ApproveProxy init以及添加ProxyList
            const DODOApproveProxyInstance = await DODOApproveProxy.at(DODOApproveProxyAddress);
            tx = await DODOApproveProxyInstance.init(multiSigAddress, [DODOV2ProxyAddress, DODODspProxyAddress, DODOCpProxyAddress, DODOMineV3ProxyAddress, DODORouteProxyAddress]);
            logger.log("DODOApproveProxy Init tx: ", tx.tx);

            //Approve init
            const DODOApproveInstance = await DODOApprove.at(DODOApproveAddress);
            tx = await DODOApproveInstance.init(multiSigAddress, DODOApproveProxy.address);
            logger.log("DODOApprove Init tx: ", tx.tx);

            //Set FeeRateDIP3
            const FeeRateModelInstance = await FeeRateModel.at(DefaultMtFeeRateAddress);
            tx = await FeeRateModelInstance.setProxy(FeeRateDIP3Address);
            logger.log("Set FeeRateDIP3 tx: ", tx.tx);

            //ERC20V2Factory 设置fee
            const ERC20V2FactoryInstance = await ERC20V2Factory.at(ERC20V2FactoryAddress);
            tx = await ERC20V2FactoryInstance.changeCreateFee("100000000000000000");
            logger.log("Set ERC20V2 fee tx: ", tx.tx);

            //DODOMineV2Factory 设置个人账户为owner
            const dodoMineV2FactoryInstance = await DODOMineV2Factory.at(DODOMineV2FactoryAddress);
            var tx = await dodoMineV2FactoryInstance.initOwner(multiSigAddress);
            logger.log("Init DODOMineV2Factory Tx:", tx.tx);

            //DODOMineV3Registry add Proxy as admin
            const dodoMineV3RegistryInstance = await DODOMineV3Registry.at(DODOMineV3RegistryAddress);
            var tx = await dodoMineV3RegistryInstance.addAdminList(DODOMineV3ProxyAddress);
            logger.log("DODOMineV3RegistryAddress Init tx: ", tx.tx);
        }

    }
};
