const fs = require("fs");
const Web3 = require('web3');
const file = fs.createWriteStream("../kovan-mock-v2.0.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);

const CloneFactory = artifacts.require("CloneFactory");
const ERC20Template = artifacts.require("InitializableERC20");
const MintableERC20Template = artifacts.require("InitializableMintableERC20");
const ERC20Factory = artifacts.require("ERC20Factory");
const DODOProxyV2 = artifacts.require("DODOV2Proxy01");

const MOCK_TOKEN = false;
const MOCK_POOL = false;

module.exports = async (deployer, network, accounts) => {
    if (network != "kovan") return;
    let CloneFactoryAddress = "0xf7959fe661124C49F96CF30Da33729201aEE1b27";
    let ERC20TemplateAddress = "0x77d2e257241e6971688b08bdA9F658F065d7bb41";
    let MintableERC20TemplateAddress = "0xA45a64DAba80757432fA4d654Df12f65f020C13C";
    let ERC20FactoryAddress = "0xCb1A2f64EfB02803276BFB5a8D511C4D950282a0";
    let DODOApproveAddress = "0xC38ad4314bb44EE84cC2D4B2B1BBa4644550f172";
    let DODOProxyV2Address = "0x7102A9AA2146557EA60a6319EB40e8C8d856e628";

    const provider = new Web3.providers.HttpProvider("https://kovan.infura.io/v3/22d4a3b2df0e47b78d458f43fe50a199");

    if (!provider) {
        throw new Error(`Unable to find provider for network: ${network}`)
    }

    const web3 = new Web3(provider)

    logger.log("====================================================");
    logger.log("network type: " + network);
    logger.log("Deploy time: " + new Date().toLocaleString());

    if (MOCK_POOL) {
        logger.log("Mock POOL Tx: V2");
        var tx;
        const quoteAddr = "0x69c8a7fc6e05d7aa36114b3e35f62deca8e11f6e";
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

        //approve
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


        const DODOProxyV2Instance = await DODOProxyV2.at(DODOProxyV2Address);
        const assetTo = accounts[0];
        const baseInAmount = web3.utils.toWei("10000", 'ether');
        const quoteInAmount = 0;
        const lpFeeRate = web3.utils.toWei("0.003", 'ether');
        const mtFeeRate = web3.utils.toWei("0.001", 'ether');
        const i = web3.utils.toWei("10", 'ether');
        const k = web3.utils.toWei("0.5", 'ether');
        const deadline = Math.floor(new Date().getTime() / 1000 + 60 * 10);
        //DVM Pool
        tx = await DODOProxyV2Instance.createDODOVendingMachine(assetTo, token0Addr, quoteAddr, baseInAmount, quoteInAmount, lpFeeRate, mtFeeRate, i, k, deadline);
        logger.log("Create DVM " + token0Addr + " Tx:", tx.tx);
        tx = await DODOProxyV2Instance.createDODOVendingMachine(assetTo, token1Addr, quoteAddr, baseInAmount, quoteInAmount, lpFeeRate, mtFeeRate, i, k, deadline);
        logger.log("Create DVM " + token1Addr + " Tx:", tx.tx);
        tx = await DODOProxyV2Instance.createDODOVendingMachine(assetTo, token2Addr, quoteAddr, baseInAmount, quoteInAmount, lpFeeRate, mtFeeRate, i, k, deadline);
        logger.log("Create DVM " + token2Addr + " Tx:", tx.tx);
        tx = await DODOProxyV2Instance.createDODOVendingMachine(assetTo, token3Addr, quoteAddr, baseInAmount, quoteInAmount, lpFeeRate, mtFeeRate, i, k, deadline);
        logger.log("Create DVM " + token3Addr + " Tx:", tx.tx);
        tx = await DODOProxyV2Instance.createDODOVendingMachine(assetTo, token4Addr, quoteAddr, baseInAmount, quoteInAmount, lpFeeRate, mtFeeRate, i, k, deadline);
        logger.log("Create DVM " + token4Addr + " Tx:", tx.tx);
        tx = await DODOProxyV2Instance.createDODOVendingMachine(assetTo, token5Addr, quoteAddr, baseInAmount, quoteInAmount, lpFeeRate, mtFeeRate, i, k, deadline);
        logger.log("Create DVM " + token5Addr + " Tx:", tx.tx);
        //DPP Pool
        tx = await DODOProxyV2Instance.createDODOPrivatePool(token0Addr, quoteAddr, baseInAmount, quoteInAmount, lpFeeRate, mtFeeRate, i, k, deadline);
        logger.log("Create DPP " + token0Addr + " Tx:", tx.tx);
        tx = await DODOProxyV2Instance.createDODOPrivatePool(token1Addr, quoteAddr, baseInAmount, quoteInAmount, lpFeeRate, mtFeeRate, i, k, deadline);
        logger.log("Create DPP " + token1Addr + " Tx:", tx.tx);
        tx = await DODOProxyV2Instance.createDODOPrivatePool(token2Addr, quoteAddr, baseInAmount, quoteInAmount, lpFeeRate, mtFeeRate, i, k, deadline);
        logger.log("Create DPP " + token2Addr + " Tx:", tx.tx);
        tx = await DODOProxyV2Instance.createDODOPrivatePool(token3Addr, quoteAddr, baseInAmount, quoteInAmount, lpFeeRate, mtFeeRate, i, k, deadline);
        logger.log("Create DPP " + token3Addr + " Tx:", tx.tx);
        tx = await DODOProxyV2Instance.createDODOPrivatePool(token4Addr, quoteAddr, baseInAmount, quoteInAmount, lpFeeRate, mtFeeRate, i, k, deadline);
        logger.log("Create DPP " + token4Addr + " Tx:", tx.tx);
        tx = await DODOProxyV2Instance.createDODOPrivatePool(token5Addr, quoteAddr, baseInAmount, quoteInAmount, lpFeeRate, mtFeeRate, i, k, deadline);
        logger.log("Create DPP " + token5Addr + " Tx:", tx.tx);
    }


    if (MOCK_TOKEN) {
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

        const totalSupply = web3.utils.toWei("100000000", 'ether');
        for (let i = 0; i < 8; i++) {
            var tx = await ERC20FactoryInstance.createStdERC20(totalSupply, 'ABC Token', 'ABC' + i, 18);
            logger.log("ERC20 address: ", tx.logs[0].args['erc20'] + "; Symbol:" + 'ABC' + i);
        }
    }


    if (MOCK_TOKEN) {
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

        const totalSupply = web3.utils.toWei("100000000", 'ether');
        for (let i = 0; i < 8; i++) {
            var tx = await ERC20FactoryInstance.createStdERC20(totalSupply, 'ABC Token', 'ABC' + i, 18);
            logger.log("ERC20 address: ", tx.logs[0].args['erc20'] + "; Symbol:" + 'ABC' + i);
        }
    }
};
