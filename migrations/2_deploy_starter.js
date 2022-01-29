const fs = require("fs");
const { deploySwitch } = require('../truffle-config.js')
const file = fs.createWriteStream("../deploy-starter.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);
const { GetConfig } = require("../configAdapter.js")

const DODOStarterProxy = artifacts.require("DODOStarterProxy");
const DODOStarterFactory = artifacts.require("DODOStarterFactory");
const FairFunding = artifacts.require("FairFunding");
const InstantFunding = artifacts.require("InstantFunding");

module.exports = async (deployer, network, accounts) => {
    let CONFIG = GetConfig(network, accounts)
    if (CONFIG == null) return;
    //Need Deploy first
    let DODOApproveProxyAddress = CONFIG.DODOApproveProxy;
    let CloneFactoryAddress = CONFIG.CloneFactory;
    let WETHAddress = CONFIG.WETH;

    if (DODOApproveProxyAddress == "" || CloneFactoryAddress == "" || WETHAddress == "") return;

    let FairFundingTemplate = CONFIG.FairFunding;
    let InstantFundingTemplate = CONFIG.InstantFunding;
    let DODOStarterFactoryAddress = CONFIG.DODOStarterFactory;
    let DODOStarterProxyAddress = CONFIG.DODOStarterProxy;

    let multiSigAddress = CONFIG.multiSigAddress;

    if (deploySwitch.STARTER) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: STARTER");

        if (FairFundingTemplate == "") {
            await deployer.deploy(FairFunding);
            FairFundingTemplate = FairFunding.address;
            logger.log("FairFundingTemplate: ", FairFundingTemplate);
        }

        if (InstantFundingTemplate == "") {
            await deployer.deploy(InstantFunding);
            InstantFundingTemplate = InstantFunding.address;
            logger.log("InstantFundingTemplate: ", InstantFundingTemplate);
        }

        if (DODOStarterFactoryAddress == "") {
            await deployer.deploy(
                DODOStarterFactory,
                CloneFactoryAddress,
                FairFundingTemplate,
                InstantFundingTemplate
            );
            DODOStarterFactoryAddress = DODOStarterFactory.address;
            logger.log("DODOStarterFactoryAddress: ", DODOStarterFactoryAddress);

            const instance = await DODOStarterFactory.at(DODOStarterFactoryAddress);
            var tx = await instance.initOwner(multiSigAddress);
            logger.log("Init DODOStarterFactory Tx:", tx.tx);
        }


        if (DODOStarterProxyAddress == "") {
            await deployer.deploy(
                DODOStarterProxy,
                WETHAddress,
                DODOApproveProxyAddress
            );
            DODOStarterProxyAddress = DODOStarterProxy.address;
            logger.log("DODOStarterProxyAddress: ", DODOStarterProxyAddress);
        }
    }
};
