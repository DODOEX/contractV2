const fs = require("fs");
const file = fs.createWriteStream("../deploy-detail-v2.0.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);

const CloneFactory = artifacts.require("CloneFactory");
const DvmTemplate = artifacts.require("DVM");
const DvmAdminTemplate = artifacts.require("DVMAdmin");
const DppTemplate = artifacts.require("DPP");
const DppAdminTemplate = artifacts.require("DPPAdmin");
const FeeRateModelTemplate = artifacts.require("FeeRateModel");
const PermissionManagerTemplate = artifacts.require("PermissionManager");
const ExternalValueTemplate = artifacts.require("ExternalValue");

const DvmFactory = artifacts.require("DVMFactory");
const DppFactory = artifacts.require("DPPFactory");

const DODOApprove = artifacts.require("DODOApprove");
const DODOProxyV2 = artifacts.require("DODOV2Proxy01");
const DODOSellHelper = artifacts.require("DODOSellHelper");
const DODOCalleeHelper = artifacts.require("DODOCalleeHelper");

const DEPLOY_V2 = false;

module.exports = async (deployer, network, accounts) => {
    let DODOSellHelperAddress = "";
    let DODOCalleeHelperAddress = "";
    let WETHAddress = "";
    let DODOApproveAddress = "";
    let chiAddress = "";
    let CloneFactoryAddress = "";
    let FeeRateModelTemplateAddress = "";
    let PermissionManagerTemplateAddress = "";
    let ExternalValueTemplateAddress = "";
    let DefaultGasSourceAddress = "";
    let DvmTemplateAddress = "";
    let DvmAdminTemplateAddress = "";
    let DppTemplateAddress = "";
    let DppAdminTemplateAddress = "";
    let DvmFactoryAddress = "";
    let DppFactoryAddress = "";

    if (network == "kovan") {
        DODOSellHelperAddress = "0xbdEae617F2616b45DCB69B287D52940a76035Fe3";
        WETHAddress = "0x5eca15b12d959dfcf9c71c59f8b467eb8c6efd0b";
        chiAddress = "0x0000000000004946c0e9f43f4dee607b0ef1fa1c";
        DODOApproveAddress = "0x0C4a80B2e234448E5f6fD86e7eFA733d985004c8";
        DODOCalleeHelperAddress = "0x507EBbb195CF54E0aF147A2b269C08a38EA36989";
        //Template
        CloneFactoryAddress = "0xf7959fe661124C49F96CF30Da33729201aEE1b27";
        FeeRateModelTemplateAddress = "0xEF3137780B387313c5889B999D03BdCf9aeEa892";
        PermissionManagerTemplateAddress = "0x5D2Da09501d97a7bf0A8F192D2eb2F9Aa80d3241";
        ExternalValueTemplateAddress = "0xe0f813951dE2BB012f7Feb981669F9a7b5250A57";
        DefaultGasSourceAddress = "0xE0c0df0e0be7ec4f579503304a6C186cA4365407";
        DvmTemplateAddress = "0x460Ada67279Ff2ce8c87cb88F99070c6520Aa624";
        DvmAdminTemplateAddress = "0xbB9F79f6ac9e577B658E3B2E1340838d8965986B";
        DppTemplateAddress = "0x577c2cE26B8b5C8b3f7c57826Bf351ac7c21a441";
        DppAdminTemplateAddress = "0x402ace5a3e6Aa71FB942d309341F8867afcde302";
        //Factory
        DvmFactoryAddress = "0xaeF2cce5678e6e29f7a7C2A6f5d2Ce26df600dc1";
        DppFactoryAddress = "0x5935a606383Ba43C61FcE5E632357744a95e9dC3";
    } else if (network == "live") {
        DODOSellHelperAddress = "0x533da777aedce766ceae696bf90f8541a4ba80eb";
        WETHAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
        chiAddress = "0x0000000000004946c0e9F43F4Dee607b0eF1fA1c";
        DODOApproveAddress = "0x4eC851895d85bfa6835241b3157ae10FfFD3BebC";
        //Tempalte
    } else if (network == "bsclive") {
        DODOSellHelperAddress = "0x0F859706AeE7FcF61D5A8939E8CB9dBB6c1EDA33";
        WETHAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
        chiAddress = "0x0000000000000000000000000000000000000000";
        DODOApproveAddress = "0x19DA73be23Cea6bFA804Ec020041b8F3971BC522";
        //Template
    } else return;


    if (DEPLOY_V2) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: V2");
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
            var tx = await defaultGasSourceInstance.init(accounts[0], "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            logger.log("Set default Gas Tx:", tx.tx);
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
        if (DODOApproveAddress == "") {
            await deployer.deploy(DODOApprove);
            DODOApproveAddress = DODOApprove.address;
            logger.log("DODOApprove Address: ", DODOApproveAddress);
        }
        if (DODOSellHelperAddress == "") {
            await deployer.deploy(DODOSellHelper);
            DODOSellHelperAddress = DODOSellHelper.address;
            logger.log("DODOSellHelper Address: ", DODOSellHelperAddress);
        }
        if (DODOCalleeHelperAddress == "") {
            await deployer.deploy(DODOCalleeHelper,WETHAddress);
            DODOCalleeHelperAddress = DODOCalleeHelper.address;
            logger.log("DODOCalleeHelperAddress: ", DODOCalleeHelperAddress);
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
        }
        
        //Proxy 
        await deployer.deploy(
            DODOProxyV2,
            DvmFactoryAddress,
            DppFactoryAddress,
            WETHAddress,
            DODOApproveAddress,
            DODOSellHelperAddress
        );
        logger.log("DODOProxyV2 Address: ", DODOProxyV2.address);

        const DODOApproveInstance = await DODOApprove.at(DODOApproveAddress);
        var tx = await DODOApproveInstance.setDODOProxy(DODOProxyV2.address);
        logger.log("DODOApprovce setProxy tx: ", tx.tx);
    }
};
