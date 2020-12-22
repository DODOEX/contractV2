const fs = require("fs");
const { deploySwitch } = require('../truffle-config.js')
const file = fs.createWriteStream("../deploy-detail-v2.0.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);

const CloneFactory = artifacts.require("CloneFactory");
const FeeRateModelTemplate = artifacts.require("FeeRateModel");
const ConstFeeRateModelTemplate = artifacts.require("ConstFeeRateModel");
const PermissionManagerTemplate = artifacts.require("PermissionManager");
const ExternalValueTemplate = artifacts.require("ExternalValue");

const DvmTemplate = artifacts.require("DVM");
const DvmAdminTemplate = artifacts.require("DVMAdmin");
const DppTemplate = artifacts.require("DPP");
const DppAdminTemplate = artifacts.require("DPPAdmin");
const CpTemplate = artifacts.require("CP");

const DvmFactory = artifacts.require("DVMFactory");
const UnownedDvmFactory = artifacts.require("UnownedDVMFactory");
const DppFactory = artifacts.require("DPPFactory");
const CpFactory = artifacts.require("CrowdPoolingFactory");

const DODOApprove = artifacts.require("DODOApprove");
const DODOProxyV2 = artifacts.require("DODOV2Proxy01");
const DODOSellHelper = artifacts.require("DODOSellHelper");
const DODOCalleeHelper = artifacts.require("DODOCalleeHelper");
const DODOV2RouteHelper = artifacts.require("DODOV2RouteHelper");



module.exports = async (deployer, network, accounts) => {
    //Helper And Common
    let DODOSellHelperAddress = "";
    let WETHAddress = "";
    let chiAddress = "";
    let DODOCalleeHelperAddress = "";
    //Template
    let CloneFactoryAddress = "";
    let FeeRateModelTemplateAddress = "";
    let ConstFeeRateModelTemplateAddress = "";
    let PermissionManagerTemplateAddress = "";
    let ExternalValueTemplateAddress = "";
    //Default Template
    let DefaultGasSourceAddress = "";
    let DefaultMtFeeRateAddress = "";
    let DefaultPermissionAddress = "";

    let DvmTemplateAddress = "";
    let DvmAdminTemplateAddress = "";
    let DppTemplateAddress = "";
    let DppAdminTemplateAddress = "";
    let CpTemplateAddress = "";
    //Facotry
    let DvmFactoryAddress = "";
    let UnownedDvmFactoryAddress = "";
    let DppFactoryAddress = "";
    let CpFactoryAddress = "";
    //Approve
    let DODOApproveAddress = "";
    //Account
    let multiSigAddress = "";
    let defaultMaintainer = "";

    if (network == "kovan") {
        //Helper
        DODOSellHelperAddress = "0xbdEae617F2616b45DCB69B287D52940a76035Fe3";
        WETHAddress = "0x5eca15b12d959dfcf9c71c59f8b467eb8c6efd0b";
        chiAddress = "0x0000000000004946c0e9f43f4dee607b0ef1fa1c";
        DODOCalleeHelperAddress = "0x507EBbb195CF54E0aF147A2b269C08a38EA36989";
        //Template
        CloneFactoryAddress = "0xf7959fe661124C49F96CF30Da33729201aEE1b27";
        FeeRateModelTemplateAddress = "0xEF3137780B387313c5889B999D03BdCf9aeEa892";
        ConstFeeRateModelTemplateAddress = "0x2ec9579Cf7ae77B4e538F56274501f518ABFeA2e";
        PermissionManagerTemplateAddress = "0x5D2Da09501d97a7bf0A8F192D2eb2F9Aa80d3241";
        ExternalValueTemplateAddress = "0xe0f813951dE2BB012f7Feb981669F9a7b5250A57";
        //Default Template
        DefaultGasSourceAddress = "0xE0c0df0e0be7ec4f579503304a6C186cA4365407";
        DefaultMtFeeRateAddress = "0xEfdE4225AC747136289979e29f1236527b2E4DB1";
        DefaultPermissionAddress = "0xACc7E23368261e1E02103c4e5ae672E7D01f5797";
        
        DvmTemplateAddress = "";
        DvmAdminTemplateAddress = "0x45f455d7E233403F10b7AFCB0d0d0c0d775AFf63";
        DppTemplateAddress = "";
        DppAdminTemplateAddress = "0xDfdd9e1693C3A6AF25307c9dA561021f9e685878";
        CpTemplateAddress = "0x59652F06fEdDe7780E8fa5C88CE850F67F26F0Fc";
        //Factory
        DvmFactoryAddress = "0x577481Bde7327e732f78e9f6AF44632CB8DDe80e";
        UnownedDvmFactoryAddress = "";
        DppFactoryAddress = "0xC510D9c58aa226c698F56b22b86A3031b8cBf551";
        CpFactoryAddress = "0x9F90AD19C15d7aF4291EB17b637DF78EaC639EA3";
        //Approve
        DODOApproveAddress = "";
        //Account
        multiSigAddress = accounts[0];
        defaultMaintainer = accounts[0];
    } else if (network == "live") {
        //Helper
        DODOSellHelperAddress = "0x533da777aedce766ceae696bf90f8541a4ba80eb";
        WETHAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
        chiAddress = "0x0000000000004946c0e9F43F4Dee607b0eF1fA1c";
        DODOCalleeHelperAddress = "";
        //Template
        CloneFactoryAddress = "";
        FeeRateModelTemplateAddress = "";
        ConstFeeRateModelTemplateAddress = "";
        PermissionManagerTemplateAddress = "";
        ExternalValueTemplateAddress = "";
        //Default Template
        DefaultGasSourceAddress = "";
        DefaultMtFeeRateAddress = "";
        DefaultPermissionAddress = "";

        DvmTemplateAddress = "";
        DvmAdminTemplateAddress = "";
        DppTemplateAddress = "";
        DppAdminTemplateAddress = "";
        CpTemplateAddress = "";
        //Factory
        DvmFactoryAddress = "";
        UnownedDvmFactoryAddress = "";
        DppFactoryAddress = "";
        CpFactoryAddress = "";
        //Proxy
        DODOApproveAddress = "";
        //Account
        multiSigAddress = "0x95C4F5b83aA70810D4f142d58e5F7242Bd891CB0";
        defaultMaintainer = "0x95C4F5b83aA70810D4f142d58e5F7242Bd891CB0";
    } else if (network == "bsclive") {
        //Helper
        DODOSellHelperAddress = "0x0F859706AeE7FcF61D5A8939E8CB9dBB6c1EDA33";
        WETHAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
        chiAddress = "0x0000000000000000000000000000000000000000";
        DODOCalleeHelperAddress = "";
        //Template
        CloneFactoryAddress = "";
        FeeRateModelTemplateAddress = "";
        ConstFeeRateModelTemplateAddress = "";
        PermissionManagerTemplateAddress = "";
        ExternalValueTemplateAddress = "";
        //Default Template
        DefaultGasSourceAddress = "";
        DefaultMtFeeRateAddress = "";
        DefaultPermissionAddress = "";

        DvmTemplateAddress = "";
        DvmAdminTemplateAddress = "";
        DppTemplateAddress = "";
        DppAdminTemplateAddress = "";
        CpTemplateAddress = "";
        //Factory
        DvmFactoryAddress = "";
        UnownedDvmFactoryAddress = "";
        DppFactoryAddress = "";
        CpFactoryAddress = "";
        //Proxy
        DODOApproveAddress = "";
        //Account
        multiSigAddress = "";
        defaultMaintainer = "";
    } else return;


    if(deploySwitch.HELPER_V2) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: HELPER V2"); 

        await deployer.deploy(DODOV2RouteHelper,DvmFactoryAddress,DppFactoryAddress);
        DODOV2RouteHelperAddress = DODOV2RouteHelper.address;
        logger.log("DODOV2RouteHelper Address: ", DODOV2RouteHelperAddress);
    }

    if (deploySwitch.DEPLOY_V2) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: V2");
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
        if (FeeRateModelTemplateAddress == "") {
            await deployer.deploy(FeeRateModelTemplate);
            FeeRateModelTemplateAddress = FeeRateModelTemplate.address;
            logger.log("FeeRateModelTemplateAddress: ", FeeRateModelTemplateAddress);
        }
        if (ConstFeeRateModelTemplateAddress == "") {
            await deployer.deploy(ConstFeeRateModelTemplate);
            ConstFeeRateModelTemplateAddress = ConstFeeRateModelTemplate.address;
            logger.log("ConstFeeRateModelTemplateAddress: ", ConstFeeRateModelTemplateAddress);
        }
        if (PermissionManagerTemplateAddress == "") {
            await deployer.deploy(PermissionManagerTemplate);
            PermissionManagerTemplateAddress = PermissionManagerTemplate.address;
            logger.log("PermissionManagerTemplateAddress: ", PermissionManagerTemplateAddress);
        }
        if (ExternalValueTemplateAddress == "") {
            await deployer.deploy(ExternalValueTemplate);
            ExternalValueTemplateAddress = ExternalValueTemplate.address;
            logger.log("ExternalValueTemplateAddress: ", ExternalValueTemplateAddress);
        }
        if (DefaultGasSourceAddress == "") {
            await deployer.deploy(ExternalValueTemplate);
            DefaultGasSourceAddress = ExternalValueTemplate.address;
            logger.log("DefaultGasSourceAddress: ", DefaultGasSourceAddress);
            const defaultGasSourceInstance = await ExternalValueTemplate.at(DefaultGasSourceAddress);
            var tx = await defaultGasSourceInstance.init(multiSigAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            logger.log("Init DefaultGasSource Tx:", tx.tx);
        }

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
        if (DvmAdminTemplateAddress == "") {
            await deployer.deploy(DvmAdminTemplate);
            DvmAdminTemplateAddress = DvmAdminTemplate.address;
            logger.log("DvmAdminTemplateAddress: ", DvmAdminTemplateAddress);
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

        //Factory
        if (DvmFactoryAddress == "") {
            await deployer.deploy(
                DvmFactory,
                CloneFactoryAddress,
                DvmTemplateAddress,
                DvmAdminTemplateAddress,
                FeeRateModelTemplateAddress,
                PermissionManagerTemplateAddress,
                DefaultGasSourceAddress
            );
            DvmFactoryAddress = DvmFactory.address;
            logger.log("DvmFactoryAddress: ", DvmFactoryAddress);
            const DvmFactoryInstance = await DvmFactory.at(DvmFactoryAddress);
            var tx = await DvmFactoryInstance.initOwner(multiSigAddress);
            logger.log("Init DvmFactory Tx:", tx.tx);
        }

        if (UnownedDvmFactoryAddress == "") {
            await deployer.deploy(
                UnownedDvmFactory,
                CloneFactoryAddress,
                DvmTemplateAddress,
                FeeRateModelTemplateAddress,
                defaultMaintainer,
                DefaultMtFeeRateAddress,
                DefaultPermissionAddress,
                DefaultGasSourceAddress
            );
            UnownedDvmFactoryAddress = UnownedDvmFactory.address;
            logger.log("UnownedDvmFactoryAddress: ", UnownedDvmFactoryAddress);
        }

        if (DppFactoryAddress == "") {
            await deployer.deploy(
                DppFactory,
                CloneFactoryAddress,
                DppTemplateAddress,
                DppAdminTemplateAddress,
                FeeRateModelTemplateAddress,
                PermissionManagerTemplateAddress,
                ExternalValueTemplateAddress,
                DefaultGasSourceAddress,
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
                UnownedDvmFactoryAddress,
                FeeRateModelTemplateAddress,
                defaultMaintainer,
                DefaultMtFeeRateAddress,
                DefaultPermissionAddress,
                DefaultGasSourceAddress
            );
            CpFactoryAddress = CpFactory.address;
            logger.log("CpFactoryAddress: ", CpFactoryAddress);
        }

        //Proxy 
        await deployer.deploy(
            DODOProxyV2,
            DvmFactoryAddress,
            DppFactoryAddress,
            CpFactoryAddress,
            WETHAddress,
            DODOApproveAddress,
            DODOSellHelperAddress
        );
        logger.log("DODOProxyV2 Address: ", DODOProxyV2.address);
        const DODOProxyV2Instance = await DODOProxyV2.at(DODOProxyV2.address);
        var tx = await DODOProxyV2Instance.initOwner(multiSigAddress);
        logger.log("Init DODOProxyV2 Tx:", tx.tx);

        
        const DODOApproveInstance = await DODOApprove.at(DODOApproveAddress);
        var tx = await DODOApproveInstance.init(multiSigAddress,DODOProxyV2.address);
        logger.log("DODOApprove Init tx: ", tx.tx);
    }
};
