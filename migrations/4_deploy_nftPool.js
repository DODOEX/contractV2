const fs = require("fs");
const { deploySwitch } = require('../truffle-config.js')
const file = fs.createWriteStream("../deploy-nft.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);
const { GetConfig } = require("../configAdapter.js")

const DODONFTApprove = artifacts.require("DODONFTApprove");
const FilterAdmin = artifacts.require("FilterAdmin");
const FilterERC721V1 = artifacts.require("FilterERC721V1");
const FilterERC1155V1 = artifacts.require("FilterERC1155V1");
const DODONFTPoolProxy = artifacts.require("DODONFTPoolProxy")
const Controller = artifacts.require("Controller");

module.exports = async (deployer, network, accounts) => {
    let CONFIG = GetConfig(network, accounts)
    if (CONFIG == null) return;
    //Need Deploy first
    let DODOApproveAddress = CONFIG.DODOApprove;
    let CloneFactoryAddress = CONFIG.CloneFactory;

    if (DODOApproveAddress == "" || CloneFactoryAddress == "") return;

    let DODONFTApproveAddress = CONFIG.DODONFTApprove;
    let FilterAdminAddress = CONFIG.FilterAdmin;
    let FilterERC721V1Address = CONFIG.FilterERC721V1;
    let FilterERC1155V1Address = CONFIG.FilterERC1155V1;

    let DODONFTPoolProxyAddress = CONFIG.DODONFTPoolProxy;
    let ControllerAddress = CONFIG.NFTPoolController;

    let multiSigAddress = CONFIG.multiSigAddress;

    if (deploySwitch.NFT_POOL) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: NFT_POOL");

        if (FilterAdminAddress == "") {
            await deployer.deploy(FilterAdmin);
            FilterAdminAddress = FilterAdmin.address;
            logger.log("FilterAdminAddress: ", FilterAdminAddress);
        }

        if (FilterERC721V1Address == "") {
            await deployer.deploy(FilterERC721V1);
            FilterERC721V1Address = FilterERC721V1.address;
            logger.log("FilterERC721V1Address: ", FilterERC721V1Address);
        }

        if (FilterERC1155V1Address == "") {
            await deployer.deploy(FilterERC1155V1);
            FilterERC1155V1Address = FilterERC1155V1.address;
            logger.log("FilterERC1155V1Address: ", FilterERC1155V1Address);
        }

        if (ControllerAddress == "") {
            await deployer.deploy(Controller);
            ControllerAddress = Controller.address;
            logger.log("ControllerAddress: ", ControllerAddress);
            const ControllerInstance = await Controller.at(ControllerAddress);
            var tx = await ControllerInstance.initOwner(multiSigAddress);
            logger.log("Init Controller Tx:", tx.tx);
        }

        if (DODONFTApproveAddress == "") {
            await deployer.deploy(DODONFTApprove);
            DODONFTApproveAddress = DODONFTApprove.address;
            logger.log("DODONFTApproveAddress: ", DODONFTApproveAddress);
        }

        if (DODONFTPoolProxyAddress == "") {
            await deployer.deploy(
                DODONFTPoolProxy,
                CloneFactoryAddress,
                FilterAdminAddress,
                ControllerAddress,
                multiSigAddress,
                DODONFTApproveAddress,
                DODOApproveAddress
            );
            DODONFTPoolProxyAddress = DODONFTPoolProxy.address;
            logger.log("DODONFTPoolProxyAddress: ", DODONFTPoolProxyAddress);

            const DODONFTPoolProxyInstance = await DODONFTPoolProxy.at(DODONFTPoolProxyAddress);
            var tx = await DODONFTPoolProxyInstance.initOwner(multiSigAddress);
            logger.log("Init DODONFTPoolProxy Tx:", tx.tx);
        }


        if (network == 'kovan' || network == 'rinkeby') {
            var tx;
            const DODONFTPoolProxyInstance = await DODONFTPoolProxy.at(DODONFTPoolProxyAddress);
            tx = await DODONFTPoolProxyInstance.setFilterTemplate(1, FilterERC721V1Address);
            logger.log("DODONFTPoolProxy SetFilterTemplate 1 tx: ", tx.tx);
            tx = await DODONFTPoolProxyInstance.setFilterTemplate(2, FilterERC1155V1Address);
            logger.log("DODONFTPoolProxy SetFilterTemplate 2 tx: ", tx.tx);

            const DODONFTApproveInstance = await DODONFTApprove.at(DODONFTApproveAddress);
            var tx = await DODONFTApproveInstance.init(multiSigAddress, [DODONFTPoolProxyAddress]);
            logger.log("DODONFTApprove init tx: ", tx.tx);
        }
    }
};
