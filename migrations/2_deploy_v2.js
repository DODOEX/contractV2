const fs = require("fs");
const { deploySwitch } = require('../truffle-config.js')
const file = fs.createWriteStream("../deploy-detail-v2.0.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);
const { GetConfig } = require("../configAdapter.js")

const CloneFactory = artifacts.require("CloneFactory");
const FeeRateModelTemplate = artifacts.require("FeeRateModel");
const PermissionManagerTemplate = artifacts.require("PermissionManager");

const DvmTemplate = artifacts.require("DVM");
const DppTemplate = artifacts.require("DPP");
const DppAdminTemplate = artifacts.require("DPPAdmin");
const CpTemplate = artifacts.require("CP");

const ERC20Template = artifacts.require("InitializableERC20");
const MintableERC20Template = artifacts.require("InitializableMintableERC20");
const ERC20Factory = artifacts.require("ERC20Factory");

const DvmFactory = artifacts.require("DVMFactory");
const DppFactory = artifacts.require("DPPFactory");
const CpFactory = artifacts.require("CrowdPoolingFactory");

const DODOApprove = artifacts.require("DODOApprove");
const DODOApproveProxy = artifacts.require("DODOApproveProxy");
const DODOProxyV2 = artifacts.require("DODOV2Proxy02");
const DODOIncentive = artifacts.require("DODOIncentive");
const DODOSellHelper = artifacts.require("DODOSellHelper");
const DODOCalleeHelper = artifacts.require("DODOCalleeHelper");
const DODOV2RouteHelper = artifacts.require("DODOV2RouteHelper");
const DODOV1PmmHelper = artifacts.require("DODOV1PmmHelper");

const DODOV1Adapter = artifacts.require("DODOV1Adapter");
const DODOV2Adapter = artifacts.require("DODOV2Adapter");
const UniAdapter = artifacts.require("UniAdapter");


module.exports = async (deployer, network, accounts) => {
    let CONFIG = GetConfig(network, accounts)
    if (CONFIG == null) return;
    //TOKEN
    let WETHAddress = CONFIG.WETH;
    let chiAddress = CONFIG.CHI;
    let DODOTokenAddress = CONFIG.DODO;

    //Helper
    let DODOSellHelperAddress = CONFIG.DODOSellHelper;
    let DODOCalleeHelperAddress = CONFIG.DODOCalleeHelper;
    let DODORouteV2HelperAddress = CONFIG.DODOV2RouteHelper;
    let DODOV1PmmHelperAddress = CONFIG.DODOV1PmmHelper;

    //Template
    let CloneFactoryAddress = CONFIG.CloneFactory;
    let DefaultMtFeeRateAddress = CONFIG.FeeRateModel;
    let DefaultPermissionAddress = CONFIG.PermissionManager;
    let DvmTemplateAddress = CONFIG.DVM;
    let DppTemplateAddress = CONFIG.DPP;
    let DppAdminTemplateAddress = CONFIG.DPPAdmin;
    let CpTemplateAddress = CONFIG.CP;
    let ERC20TemplateAddress = CONFIG.ERC20;
    let MintableERC20TemplateAddress = CONFIG.MintableERC20;

    //Facotry
    let DvmFactoryAddress = CONFIG.DVMFactory;
    let DppFactoryAddress = CONFIG.DPPFactory;
    let CpFactoryAddress = CONFIG.CrowdPoolingFactory;
    let ERC20FactoryAddress = CONFIG.ERC20Factory;

    //Approve
    let DODOApproveAddress = CONFIG.DODOApprove;
    let DODOApproveProxyAddress = CONFIG.DODOApproveProxy;

    //Periphery
    let DODOIncentiveAddress = CONFIG.DODOIncentive;

    //Account
    let multiSigAddress = CONFIG.multiSigAddress;
    let defaultMaintainer = CONFIG.defaultMaintainer;


    if (deploySwitch.ADAPTER) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: V2 - Adapter");

        await deployer.deploy(DODOV1Adapter, DODOSellHelperAddress)
        logger.log("DODOV1Adapter Address: ", DODOV1Adapter.address);
        await deployer.deploy(DODOV2Adapter)
        logger.log("DODOV2Adapter Address: ", DODOV2Adapter.address);
        await deployer.deploy(UniAdapter)
        logger.log("UniAdapter Address: ", UniAdapter.address);
    }

    if (deploySwitch.DEPLOY_V2) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: V2");
        logger.log("multiSigAddress: ", multiSigAddress)

        if (DODOTokenAddress == "") return;
        //Helper
        if (DODOSellHelperAddress == "") {
            await deployer.deploy(DODOSellHelper);
            DODOSellHelperAddress = DODOSellHelper.address;
            logger.log("DODOSellHelper Address: ", DODOSellHelperAddress);
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
        if (MintableERC20TemplateAddress == "") {
            await deployer.deploy(MintableERC20Template);
            MintableERC20TemplateAddress = MintableERC20Template.address;
            logger.log("MintableERC20TemplateAddress: ", MintableERC20TemplateAddress);
        }

        if (ERC20FactoryAddress == "") {
            await deployer.deploy(
                ERC20Factory,
                CloneFactoryAddress,
                ERC20TemplateAddress,
                MintableERC20TemplateAddress
            );
            ERC20FactoryAddress = ERC20Factory.address;
            logger.log("ERC20FactoryAddress: ", ERC20FactoryAddress);
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

        //Incentive
        if (DODOIncentiveAddress == "") {
            await deployer.deploy(DODOIncentive, DODOTokenAddress);
            DODOIncentiveAddress = DODOIncentive.address;
            logger.log("DODOIncentiveAddress: ", DODOIncentiveAddress);
            const DODOIncentiveInstance = await DODOIncentive.at(DODOIncentiveAddress);
            var tx = await DODOIncentiveInstance.initOwner(multiSigAddress);
            logger.log("DODOIncentive Init tx: ", tx.tx);
        }

        //Factory
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

        if (DODORouteV2HelperAddress == "") {
            await deployer.deploy(DODOV2RouteHelper, DvmFactoryAddress, DppFactoryAddress);
            DODOV2RouteHelperAddress = DODOV2RouteHelper.address;
            logger.log("DODOV2RouteHelper Address: ", DODOV2RouteHelperAddress);
        }

        //Proxy 
        await deployer.deploy(
            DODOProxyV2,
            DvmFactoryAddress,
            DppFactoryAddress,
            CpFactoryAddress,
            WETHAddress,
            DODOApproveProxyAddress,
            DODOSellHelperAddress,
            chiAddress,
            DODOIncentiveAddress
        );
        logger.log("DODOV2Proxy02 Address: ", DODOProxyV2.address);
        const DODOProxyV2Instance = await DODOProxyV2.at(DODOProxyV2.address);
        var tx = await DODOProxyV2Instance.initOwner(multiSigAddress);
        logger.log("Init DODOProxyV2 Tx:", tx.tx);


        if (network == 'kovan' || network == 'mbtestnet') {

            const DODOApproveProxyInstance = await DODOApproveProxy.at(DODOApproveProxyAddress);
            var tx = await DODOApproveProxyInstance.init(multiSigAddress, [DODOProxyV2.address]);
            logger.log("DODOApproveProxy Init tx: ", tx.tx);


            const DODOApproveInstance = await DODOApprove.at(DODOApproveAddress);
            var tx = await DODOApproveInstance.init(multiSigAddress, DODOApproveProxy.address);
            logger.log("DODOApprove Init tx: ", tx.tx);


            //2. ChangeDODO Incentive proxy
            const DODOIncentiveInstance = await DODOIncentive.at(DODOIncentiveAddress);
            var tx = await DODOIncentiveInstance.changeDODOProxy(DODOProxyV2.address);
            logger.log("DODOIncentive ChangeProxy tx: ", tx.tx);

            //3. Open trade incentive 
            // var tx = await DODOIncentiveInstance.changePerReward("10000000000000000000");
            // logger.log("DODOIncentive OpenSwitch tx: ", tx.tx);

            //4. Transfer DODO to Trade Incentive
        }

    }
};
