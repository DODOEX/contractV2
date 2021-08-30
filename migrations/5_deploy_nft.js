const fs = require("fs");
const { deploySwitch } = require('../truffle-config.js')
const file = fs.createWriteStream("../deploy-nft.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);
const { GetConfig } = require("../configAdapter.js")

const DODOApproveProxy = artifacts.require("DODOApproveProxy");
const NFTCollateralVault = artifacts.require("NFTCollateralVault");
const BuyoutModel = artifacts.require("BuyoutModel");
const Fragment = artifacts.require("Fragment");
const DODONFTRegistry = artifacts.require("DODONFTRegistry");
const DODONFTProxy = artifacts.require("DODONFTProxy");
const DODONFTRouteHelper = artifacts.require("DODONFTRouteHelper");

const InitializableERC721 = artifacts.require("InitializableERC721");
const InitializableERC1155 = artifacts.require("InitializableERC1155");
const NFTTokenFactory = artifacts.require("NFTTokenFactory");

const DodoNftErc721 = artifacts.require("DODONFT");
const DodoNftErc1155 = artifacts.require("DODONFT1155");

const DODODropsV1 = artifacts.require("DODODropsV1");
const RandomGenerator = artifacts.require("RandomGenerator");

module.exports = async (deployer, network, accounts) => {
    let CONFIG = GetConfig(network, accounts)
    if (CONFIG == null) return;
    //Need Deploy first
    let WETHAddress = CONFIG.WETH;
    let DVMTemplateAddress = CONFIG.DVM;
    let CloneFactoryAddress = CONFIG.CloneFactory;
    let DODOApproveProxyAddress = CONFIG.DODOApproveProxy;

    if (DODOApproveProxyAddress == "" || CloneFactoryAddress == "") return;

    let MtFeeRateModelAddress = CONFIG.FeeRateModel;
    let FragmentAddress = CONFIG.Fragment;
    let BuyoutModelAddress = CONFIG.BuyoutModel;
    let NFTCollateralVaultAddress = CONFIG.NFTCollateralVault;
    let DODONFTRouteHelperAddress = CONFIG.DODONFTRouteHelper;

    let DODONFTRegistryAddress = CONFIG.DODONFTRegistry;
    let DODONFTProxyAddress = CONFIG.DODONFTProxy;

    let ERC721Address = CONFIG.InitializableERC721;
    let ERC1155Address = CONFIG.InitializableERC1155;
    let NFTTokenFactoryAddress = CONFIG.NFTTokenFactory;

    let MysteryBoxV1Address = CONFIG.MysteryBoxV1;
    let RandomGeneratorAddress = CONFIG.RandomGenerator;
    let RandomPool = CONFIG.RandomPool;

    let DodoNftErc721Address = CONFIG.DodoNftErc721;
    let DodoNftErc1155Address = CONFIG.DodoNftErc1155;

    let multiSigAddress = CONFIG.multiSigAddress;
    let defaultMaintainer = CONFIG.defaultMaintainer;

    if (deploySwitch.MYSTERYBOX_V1) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: FearNFT");

        if (RandomGeneratorAddress == "") {
            await deployer.deploy(RandomGenerator, RandomPool);
            RandomGeneratorAddress = RandomGenerator.address;
            logger.log("RandomGeneratorAddress: ", RandomGeneratorAddress);
        }

        if (MysteryBoxV1Address == "") {
            await deployer.deploy(DODODropsV1);
            MysteryBoxV1Address = DODODropsV1.address;
            logger.log("MysteryBoxV1Address: ", MysteryBoxV1Address);
            const MysteryBoxV1Instance = await DODODropsV1.at(MysteryBoxV1Address);
            var tx = await MysteryBoxV1Instance.init(
                "DODOTest",
                "DODOTest",
                "",
                multiSigAddress,
                RandomGeneratorAddress
            );
            logger.log("Init MysteryBoxV1 Tx:", tx.tx);
        }
    }

    if (deploySwitch.COLLECTIONS) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: DODO Collections");

        //ERC721
        if (DodoNftErc721Address == "") {
            await deployer.deploy(DodoNftErc721);
            DodoNftErc721Address = DodoNftErc721.address;
            logger.log("DodoNftErc721Address: ", DodoNftErc721Address);
            const DodoNftErc721Instance = await DodoNftErc721.at(DodoNftErc721Address);
            var tx = await DodoNftErc721Instance.init(
                "0x16CC37d06FE5061CD0023fb8d142ABaAbB396A2b",
                "DODONFT",
                "DODONFT"
            );
            logger.log("Init DodoNftErc721 Tx:", tx.tx);
        }

        //ERC1155
        if (DodoNftErc1155Address == "") {
            await deployer.deploy(DodoNftErc1155);
            DodoNftErc1155Address = DodoNftErc1155.address;
            logger.log("DodoNftErc1155Address: ", DodoNftErc1155Address);
            const DodoNftErc1155Instance = await DodoNftErc1155.at(DodoNftErc1155Address);
            var tx = await DodoNftErc1155Instance.initOwner(multiSigAddress);
            logger.log("Init DodoNftErc1155 Tx:", tx.tx);
        }
    }

    if (deploySwitch.DEPLOY_NFT) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: NFT");
        logger.log("multiSigAddress: ", multiSigAddress)

        //ERC721
        if (ERC721Address == "") {
            await deployer.deploy(InitializableERC721);
            ERC721Address = InitializableERC721.address;
            logger.log("ERC721Address: ", ERC721Address);
        }
        //ERC1155
        if (ERC1155Address == "") {
            await deployer.deploy(InitializableERC1155);
            ERC1155Address = InitializableERC1155.address;
            logger.log("ERC1155Address: ", ERC1155Address);
        }
        //NFTTokenFactory
        if (NFTTokenFactoryAddress == "") {
            await deployer.deploy(
                NFTTokenFactory,
                CloneFactoryAddress,
                ERC721Address,
                ERC1155Address
            );
            NFTTokenFactoryAddress = NFTTokenFactory.address;
            logger.log("NFTTokenFactoryAddress: ", NFTTokenFactoryAddress);
        }

        //NFTRegister
        if (DODONFTRegistryAddress == "") {
            await deployer.deploy(DODONFTRegistry);
            DODONFTRegistryAddress = DODONFTRegistry.address;
            logger.log("DODONFTRegistryAddress: ", DODONFTRegistryAddress);
            const DODONFTRegistrynstance = await DODONFTRegistry.at(DODONFTRegistryAddress);
            var tx = await DODONFTRegistrynstance.initOwner(multiSigAddress);
            logger.log("Init DODONFTRegistryAddress Tx:", tx.tx);

            await deployer.deploy(
                DODONFTRouteHelper,
                DODONFTRegistryAddress
            );
            DODONFTRouteHelperAddress = DODONFTRouteHelper.address;
            logger.log("DODONFTRouteHelperAddress: ", DODONFTRouteHelperAddress);
        }

        //BuyoutModel
        if(BuyoutModelAddress == "") {
            await deployer.deploy(BuyoutModel);
            BuyoutModelAddress = BuyoutModel.address;
            logger.log("BuyoutModelAddress: ", BuyoutModelAddress);
            const BuyoutModelInstance = await BuyoutModel.at(BuyoutModelAddress);
            var tx = await BuyoutModelInstance.initOwner(multiSigAddress);
            logger.log("Init BuyoutModelAddress Tx:", tx.tx);

        }

        //DODONFTRouteHelper
        if (DODONFTRouteHelperAddress == "") {
            await deployer.deploy(
                DODONFTRouteHelper,
                DODONFTRegistryAddress
            );
            DODONFTRouteHelperAddress = DODONFTRouteHelper.address;
            logger.log("DODONFTRouteHelperAddress: ", DODONFTRouteHelperAddress);
        }

        //Vault
        if (NFTCollateralVaultAddress == "") {
            await deployer.deploy(NFTCollateralVault);
            NFTCollateralVaultAddress = NFTCollateralVault.address;
            logger.log("NFTCollateralVaultAddress: ", NFTCollateralVaultAddress);
        }

        //Frag
        if (FragmentAddress == "") {
            await deployer.deploy(Fragment);
            FragmentAddress = Fragment.address;
            logger.log("FragmentAddress: ", FragmentAddress);
        }

        if (DODONFTProxyAddress == "") {
            await deployer.deploy(
                DODONFTProxy,
                CloneFactoryAddress,
                WETHAddress,
                DODOApproveProxyAddress,
                defaultMaintainer,
                BuyoutModelAddress,
                MtFeeRateModelAddress,
                NFTCollateralVaultAddress,
                FragmentAddress,
                DVMTemplateAddress,
                DODONFTRegistryAddress
            );
            DODONFTProxyAddress = DODONFTProxy.address;
            logger.log("DODONFTProxyAddress: ", DODONFTProxyAddress);
            const DODONFTProxyInstance = await DODONFTProxy.at(DODONFTProxyAddress);
            var tx = await DODONFTProxyInstance.initOwner(multiSigAddress);
            logger.log("Init DODONFTProxyAddress Tx:", tx.tx);
        }

        if (network == 'kovan' || network == 'rinkeby') {

            const DODOApproveProxyInstance = await DODOApproveProxy.at(DODOApproveProxyAddress);
            var tx = await DODOApproveProxyInstance.unlockAddProxy(DODONFTProxyAddress);
            logger.log("DODOApproveProxy unlockAddProxy tx: ", tx.tx);

            tx = await DODOApproveProxyInstance.addDODOProxy();
            logger.log("DODOApproveProxy addDODOProxy tx: ", tx.tx);

            const DODONFTRegistrynstance = await DODONFTRegistry.at(DODONFTRegistryAddress);
            var tx = await DODONFTRegistrynstance.addAdminList(DODONFTProxyAddress);
            logger.log("Add AdminList on DODONFTRegistry Tx:", tx.tx);
        }
    }
};
