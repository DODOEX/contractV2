const fs = require("fs");
const { deploySwitch } = require('../truffle-config.js')
const file = fs.createWriteStream("../deploy-nft.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);
const { GetConfig } = require("../configAdapter.js")

const DODOApproveProxy = artifacts.require("DODOApproveProxy");
const ConstFeeRateModel = artifacts.require("ConstFeeRateModel");
const NFTCollateralVault = artifacts.require("NFTCollateralVault");
const Fragment = artifacts.require("Fragment");
const FeeDistributor = artifacts.require("FeeDistributor");
const DODONFTRegistry = artifacts.require("DODONFTRegistry");
const DODONFTProxy = artifacts.require("DODONFTProxy");

const InitializableERC721 = artifacts.require("InitializableERC721");
const InitializableERC1155 = artifacts.require("InitializableERC1155");
const NFTTokenFactory = artifacts.require("NFTTokenFactory");

module.exports = async (deployer, network, accounts) => {
    let CONFIG = GetConfig(network, accounts)
    if (CONFIG == null) return;
    //Need Deploy first
    let WETHAddress = CONFIG.WETH;
    let DVMTemplateAddress = CONFIG.DVM;
    let CloneFactoryAddress = CONFIG.CloneFactory;
    let DvmFactoryAddress = CONFIG.DVMFactory;
    let DODOApproveProxyAddress = CONFIG.DODOApproveProxy;

    if (DvmFactoryAddress == "" || DODOApproveProxyAddress == "" || CloneFactoryAddress == "") return;

    let ConstFeeRateModelAddress = CONFIG.ConstFeeRateModel;
    let FeeDistributorAddress = CONFIG.FeeDistributor;
    let FragmentAddress = CONFIG.Fragment;
    let NFTCollateralVaultAddress = CONFIG.NFTCollateralVault;

    let DODONFTRegistryAddress = CONFIG.DODONFTRegistry;
    let DODONFTProxyAddress = CONFIG.DODONFTProxy;

    let ERC721Address = CONFIG.InitializableERC721;
    let ERC1155Address = CONFIG.InitializableERC1155;
    let NFTTokenFactoryAddress = CONFIG.NFTTokenFactory;

    let multiSigAddress = CONFIG.multiSigAddress;
    let defaultMaintainer = CONFIG.defaultMaintainer;

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
        }

        //Vault
        if (NFTCollateralVaultAddress == "") {
            await deployer.deploy(NFTCollateralVault);
            NFTTokenFactoryAddress = NFTCollateralVault.address;
            logger.log("NFTTokenFactoryAddress: ", NFTTokenFactoryAddress);
        }

        //Frag
        if (FragmentAddress == "") {
            await deployer.deploy(Fragment);
            FragmentAddress = Fragment.address;
            logger.log("FragmentAddress: ", FragmentAddress);
        }

        //FeeDistributor
        if (FeeDistributorAddress == "") {
            await deployer.deploy(FeeDistributor);
            FeeDistributorAddress = FeeDistributor.address;
            logger.log("FeeDistributorAddress: ", FeeDistributorAddress);
        }

        //ConstMtFeeModel
        if (ConstFeeRateModelAddress == "") {
            await deployer.deploy(ConstFeeRateModel);
            ConstFeeRateModelAddress = ConstFeeRateModel.address;
            logger.log("ConstFeeRateModelAddress: ", ConstFeeRateModelAddress);
        }


        if (DODONFTProxyAddress == "") {
            await deployer.deploy(
                DODONFTProxy,
                CloneFactoryAddress,
                WETHAddress,
                DODOApproveProxyAddress,
                DvmFactoryAddress,
                defaultMaintainer,
                NFTCollateralVaultAddress,
                FragmentAddress,
                FeeDistributorAddress,
                DVMTemplateAddress,
                ConstFeeRateModelAddress,
                DODONFTRegistryAddress
            );
            DODONFTProxyAddress = DODONFTProxy.address;
            logger.log("DODONFTProxyAddress: ", DODONFTProxyAddress);
            const DODONFTProxyInstance = await DODONFTProxy.at(DODONFTProxyAddress);
            var tx = await DODONFTProxyInstance.initOwner(multiSigAddress);
            logger.log("Init DODONFTProxyAddress Tx:", tx.tx);
        }

        if (network == 'kovan' || network == 'mbtestnet') {

            const DODOApproveProxyInstance = await DODOApproveProxy.at(DODOApproveProxyAddress);
            var tx = await DODOApproveProxyInstance.unlockAddProxy(DODONFTProxyAddress);
            logger.log("DODOApproveProxy unlockAddProxy tx: ", tx.tx);

            tx = await DODOApproveProxyInstance.addDODOProxy();
            logger.log("DODOApproveProxy addDODOProxy tx: ", tx.tx);
        }
    }
};
