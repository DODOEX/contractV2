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
const BaseDrops = artifacts.require("BaseDrops");
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
    var isReveal = true;
    var curTime = Math.floor(new Date().getTime() / 1000)
    var baseUri = ""
    var name = "DROPS"
    var symbol = "DROPS"
    var buyToken = "0x854b0f89BAa9101e49Bfb357A38071C9db5d0DFa" //Kovan DODO
    var sellTimeIntervals = [curTime + 60 * 10, curTime + 60 * 60, curTime + 60 * 120]
    var sellPrices = ["1000000000000000000", "2000000000000000000", "0"]
    var sellAmount = [30, 30, 0]
    var redeemTime = curTime + 60 * 10
    var probIntervals = [4, 10, 50, 100, 105]
    var tokenIdMaps = [
        [0],
        [1, 38],
        [3, 4, 5],
        [6, 7],
        [19, 30, 35, 40]
    ]
    var tokenIdList = [1, 2, 3, 4, 5, 6, 7, 8]

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

        await deployer.deploy(BaseDrops);
        BaseDropsAddress = BaseDrops.address;
        logger.log("BaseDropsAddress: ", BaseDropsAddress);

        //drops init
        var addrList = [
            multiSigAddress,
            buyToken,
            DropsFeeModelAddress,
            defaultMaintainer,
            RandomGeneratorAddress,
            nftContractAddress
        ]

        const BaseDropsInstance = await BaseDrops.at(BaseDropsAddress);
        var tx = await BaseDropsInstance.init(
            addrList,
            sellTimeIntervals,
            sellPrices,
            sellAmount,
            redeemTime,
            isReveal,
            isProb
        );
        logger.log("Init BaseDrops Tx:", tx.tx);


        if (network == 'kovan') {

            const DODOApproveProxyInstance = await DODOApproveProxy.at(DODOApproveProxyAddress);
            var tx = await DODOApproveProxyInstance.unlockAddProxy(DropsProxyAddress);
            logger.log("DODOApproveProxy unlockAddProxy tx: ", tx.tx);

            tx = await DODOApproveProxyInstance.addDODOProxy();
            logger.log("DODOApproveProxy addDODOProxy tx: ", tx.tx);


            if (isProb) {
                const DropsERC1155Instance = await DropsERC1155.at(DropsERC1155Address);
                var tx = await DropsERC1155Instance.addMintAccount(DropsProxyAddress);
                logger.log("AddMinter DropsERC1155 Tx:", tx.tx);

                await BaseDropsInstance.setProbInfo(probIntervals, tokenIdMaps);

            } else {
                const DropsERC721Instance = await DropsERC721.at(DropsERC721Address);
                var tx = await DropsERC721Instance.addMintAccount(DropsProxyAddress);
                logger.log("AddMinter DropsERC721 Tx:", tx.tx);
                
                await BaseDropsInstance.setFixedAmountInfo(tokenIdList);
            }
        }
    }
};
