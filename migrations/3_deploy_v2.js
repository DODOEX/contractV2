const fs = require("fs");
const { deploySwitch } = require('../truffle-config.js')
const file = fs.createWriteStream("../deploy-detail-v2.0.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);

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
    //Helper And Common
    let DODOSellHelperAddress = "";
    let WETHAddress = "";
    let chiAddress = "";
    let DODOCalleeHelperAddress = "";
    let DODORouteV2HelperAddress = "";
    let DODOV1PmmHelperAddress = "";
    //Template
    let CloneFactoryAddress = "";
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
    let DODOApproveProxyAddress = "";
    //Incentive
    let DODOIncentiveAddress = "";
    let DODOTokenAddress = "";
    //Account
    let multiSigAddress = "";
    let defaultMaintainer = "";

    //ERC20
    let ERC20TemplateAddress = "";
    let MintableERC20TemplateAddress = "";
    let ERC20FactoryAddress = "";

    if (network == "kovan") {
        //Helper
        DODOSellHelperAddress = "0xbdEae617F2616b45DCB69B287D52940a76035Fe3";
        WETHAddress = "0x5eca15b12d959dfcf9c71c59f8b467eb8c6efd0b";
        chiAddress = "0x0000000000004946c0e9f43f4dee607b0ef1fa1c";
        DODOCalleeHelperAddress = "0x36ce1831941d35c3588759B2D084E240a094ad4A";
        DODOV1PmmHelperAddress = "0xC972069473a686b1c11Bd9347D719c87e6745d39";
        DODORouteV2HelperAddress = "0xcB3b6cdBe2e57D3e37feba0C55584992Cc1B973F";

        //Template
        CloneFactoryAddress = "0xf7959fe661124C49F96CF30Da33729201aEE1b27";
        DefaultMtFeeRateAddress = "0x57e5b46e400c0C31cA174C8E199fB5fE650DB18a";
        DefaultPermissionAddress = "0x82C87c5EB912762676E7a87Aad67D916317c7D0e";

        DvmTemplateAddress = "0x268EA583bc954678DeD93D4832F147604142aDaD";
        DppTemplateAddress = "0xEAdc4943329Cb8139Ee3c8575f6a9B3659cd0591";
        DppAdminTemplateAddress = "0xf63e41A459D9AEcaE4bAE1278ef0ae84F7F2DE56";
        CpTemplateAddress = "0x973bEbaE41E79c2B4d9EaEE14c2aB85f43673dc3";
        //Factory
        DvmFactoryAddress = "0x322F8014C125Da09314d3a68d4d9F427823F17FD";
        DppFactoryAddress = "0xC65F8087288aa0a118aa6F3228Ef9ecc8187F4b6";
        CpFactoryAddress = "0x9e6E8985D52E91eDf1671f28Ca73bc4F3E219b72";
        //Approve
        DODOApproveAddress = "0xa375b128e139ae54EF7F189BC8fEb4624f1c2Afa";
        DODOApproveProxyAddress = "0xE2bf3e72E126f0AD4Aec07AdfA6cc345EEF43bDe";
        DODOIncentiveAddress = "0x5cFCc14f7C8be8B138D9fDF7438391b0BFe0589F";
        DODOTokenAddress = "0x854b0f89BAa9101e49Bfb357A38071C9db5d0DFa";
        //Account
        multiSigAddress = accounts[0];
        defaultMaintainer = accounts[0];
    } else if (network == "live") {
        //Helper
        DODOSellHelperAddress = "0x533da777aedce766ceae696bf90f8541a4ba80eb";
        WETHAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
        chiAddress = "0x0000000000004946c0e9F43F4Dee607b0eF1fA1c";
        DODOCalleeHelperAddress = "0xef49a6DBa1C8DF859E49c17E9A485B439c7689d3";
        DODORouteV2HelperAddress = "";
        DODOV1PmmHelperAddress = "0x6373ceB657C83C91088d328622573FB766064Ac4";
        //Template
        CloneFactoryAddress = "0x5e5a7b76462e4bdf83aa98795644281bdba80b88";
        DefaultMtFeeRateAddress = "0x5e84190a270333aCe5B9202a3F4ceBf11b81bB01";
        DefaultPermissionAddress = "0x6B208E08dcF6BD51F50C5Da09d15B2D8E5C46Cf2";

        DvmTemplateAddress = "0x2BBD66fC4898242BDBD2583BBe1d76E8b8f71445";
        DppTemplateAddress = "0xB76de21f04F677f07D9881174a1D8E624276314C";
        DppAdminTemplateAddress = "";
        CpTemplateAddress = "0x18b0bD918b55f995Fd404B872404378A62cb403b";
        //Factory
        DvmFactoryAddress = "0x72d220cE168C4f361dD4deE5D826a01AD8598f6C";
        DppFactoryAddress = "";
        CpFactoryAddress = "0xE8C9A78725D0451FA19878D5f8A3dC0D55FECF25";
        //Proxy
        DODOApproveAddress = "0xCB859eA579b28e02B87A1FDE08d087ab9dbE5149";
        DODOApproveProxyAddress = "";
        DODOIncentiveAddress = "0x989DcAA95801C527C5B73AA65d3962dF9aCe1b0C";
        DODOTokenAddress = "0x43Dfc4159D86F3A37A5A4B3D4580b888ad7d4DDd";
        //Account
        multiSigAddress = "0x95C4F5b83aA70810D4f142d58e5F7242Bd891CB0";
        defaultMaintainer = "0x95C4F5b83aA70810D4f142d58e5F7242Bd891CB0";
    } else if (network == "bsclive") {
        //Helper
        DODOSellHelperAddress = "0x0F859706AeE7FcF61D5A8939E8CB9dBB6c1EDA33";
        WETHAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
        chiAddress = "0x0000000000000000000000000000000000000000";
        DODOCalleeHelperAddress = "0xaaffAd1017D6a13E026A00121BF258C616B25f7C";
        DODORouteV2HelperAddress = "0x1dc8D1f1600B7C1D39e6b60FBC7b021Bc4F9C993";
        DODOV1PmmHelperAddress = "0x2BBD66fC4898242BDBD2583BBe1d76E8b8f71445";
        //Template
        CloneFactoryAddress = "0x03E2427859119E497EB856a166F616a2Ce5f8c88";
        DefaultMtFeeRateAddress = "0x18DFdE99F578A0735410797e949E8D3e2AFCB9D2";
        DefaultPermissionAddress = "0x729f7f44bf64Ce814716b6261e267DbE6cdf021c";

        DvmTemplateAddress = "0xC3BeD579CaB3EC29B22D9AB99F4E586af42496b9";
        DppTemplateAddress = "0x85351262f7474Ebe23FfAcD633cf20A491F1325D";
        DppAdminTemplateAddress = "0x44D5dF24d5Ef52A791D6436Fa45A8D426f6de34e";
        CpTemplateAddress = "0x041ABa00c57Dd47abC37A2931dF569a2A2cc57Be";
        //Factory
        DvmFactoryAddress = "0x790B4A80Fb1094589A3c0eFC8740aA9b0C1733fB";
        DppFactoryAddress = "0xAfe0A75DFFb395eaaBd0a7E1BBbd0b11f8609eeF";
        CpFactoryAddress = "0x778DF5B12170e8af8dF94356BfC864E57CE185DC";
        //Proxy
        DODOApproveAddress = "0xa128Ba44B2738A558A1fdC06d6303d52D3Cef8c1";
        DODOApproveProxyAddress = "0xB76de21f04F677f07D9881174a1D8E624276314C";
        DODOIncentiveAddress = "0x4EE6398898F7FC3e648b3f6bA458310ac29cD352";
        DODOTokenAddress = "0x67ee3Cb086F8a16f34beE3ca72FAD36F7Db929e2";
        //Account
        multiSigAddress = "0xcaa42F09AF66A8BAE3A7445a7f63DAD97c11638b";
        defaultMaintainer = "0xcaa42F09AF66A8BAE3A7445a7f63DAD97c11638b";
    } else return;

    logger.log("====================================================");
    logger.log("network type: " + network);
    logger.log("Deploy time: " + new Date().toLocaleString());

    if (deploySwitch.CALLEE) {
        await deployer.deploy(DODOCalleeHelper, WETHAddress);
        DODOCalleeHelperAddress = DODOCalleeHelper.address;
        logger.log("DODOCalleeHelperAddress: ", DODOCalleeHelperAddress);
    }

    if (deploySwitch.ADAPTER) {
        logger.log("Deploy type: V2 - Adapter");
        await deployer.deploy(DODOV1Adapter, DODOSellHelperAddress)
        logger.log("DODOV1Adapter Address: ", DODOV1Adapter.address);
        await deployer.deploy(DODOV2Adapter)
        logger.log("DODOV2Adapter Address: ", DODOV2Adapter.address);
        await deployer.deploy(UniAdapter)
        logger.log("UniAdapter Address: ", UniAdapter.address);
    }

    if (deploySwitch.ERC20) {
        logger.log("Deploy type: V2 - ERC20 Factory");
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
    }

    if (deploySwitch.DEPLOY_V2) {
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


        if (network == 'kovan') {

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
