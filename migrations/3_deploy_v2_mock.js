const fs = require("fs");
const Web3 = require('web3');
const { deploySwitch } = require('../truffle-config.js')
const file = fs.createWriteStream("../kovan-mock-v2.0.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);
const { GetConfig } = require("../configAdapter.js")

const CloneFactory = artifacts.require("CloneFactory");
const ERC20Template = artifacts.require("InitializableERC20");
const MintableERC20Template = artifacts.require("InitializableMintableERC20");
const ERC20Factory = artifacts.require("ERC20Factory");
const DODOProxyV2 = artifacts.require("DODOV2Proxy02");
const DVMFactory = artifacts.require("DVMFactory");
const DPPFactory = artifacts.require("DPPFactory");

const POOL_PARAM = [
    // {
    //     baseAddr: "0xd8C30a4E866B188F16aD266dC3333BD47F34ebaE",  //ABC0
    //     quoteAddr: "0x43688f367eb83697c3ca5d03c5055b6bd6f6ac4b", //USDC
    //     lpFeeRate: "0", //0
    //     i: "10000000", //10
    //     k: "500000000000000000" //0.5
    // },
    // {
    //     baseAddr: "0xd8C30a4E866B188F16aD266dC3333BD47F34ebaE", //ABC0
    //     quoteAddr: "0x156595bAF85D5C29E91d959889B022d952190A64", //USDT
    //     lpFeeRate: "3000000000000000", //0.003
    //     i: "10000000", //10
    //     k: "100000000000000000" //0.1
    // },
    // {
    //     baseAddr: "0xd7f02D1b4F9495B549787808503Ecfd231C3fbDA", //ABC1
    //     quoteAddr: "0x43688f367eb83697c3ca5d03c5055b6bd6f6ac4b", //USDC
    //     lpFeeRate: "0", //0
    //     i: "5000000", //5
    //     k: "700000000000000000" //0.7
    // },
    // {
    //     baseAddr: "0xd7f02D1b4F9495B549787808503Ecfd231C3fbDA", //ABC1
    //     quoteAddr: "0x156595bAF85D5C29E91d959889B022d952190A64", //USDT
    //     lpFeeRate: "3000000000000000", //0.003
    //     i: "8000000", //8
    //     k: "600000000000000000" //0.6
    // },
    {
        baseAddr: "0xd8C30a4E866B188F16aD266dC3333BD47F34ebaE",  //ABC0
        quoteAddr: "0x5eca15b12d959dfcf9c71c59f8b467eb8c6efd0b", //WETH
        lpFeeRate: "3000000000000000", //0.003
        i: "45000000000000000000", //45
        k: "800000000000000000" //0.8
    },
    {
        baseAddr: "0xd7f02D1b4F9495B549787808503Ecfd231C3fbDA", //ABC1
        quoteAddr: "0x5eca15b12d959dfcf9c71c59f8b467eb8c6efd0b", //WETH
        lpFeeRate: "0", //0.003
        i: "30000000000000000000", //30
        k: "300000000000000000" //0.3
    }
];

module.exports = async (deployer, network, accounts) => {
    if (network != "kovan") return;
    let CONFIG = GetConfig(network, accounts)
    let CloneFactoryAddress = CONFIG.CloneFactory;
    let ERC20TemplateAddress = CONFIG.ERC20;
    let MintableERC20TemplateAddress = CONFIG.MintableERC20;
    let ERC20FactoryAddress = CONFIG.ERC20Factory;

    let DPPFactoryAddress = CONFIG.DPPFactory;
    let DVMFactoryAddress = CONFIG.DVMFactory;
    let DODOApproveAddress = CONFIG.DODOApprove;
    let DODOProxyV2Address = CONFIG.DODOV2Proxy;


    const provider = new Web3.providers.HttpProvider("https://kovan.infura.io/v3/22d4a3b2df0e47b78d458f43fe50a199");

    if (!provider) {
        throw new Error(`Unable to find provider for network: ${network}`)
    }

    const web3 = new Web3(provider)


    if (deploySwitch.MOCK_V2_POOL) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Mock POOL Tx: V2");
        var tx;
        {//Approve when change DODOApprove Address
            const token0Addr = "0xd8C30a4E866B188F16aD266dC3333BD47F34ebaE";
            const token1Addr = "0xd7f02D1b4F9495B549787808503Ecfd231C3fbDA";
            const wethAddr = "0x5eca15b12d959dfcf9c71c59f8b467eb8c6efd0b";
            // const token2Addr = "0xFE1133ea03d701C5006b7f065bBf987955E7A67C";
            // const token3Addr = "0x123ee47BaE3F64d422F2FB18ac444B47c1880F4C";
            // const token4Addr = "0x0ab8EF8B19655F32959c83e5fC5cD6536065D28f";
            // const token5Addr = "0x6462794c19e6b4543BEC56200212c7c746bbB9eB";
            const quote0Addr = "0x43688f367eb83697c3ca5d03c5055b6bd6f6ac4b";
            const quote1Addr = "0x156595bAF85D5C29E91d959889B022d952190A64";
            const token0 = await ERC20Template.at(token0Addr);
            const token1 = await ERC20Template.at(token1Addr);
            const weth = await ERC20Template.at(wethAddr);
            // const token2 = await ERC20Template.at(token2Addr);
            // const token3 = await ERC20Template.at(token3Addr);
            // const token4 = await ERC20Template.at(token4Addr);
            // const token5 = await ERC20Template.at(token5Addr);
            const quote0 = await ERC20Template.at(quote0Addr);
            const quote1 = await ERC20Template.at(quote1Addr);

            // tx = await token0.approve(DODOApproveAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            // logger.log("Approve:" + token0Addr + " Tx:", tx.tx);
            // tx = await token1.approve(DODOApproveAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            // logger.log("Approve:" + token1Addr + " Tx:", tx.tx);
            tx = await weth.approve(DODOApproveAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            logger.log("Approve:" + token1Addr + " Tx:", tx.tx);
            // tx = await token2.approve(DODOApproveAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            // logger.log("Approve:" + token2Addr + " Tx:", tx.tx);
            // tx = await token3.approve(DODOApproveAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            // logger.log("Approve:" + token3Addr + " Tx:", tx.tx);
            // tx = await token4.approve(DODOApproveAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            // logger.log("Approve:" + token4Addr + " Tx:", tx.tx);
            // tx = await token5.approve(DODOApproveAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            // logger.log("Approve:" + token5Addr + " Tx:", tx.tx);
            // tx = await quote0.approve(DODOApproveAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            // logger.log("Approve:" + quote0Addr + " Tx:", tx.tx);
            // tx = await quote1.approve(DODOApproveAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            // logger.log("Approve:" + quote1Addr + " Tx:", tx.tx);
        }
        const DODOProxyV2Instance = await DODOProxyV2.at(DODOProxyV2Address);
        const DVMFactoryInstance = await DVMFactory.at(DVMFactoryAddress);
        const DPPFactoryInstance = await DPPFactory.at(DPPFactoryAddress);

        const baseInAmount = web3.utils.toWei("100000", 'ether');
        // const quoteInAmount = web3.utils.toWei("10000", 'mwei');
        const quoteInAmount = web3.utils.toWei("0.5", 'ether');
        const deadline = Math.floor(new Date().getTime() / 1000 + 60 * 10);
        //DVM Pool
        // for (var i = 0; i < POOL_PARAM.length; i++) {
        //     tx = await DODOProxyV2Instance.createDODOVendingMachine(
        //         POOL_PARAM[i].baseAddr,
        //         POOL_PARAM[i].quoteAddr,
        //         baseInAmount,
        //         0,
        //         POOL_PARAM[i].lpFeeRate,
        //         POOL_PARAM[i].i,
        //         POOL_PARAM[i].k,
        //         false,
        //         deadline
        //     );
        //     var poolAddress = await DVMFactoryInstance._REGISTRY_(POOL_PARAM[i].baseAddr, POOL_PARAM[i].quoteAddr, 0);
        //     logger.log("Create DVM: " + POOL_PARAM[i].baseAddr + "-" + POOL_PARAM[i].quoteAddr + " Pool:" + poolAddress + " Tx:", tx.tx);
        // }
        //DPP Pool
        for (var i = 0; i < POOL_PARAM.length; i++) {
            tx = await DODOProxyV2Instance.createDODOPrivatePool(
                POOL_PARAM[i].baseAddr,
                POOL_PARAM[i].quoteAddr,
                baseInAmount,
                quoteInAmount,
                POOL_PARAM[i].lpFeeRate,
                POOL_PARAM[i].i,
                POOL_PARAM[i].k,
                false,
                deadline
            );
            var poolAddress = await DPPFactoryInstance._REGISTRY_(POOL_PARAM[i].baseAddr, POOL_PARAM[i].quoteAddr, 0);
            logger.log("Create DPP: " + POOL_PARAM[i].baseAddr + "-" + POOL_PARAM[i].quoteAddr + " Pool:" + poolAddress + " Tx:", tx.tx);
        }
    }

    if (deploySwitch.MOCK_TOKEN) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Mock TOKEN Tx: V2");
        if (CloneFactoryAddress == "") {
            await deployer.deploy(CloneFactory);
            CloneFactoryAddress = CloneFactory.address;
            logger.log("CloneFactoryAddress: ", CloneFactoryAddress);
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

        const ERC20FactoryInstance = await ERC20Factory.at(ERC20FactoryAddress);

        const totalSupply = web3.utils.toWei("0", 'ether');
        for (let i = 0; i < 0; i++) {
            // var tx = await ERC20FactoryInstance.createStdERC20(totalSupply, 'DODO Bird', 'DODO', 18);
            var tx = await ERC20FactoryInstance.createMintableERC20(totalSupply, 'DODO Bird', 'DODO', 18);
            // var tx = await ERC20FactoryInstance.createStdERC20(totalSupply, 'USDT Token', 'USDT', 6);
            logger.log("ERC20 address: ", tx.logs[0].args['erc20'] + "; Symbol:" + 'DODO');
            // logger.log("ERC20 address: ", tx.logs[0].args['erc20'] + "; Symbol:" + 'USDT');
        }
    }
};
