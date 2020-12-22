const fs = require("fs");
const Web3 = require('web3');
const { deploySwitch } = require('../truffle-config.js')
const file = fs.createWriteStream("../kovan-mock-v2.0.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);

const CloneFactory = artifacts.require("CloneFactory");
const ERC20Template = artifacts.require("InitializableERC20");
const MintableERC20Template = artifacts.require("InitializableMintableERC20");
const ERC20Factory = artifacts.require("ERC20Factory");
const DODOProxyV2 = artifacts.require("DODOV2Proxy01");

const POOL_PARAM = [
    {
        baseAddr: "0xd8C30a4E866B188F16aD266dC3333BD47F34ebaE",  //ABC0
        quoteAddr: "0x69c8a7fc6e05d7aa36114b3e35f62deca8e11f6e", //USDC
        lpFeeRate: "3000000000000000", //0.003
        mtFeeRate: "1000000000000000", //0.001
        i: "10000000000000000000", //10
        k: "500000000000000000" //0.5
    },
    {
        baseAddr: "0xd8C30a4E866B188F16aD266dC3333BD47F34ebaE", //ABC0
        quoteAddr: "0x156595bAF85D5C29E91d959889B022d952190A64", //USDT
        lpFeeRate: "3000000000000000", //0.003
        mtFeeRate: "1000000000000000", //0.001
        i: "10000000000000000000", //10
        k: "800000000000000000" //0.8
    },
    {
        baseAddr: "0xd7f02D1b4F9495B549787808503Ecfd231C3fbDA", //ABC1
        quoteAddr: "0x69c8a7fc6e05d7aa36114b3e35f62deca8e11f6e", //USDC
        lpFeeRate: "3000000000000000", //0.003
        mtFeeRate: "1000000000000000", //0.001
        i: "5000000000000000000", //5
        k: "800000000000000000" //0.8
    },
    {
        baseAddr: "0xd7f02D1b4F9495B549787808503Ecfd231C3fbDA", //ABC1
        quoteAddr: "0x156595bAF85D5C29E91d959889B022d952190A64", //USDT
        lpFeeRate: "3000000000000000", //0.003
        mtFeeRate: "1000000000000000", //0.001
        i: "5000000000000000000", //5
        k: "900000000000000000" //0.9
    }
];

module.exports = async (deployer, network, accounts) => {
    if (network != "kovan") return;
    let CloneFactoryAddress = "0xf7959fe661124C49F96CF30Da33729201aEE1b27";
    let ERC20TemplateAddress = "0x77d2e257241e6971688b08bdA9F658F065d7bb41";
    let MintableERC20TemplateAddress = "0xA45a64DAba80757432fA4d654Df12f65f020C13C";
    let ERC20FactoryAddress = "0xCb1A2f64EfB02803276BFB5a8D511C4D950282a0";
    let DODOApproveAddress = "0x6eA356EA3c1780c02873591d93451Ed3f4509bEa";
    let DODOProxyV2Address = "0xfEC85D8ea0E85ABa5b35aca959845878113BE108";

    const provider = new Web3.providers.HttpProvider("https://kovan.infura.io/v3/22d4a3b2df0e47b78d458f43fe50a199");

    if (!provider) {
        throw new Error(`Unable to find provider for network: ${network}`)
    }

    const web3 = new Web3(provider)

    logger.log("====================================================");
    logger.log("network type: " + network);
    logger.log("Deploy time: " + new Date().toLocaleString());

    if (deploySwitch.MOCK_V2_POOL) {
        logger.log("Mock POOL Tx: V2");
        var tx;
        {//Approve when change DODOApprove Address
            const token0Addr = "0xd8C30a4E866B188F16aD266dC3333BD47F34ebaE";
            const token1Addr = "0xd7f02D1b4F9495B549787808503Ecfd231C3fbDA";
            const token2Addr = "0xFE1133ea03d701C5006b7f065bBf987955E7A67C";
            const token3Addr = "0x123ee47BaE3F64d422F2FB18ac444B47c1880F4C";
            const token4Addr = "0x0ab8EF8B19655F32959c83e5fC5cD6536065D28f";
            const token5Addr = "0x6462794c19e6b4543BEC56200212c7c746bbB9eB";
            const token0 = await ERC20Template.at(token0Addr);
            const token1 = await ERC20Template.at(token1Addr);
            const token2 = await ERC20Template.at(token2Addr);
            const token3 = await ERC20Template.at(token3Addr);
            const token4 = await ERC20Template.at(token4Addr);
            const token5 = await ERC20Template.at(token5Addr);

            tx = await token0.approve(DODOApproveAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            logger.log("Approve:" + token0Addr + " Tx:", tx.tx);
            tx = await token1.approve(DODOApproveAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            logger.log("Approve:" + token1Addr + " Tx:", tx.tx);
            tx = await token2.approve(DODOApproveAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            logger.log("Approve:" + token2Addr + " Tx:", tx.tx);
            tx = await token3.approve(DODOApproveAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            logger.log("Approve:" + token3Addr + " Tx:", tx.tx);
            tx = await token4.approve(DODOApproveAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            logger.log("Approve:" + token4Addr + " Tx:", tx.tx);
            tx = await token5.approve(DODOApproveAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            logger.log("Approve:" + token5Addr + " Tx:", tx.tx);
        }
        const DODOProxyV2Instance = await DODOProxyV2.at(DODOProxyV2Address);
        const assetTo = accounts[0];
        const baseInAmount = web3.utils.toWei("10000", 'ether');
        const quoteInAmount = 0;
        const deadline = Math.floor(new Date().getTime() / 1000 + 60 * 10);
        //DVM Pool
        for (var i = 0; i < POOL_PARAM.length; i++) {
            tx = await DODOProxyV2Instance.createDODOVendingMachine(
                assetTo,
                POOL_PARAM[i].baseAddr,
                POOL_PARAM[i].quoteAddr,
                baseInAmount,
                quoteInAmount,
                POOL_PARAM[i].lpFeeRate,
                POOL_PARAM[i].mtFeeRate,
                POOL_PARAM[i].i,
                POOL_PARAM[i].k,
                deadline
            );
            logger.log("Create DVM: " + POOL_PARAM[i].baseAddr + "-" + POOL_PARAM[i].quoteAddr + " Tx:", tx.tx);
        }
        //DVM Pool
        for (var i = 0; i < POOL_PARAM.length; i++) {
            tx = await DODOProxyV2Instance.createDODOPrivatePool(
                POOL_PARAM[i].baseAddr,
                POOL_PARAM[i].quoteAddr,
                baseInAmount,
                quoteInAmount,
                POOL_PARAM[i].lpFeeRate,
                POOL_PARAM[i].mtFeeRate,
                POOL_PARAM[i].i,
                POOL_PARAM[i].k,
                deadline
            );
            logger.log("Create DPP: " + POOL_PARAM[i].baseAddr + "-" + POOL_PARAM[i].quoteAddr + " Tx:", tx.tx);
        }
    }

    if (deploySwitch.MOCK_TOKEN) {
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

        const totalSupply = web3.utils.toWei("100000000", 'mwei');
        for (let i = 0; i < 8; i++) {
            var tx = await ERC20FactoryInstance.createStdERC20(totalSupply, 'ABC Token', 'ABC' + i, 18);
            // var tx = await ERC20FactoryInstance.createStdERC20(totalSupply, 'USDT Token', 'USDT', 6);
            logger.log("ERC20 address: ", tx.logs[0].args['erc20'] + "; Symbol:" + 'ABC' + i);
            // logger.log("ERC20 address: ", tx.logs[0].args['erc20'] + "; Symbol:" + 'USDT');
        }
    }
};
