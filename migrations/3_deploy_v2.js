const fs = require("fs");
const Web3 = require('web3');
const { deploySwitch } = require('../truffle-config.js')
const file = fs.createWriteStream("../deploy-detail-v2.0.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);

const CloneFactory = artifacts.require("CloneFactory");
const FeeRateModelTemplate = artifacts.require("FeeRateModel");
const ConstFeeRateModelTemplate = artifacts.require("ConstFeeRateModel");
const PermissionManagerTemplate = artifacts.require("PermissionManager");
const ExternalValueTemplate = artifacts.require("ExternalValue");

const ERC20Template = artifacts.require("InitializableERC20");
const DvmTemplate = artifacts.require("DVM");
const DppTemplate = artifacts.require("DPP");
const DppAdminTemplate = artifacts.require("DPPAdmin");
const CpTemplate = artifacts.require("CP");

const DvmFactory = artifacts.require("DVMFactory");
const DppFactory = artifacts.require("DPPFactory");
const CpFactory = artifacts.require("CrowdPoolingFactory");

const DODOApprove = artifacts.require("DODOApprove");
const DODOProxyV2 = artifacts.require("DODOV2Proxy01");
const DODOIncentive = artifacts.require("DODOIncentive");
const DODOSellHelper = artifacts.require("DODOSellHelper");
const DODOCalleeHelper = artifacts.require("DODOCalleeHelper");
const DODOV2RouteHelper = artifacts.require("DODOV2RouteHelper");


module.exports = async (deployer, network, accounts) => {
    //Helper And Common
    let DODOSellHelperAddress = "";
    let WETHAddress = "";
    let chiAddress = "";
    let DODOCalleeHelperAddress = "";
    let DODORouteV2HelperAddress = "";
    //Template
    let CloneFactoryAddress = "";
    // let FeeRateModelTemplateAddress = "";
    // let ConstFeeRateModelTemplateAddress = "";
    // let PermissionManagerTemplateAddress = "";
    // let ExternalValueTemplateAddress = "";
    //Default Template
    // let DefaultGasSourceAddress = "";
    let DefaultMtFeeRateAddress = "";
    let DefaultPermissionAddress = "";

    let DvmTemplateAddress = "";
    let DppTemplateAddress = "";
    let DppAdminTemplateAddress = "";
    let CpTemplateAddress = "";
    //Facotry
    let DvmFactoryAddress = "";
    let DppFactoryAddress = "";
    let CpFactoryAddress = "";
    //Approve
    let DODOApproveAddress = "";
    //Incentive
    let DODOIncentiveAddress = "";
    let DODOTokenAddress = "";
    //Account
    let multiSigAddress = "";
    let defaultMaintainer = "";

    if (network == "kovan") {
        //Helper
        DODOSellHelperAddress = "0xbdEae617F2616b45DCB69B287D52940a76035Fe3";
        WETHAddress = "0x5eca15b12d959dfcf9c71c59f8b467eb8c6efd0b";
        chiAddress = "0x0000000000004946c0e9f43f4dee607b0ef1fa1c";
        DODOCalleeHelperAddress = "0x507EBbb195CF54E0aF147A2b269C08a38EA36989";
        DODORouteV2HelperAddress = "";
        //Template
        CloneFactoryAddress = "0xf7959fe661124C49F96CF30Da33729201aEE1b27";
        // FeeRateModelTemplateAddress = "0xEF3137780B387313c5889B999D03BdCf9aeEa892";
        // ConstFeeRateModelTemplateAddress = "0x2ec9579Cf7ae77B4e538F56274501f518ABFeA2e";
        // PermissionManagerTemplateAddress = "0x5D2Da09501d97a7bf0A8F192D2eb2F9Aa80d3241";
        // ExternalValueTemplateAddress = "0xe0f813951dE2BB012f7Feb981669F9a7b5250A57";
        //Default Template
        // DefaultGasSourceAddress = "0xE0c0df0e0be7ec4f579503304a6C186cA4365407";
        DefaultMtFeeRateAddress = "0xEfdE4225AC747136289979e29f1236527b2E4DB1";
        DefaultPermissionAddress = "0xACc7E23368261e1E02103c4e5ae672E7D01f5797";

        DvmTemplateAddress = "";
        DppTemplateAddress = "";
        DppAdminTemplateAddress = "0xe39E02c4f269c4E235Ca8979a125608644c8924a";
        CpTemplateAddress = "";
        //Factory
        DvmFactoryAddress = "";
        DppFactoryAddress = "";
        CpFactoryAddress = "";
        //Approve
        DODOApproveAddress = "";
        DODOIncentiveAddress = "";
        DODOTokenAddress = "0xfF2985D13953Cb92ecc585aA2B6A4AF8cB46068f";
        //Account
        multiSigAddress = accounts[0];
        defaultMaintainer = accounts[0];
    } else if (network == "live") {
        //Helper
        DODOSellHelperAddress = "0x533da777aedce766ceae696bf90f8541a4ba80eb";
        WETHAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
        chiAddress = "0x0000000000004946c0e9F43F4Dee607b0eF1fA1c";
        DODOCalleeHelperAddress = "";
        DODORouteV2HelperAddress = "";
        //Template
        CloneFactoryAddress = "";
        // FeeRateModelTemplateAddress = "";
        // ConstFeeRateModelTemplateAddress = "";
        // PermissionManagerTemplateAddress = "";
        // ExternalValueTemplateAddress = "";
        //Default Template
        // DefaultGasSourceAddress = "";
        DefaultMtFeeRateAddress = "";
        DefaultPermissionAddress = "";

        DvmTemplateAddress = "";
        DppTemplateAddress = "";
        DppAdminTemplateAddress = "";
        CpTemplateAddress = "";
        //Factory
        DvmFactoryAddress = "";
        DppFactoryAddress = "";
        CpFactoryAddress = "";
        //Proxy
        DODOApproveAddress = "";
        DODOIncentiveAddress = "";
        DODOTokenAddress = "0x43Dfc4159D86F3A37A5A4B3D4580b888ad7d4DDd";
        //Account
        multiSigAddress = "0x95C4F5b83aA70810D4f142d58e5F7242Bd891CB0";
        defaultMaintainer = "0x95C4F5b83aA70810D4f142d58e5F7242Bd891CB0";
    } else if (network == "bsclive") {
        //Helper
        DODOSellHelperAddress = "0x0F859706AeE7FcF61D5A8939E8CB9dBB6c1EDA33";
        WETHAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
        chiAddress = "0x0000000000000000000000000000000000000000";
        DODOCalleeHelperAddress = "";
        DODORouteV2HelperAddress = "";
        //Template
        CloneFactoryAddress = "";
        // FeeRateModelTemplateAddress = "";
        // ConstFeeRateModelTemplateAddress = "";
        // PermissionManagerTemplateAddress = "";
        // ExternalValueTemplateAddress = "";
        //Default Template
        // DefaultGasSourceAddress = "";
        DefaultMtFeeRateAddress = "";
        DefaultPermissionAddress = "";

        DvmTemplateAddress = "";
        DppTemplateAddress = "";
        DppAdminTemplateAddress = "";
        CpTemplateAddress = "";
        //Factory
        DvmFactoryAddress = "";
        DppFactoryAddress = "";
        CpFactoryAddress = "";
        //Proxy
        DODOApproveAddress = "";
        DODOIncentiveAddress = "";
        DODOTokenAddress = "";
        //Account
        multiSigAddress = "0x4073f2b9bB95774531b9e23d206a308c614A943a";
        defaultMaintainer = "0x4073f2b9bB95774531b9e23d206a308c614A943a";
    } else return;

    if (deploySwitch.ROUTER_HELPER) {
        await deployer.deploy(DODOV2RouteHelper, "0x369279f8e1cc936f7f9513559897B183d4B2F0Bd", "0x6D4a70354cd03ae3A8461eDE9A4dAd445a169a6B");
        DODOV2RouteHelperAddress = DODOV2RouteHelper.address;
        logger.log("DODOV2RouteHelper Address: ", DODOV2RouteHelperAddress);
    }

    if (deploySwitch.DEPLOY_V2) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: V2");
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

        //Template
        if (CloneFactoryAddress == "") {
            await deployer.deploy(CloneFactory);
            CloneFactoryAddress = CloneFactory.address;
            logger.log("CloneFactoryAddress: ", CloneFactoryAddress);

        }

        // if (FeeRateModelTemplateAddress == "") {
        //     await deployer.deploy(FeeRateModelTemplate);
        //     FeeRateModelTemplateAddress = FeeRateModelTemplate.address;
        //     logger.log("FeeRateModelTemplateAddress: ", FeeRateModelTemplateAddress);
        // }
        // if (ConstFeeRateModelTemplateAddress == "") {
        //     await deployer.deploy(ConstFeeRateModelTemplate);
        //     ConstFeeRateModelTemplateAddress = ConstFeeRateModelTemplate.address;
        //     logger.log("ConstFeeRateModelTemplateAddress: ", ConstFeeRateModelTemplateAddress);
        // }
        // if (PermissionManagerTemplateAddress == "") {
        //     await deployer.deploy(PermissionManagerTemplate);
        //     PermissionManagerTemplateAddress = PermissionManagerTemplate.address;
        //     logger.log("PermissionManagerTemplateAddress: ", PermissionManagerTemplateAddress);
        // }
        // if (ExternalValueTemplateAddress == "") {
        //     await deployer.deploy(ExternalValueTemplate);
        //     ExternalValueTemplateAddress = ExternalValueTemplate.address;
        //     logger.log("ExternalValueTemplateAddress: ", ExternalValueTemplateAddress);
        // }
        // if (DefaultGasSourceAddress == "") {
        //     await deployer.deploy(ExternalValueTemplate);
        //     DefaultGasSourceAddress = ExternalValueTemplate.address;
        //     logger.log("DefaultGasSourceAddress: ", DefaultGasSourceAddress);
        //     const defaultGasSourceInstance = await ExternalValueTemplate.at(DefaultGasSourceAddress);
        //     var tx = await defaultGasSourceInstance.init(multiSigAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
        //     logger.log("Init DefaultGasSource Tx:", tx.tx);
        // }

        if (DefaultMtFeeRateAddress == "") {
            await deployer.deploy(ConstFeeRateModelTemplate);
            DefaultMtFeeRateAddress = ConstFeeRateModelTemplate.address;
            logger.log("DefaultMtFeeRateAddress: ", DefaultMtFeeRateAddress);
            const defaultMtFeeRateInstance = await ConstFeeRateModelTemplate.at(DefaultMtFeeRateAddress);
            var tx = await defaultMtFeeRateInstance.init(multiSigAddress, 0);
            logger.log("Init DefaultMtFeeRate Tx:", tx.tx);
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

        //Approve
        if (DODOApproveAddress == "") {
            await deployer.deploy(DODOApprove);
            DODOApproveAddress = DODOApprove.address;
            logger.log("DODOApprove Address: ", DODOApproveAddress);
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
                DODOApproveAddress
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
            DODOApproveAddress,
            DODOSellHelperAddress,
            chiAddress,
            DODOIncentiveAddress
        );
        logger.log("DODOProxyV2 Address: ", DODOProxyV2.address);
        const DODOProxyV2Instance = await DODOProxyV2.at(DODOProxyV2.address);
        var tx = await DODOProxyV2Instance.initOwner(multiSigAddress);
        logger.log("Init DODOProxyV2 Tx:", tx.tx);


        const DODOApproveInstance = await DODOApprove.at(DODOApproveAddress);
        var tx = await DODOApproveInstance.init(multiSigAddress, DODOProxyV2.address);
        logger.log("DODOApprove Init tx: ", tx.tx);


        if (network == 'kovan') {
            //1. Proxy whiteList

            //2. ChangeDODO Incentive proxy
            const DODOIncentiveInstance = await DODOIncentive.at(DODOIncentiveAddress);
            var tx = await DODOIncentiveInstance.changeDODOProxy(DODOProxyV2.address);
            logger.log("DODOIncentive ChangeProxy tx: ", tx.tx);

            //3. Open trade incentive 
            var tx = await DODOIncentiveInstance.changePerReward(10);
            logger.log("DODOIncentive OpenSwitch tx: ", tx.tx);

            //4. Transfer DODO to Trade Incentive
        }

    }
};
