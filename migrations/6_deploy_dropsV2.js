const fs = require("fs");
const { deploySwitch } = require('../truffle-config.js')
const file = fs.createWriteStream("../deploy-drops.txt", { 'flags': 'a' });
let logger = new console.Console(file, file);
const { GetConfig } = require("../configAdapter.js")

const DODOApproveProxy = artifacts.require("DODOApproveProxy");
const DropsFeeModel = artifacts.require("DropsFeeModel");
const DropsERC721 = artifacts.require("DropsERC721");
const DropsERC1155 = artifacts.require("DropsERC1155");
const DODODropsProxy = artifacts.require("DODODropsProxy")
const DODODrops = artifacts.require("DODODrops");
const RandomGenerator = artifacts.require("RandomGenerator");

module.exports = async (deployer, network, accounts) => {
    let CONFIG = GetConfig(network, accounts)
    if (CONFIG == null) return;
    //Need Deploy first
    let WETHAddress = CONFIG.WETH;
    let DODOApproveProxyAddress = CONFIG.DODOApproveProxy;

    if (DODOApproveProxyAddress == "" || WETHAddress == "") return;

    let DropsFeeModelAddress = CONFIG.DropsFeeModel;
    let DropsProxyAddress = CONFIG.DropsProxy;


    let RandomGeneratorAddress = CONFIG.RandomGenerator;
    let RandomPool = CONFIG.RandomPool;

    let multiSigAddress = CONFIG.multiSigAddress;
    let defaultMaintainer = CONFIG.defaultMaintainer;

    //配置信息
    var isProb = false;
    var isReveal = false;
    var curTime = Math.floor(new Date().getTime() / 1000)
    var baseUri = "ipfs://QmTpcX9YE13EcBrU4dg8GNcKXVXTvJaH9MoQzHZYrQtdjk/"
    var name = "DROPS"
    var symbol = "DROPS"
    // var buyToken = CONFIG.DODO //DODO
    var buyToken = "0x0aDCBAE18580120667f7Ff6c6451A426B13c67B7" //USDT Rinkeby
    var sellTimeIntervals = [curTime + 60 * 60, curTime + 60 * 60 * 24 * 15, curTime + 60 * 60 * 24 * 25]
    var sellPrices = ["1000000", "5000000", "0"]
    var sellAmount = [500, 606, 0]
    var redeemTime = curTime + 60 * 60

    var probIntervals = [4, 10, 50, 100, 105]
    var tokenIdMaps = [
        [0],
        [1, 38],
        [3, 4, 5],
        [6, 7],
        [19, 30, 35, 40]
    ]
    
    var tokenIdList = []
    // for (var i = 1; i <= 300; i++) {
    //     tokenIdList.push(i);
    // }

    if (deploySwitch.Drops_V2) {
        logger.log("====================================================");
        logger.log("network type: " + network);
        logger.log("Deploy time: " + new Date().toLocaleString());
        logger.log("Deploy type: Drops_V2");

        if (DropsFeeModelAddress == "") {
            await deployer.deploy(DropsFeeModel);
            DropsFeeModelAddress = DropsFeeModel.address;
            logger.log("DropsFeeModelAddress: ", DropsFeeModelAddress);
            const DropsFeeModelInstance = await DropsFeeModel.at(DropsFeeModelAddress);
            var tx = await DropsFeeModelInstance.initOwner(multiSigAddress);
            logger.log("Init DropsFeeModel Tx:", tx.tx);
        }

        if (!isReveal) {
            if (RandomGeneratorAddress == "") {
                await deployer.deploy(RandomGenerator, RandomPool);
                RandomGeneratorAddress = RandomGenerator.address;
                logger.log("RandomGeneratorAddress: ", RandomGeneratorAddress);
            }
        } else {
            RandomGeneratorAddress = "0x0000000000000000000000000000000000000000"
        }

        var nftContractAddress = "";
        if (isProb) {
            await deployer.deploy(DropsERC1155);
            DropsERC1155Address = DropsERC1155.address;
            logger.log("DropsERC1155Address: ", DropsERC1155Address);
            const DropsERC1155Instance = await DropsERC1155.at(DropsERC1155Address);
            var tx = await DropsERC1155Instance.init(multiSigAddress, baseUri);
            logger.log("Init DropsERC1155 Tx:", tx.tx);
            nftContractAddress = DropsERC1155Address;
        } else {
            await deployer.deploy(DropsERC721);
            DropsERC721Address = DropsERC721.address;
            logger.log("DropsERC721Address: ", DropsERC721Address);
            const DropsERC721Instance = await DropsERC721.at(DropsERC721Address);
            var tx = await DropsERC721Instance.init(multiSigAddress, name, symbol, baseUri);
            logger.log("Init DropsERC721 Tx:", tx.tx);
            nftContractAddress = DropsERC721Address;
        }

        if (DropsProxyAddress == "") {
            await deployer.deploy(
                DODODropsProxy,
                DODOApproveProxyAddress
            );
            DropsProxyAddress = DODODropsProxy.address;
            logger.log("DropsProxyAddress: ", DropsProxyAddress);
        }

        await deployer.deploy(DODODrops);
        DODODropsAddress = DODODrops.address;
        logger.log("DODODropsAddress: ", DODODropsAddress);

        //drops init
        var addrList = [
            multiSigAddress,
            buyToken,
            DropsFeeModelAddress,
            defaultMaintainer,
            RandomGeneratorAddress,
            nftContractAddress
        ]

        const DODODropsInstance = await DODODrops.at(DODODropsAddress);
        var tx = await DODODropsInstance.init(
            addrList,
            sellTimeIntervals,
            sellPrices,
            sellAmount,
            redeemTime,
            isReveal,
            isProb
        );
        logger.log("Init DODODrops Tx:", tx.tx);


        if (network == 'kovan' || network == 'rinkeby') {

            const DODOApproveProxyInstance = await DODOApproveProxy.at(DODOApproveProxyAddress);
            var tx = await DODOApproveProxyInstance.unlockAddProxy(DropsProxyAddress);
            logger.log("DODOApproveProxy unlockAddProxy tx: ", tx.tx);

            tx = await DODOApproveProxyInstance.addDODOProxy();
            logger.log("DODOApproveProxy addDODOProxy tx: ", tx.tx);


            if (isProb) {
                const DropsERC1155Instance = await DropsERC1155.at(DropsERC1155Address);
                var tx = await DropsERC1155Instance.addMintAccount(DODODropsAddress);
                logger.log("AddMinter DropsERC1155 Tx:", tx.tx);

                await DODODropsInstance.setProbInfo(probIntervals, tokenIdMaps);

            } else {
                const DropsERC721Instance = await DropsERC721.at(DropsERC721Address);
                var tx = await DropsERC721Instance.addMintAccount(DODODropsAddress);
                logger.log("AddMinter DropsERC721 Tx:", tx.tx);
                for (var i = 1; i <= 300; i++) {
                    tokenIdList.push(i);
                }
                await DODODropsInstance.addFixedAmountInfo(tokenIdList);
                tokenIdList = []
                for (var i = 301; i <= 600; i++) {
                    tokenIdList.push(i);
                }
                await DODODropsInstance.addFixedAmountInfo(tokenIdList);
                tokenIdList = []
                for (var i = 601; i <= 900; i++) {
                    tokenIdList.push(i);
                }
                await DODODropsInstance.addFixedAmountInfo(tokenIdList);
                tokenIdList = []
                for (var i = 901; i <= 1106; i++) {
                    tokenIdList.push(i);
                }
                await DODODropsInstance.addFixedAmountInfo(tokenIdList);
            }
        }
    }
};
