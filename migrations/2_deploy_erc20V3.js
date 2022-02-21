const fs = require("fs");
const { deploySwitch } = require('../truffle-config.js')
const file = fs.createWriteStream("../deploy-detail-erc20V3.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);
const { GetConfig } = require("../configAdapter.js")

const ERC20V3Factory = artifacts.require("ERC20V3Factory");
const CustomERC20 = artifacts.require("CustomERC20");
const CustomMintableERC20 = artifacts.require("CustomMintableERC20");


module.exports = async (deployer, network, accounts) => {
    let CONFIG = GetConfig(network, accounts)
    let CloneFactoryAddress = CONFIG.CloneFactory;
    let ERC20Address = CONFIG.ERC20;
    if (CONFIG == null || ERC20Address == "") return;

    let ERC20V3FactoryAddress = CONFIG.ERC20V3Factory;
    let CustomERC20Address = CONFIG.CustomERC20;
    let CustomMintableERC20Address = CONFIG.CustomMintableERC20;

    let multiSigAddress = CONFIG.multiSigAddress;

    if (deploySwitch.ERC20V3Factory) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: ERC20V3Factory");


        if (CustomERC20Address == "") {
            await deployer.deploy(CustomERC20);
            CustomERC20Address = CustomERC20.address;
            logger.log("CustomERC20Address: ", CustomERC20Address);
        }

        if (CustomMintableERC20Address == "") {
            await deployer.deploy(CustomMintableERC20);
            CustomMintableERC20Address = CustomMintableERC20.address;
            logger.log("CustomMintableERC20Address: ", CustomMintableERC20Address);
        }


        if (ERC20V3FactoryAddress == "") {
            await deployer.deploy(
                ERC20V3Factory,
                CloneFactoryAddress,
                ERC20Address,
                CustomERC20Address,
                CustomMintableERC20Address,
                "2000000000000000" //0.002
            );
            ERC20V3FactoryAddress = ERC20V3Factory.address;
            logger.log("ERC20V3FactoryAddress: ", ERC20V3FactoryAddress);

            const erc20V3FactoryInstance = await ERC20V3Factory.at(ERC20V3FactoryAddress);
            var tx = await erc20V3FactoryInstance.initOwner(multiSigAddress);
            logger.log("Init ERC20V3Factory Tx:", tx.tx);
        }
    }
};
