const fs = require("fs");
const file = fs.createWriteStream("../deploy-detail.txt");
let logger = new console.Console(file, file);

// const SmartApprove = artifacts.require("DODOApprove");
// const SmartSwap = artifacts.require("SmartSwap");
// const DODOSellHelper = artifacts.require("DODOSellHelper");
// const TestERC20 = artifacts.require("TestERC20");
// const NaiveOracle = artifacts.require("NaiveOracle");
// const DODOZoo = artifacts.require("DODOZoo");

const DEPLOY_ROUTE = false;
const DEPLOY_KOVAN_TOKEN = false;

module.exports = async (deployer, network, accounts) => {
  // let DODOSellHelperAddress = "";
  // let DODOZooAddress = "";
  // let WETHAddress = "";
  // let SmartApproveAddress = "";
  // if (network == "kovan") {
  //   DODOSellHelperAddress = "0xbdEae617F2616b45DCB69B287D52940a76035Fe3";
  //   DODOZooAddress = "0x92230e929a2226b29ed3441ae5524886347c60c8";
  //   WETHAddress = "0x5eca15b12d959dfcf9c71c59f8b467eb8c6efd0b";
  //   SmartApproveAddress = "0x5627b7DEb3055e1e899003FDca0716b32C382084";
  // } else if (network == "live") {
  //   DODOSellHelperAddress = "0x533da777aedce766ceae696bf90f8541a4ba80eb";
  //   DODOZooAddress = "0x3a97247df274a17c59a3bd12735ea3fcdfb49950";
  //   WETHAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
  //   SmartApproveAddress = "0xe380Ad3181A69BF92133D2feb609867c4adC61eA";
  // } else return;

  // logger.log("====================================================");
  // logger.log("network type: " + network);
  // logger.log("Deploy time: " + new Date().toLocaleString());

  // if (DEPLOY_ROUTE) {
  //   logger.log("Deploy type: Smart Route");
  //   if (SmartApproveAddress == "") {
  //     await deployer.deploy(SmartApprove);
  //     SmartApproveAddress = SmartApprove.address;
  //   }
  //   if (DODOSellHelperAddress == "") {
  //     await deployer.deploy(DODOSellHelper);
  //     DODOSellHelperAddress = DODOSellHelper.address;
  //   }
  //   logger.log("SmartApprove Address: ", SmartApproveAddress);
  //   logger.log("DODOSellHelper Address: ", DODOSellHelperAddress);
  //   await deployer.deploy(
  //     SmartSwap,
  //     SmartApproveAddress,
  //     DODOSellHelperAddress,
  //     WETHAddress
  //   );
  //   logger.log("SmartSwap Address: ", SmartSwap.address);

  //   // const SmartApproveInstance = await SmartApprove.at(SmartApproveAddress);
  //   // var tx = await SmartApproveInstance.setSmartSwap(SmartSwap.address);
  //   // logger.log("SmartApprovce setSmartSwap tx: ", tx.tx);
  // }

  // if (DEPLOY_KOVAN_TOKEN) {
  //   logger.log("Deploy type: Create Tokens and Trading Pairs");
  //   await deployer.deploy(TestERC20, "USDC", 6, "USDC");
  //   const USDCAddr = TestERC20.address;
  //   logger.log("USDC Addr: ", USDCAddr);
  //   await deployer.deploy(TestERC20, "USDT", 6, "USDT");
  //   const USDTAddr = TestERC20.address;
  //   logger.log("USDT Addr: ", USDTAddr);
  //   await deployer.deploy(TestERC20, "DODO", 18, "DODO");
  //   const DODOAddr = TestERC20.address;
  //   logger.log("DODO Addr: ", DODOAddr);
  //   await deployer.deploy(TestERC20, "WOO", 18, "WOO");
  //   const WooAddr = TestERC20.address;
  //   logger.log("WOO Addr: ", WooAddr);
  //   const WETHAddr = WETHAddress;
  //   logger.log("WETH Addr: ", WETHAddr);

  //   let config = {
  //     lpFeeRate: "2000000000000000",
  //     mtFeeRate: "1000000000000000",
  //     k: "100000000000000000",
  //     gasPriceLimit: "100000000000",
  //   };

  //   const DODOZooInstance = await DODOZoo.at(DODOZooAddress);

  //   //USDT-USDC
  //   await deployer.deploy(NaiveOracle);
  //   var USDT_USDC_Oracle = NaiveOracle.address;
  //   await DODOZooInstance.breedDODO(
  //     accounts[0],
  //     USDTAddr,
  //     USDCAddr,
  //     USDT_USDC_Oracle,
  //     config.lpFeeRate,
  //     config.mtFeeRate,
  //     config.k,
  //     config.gasPriceLimit
  //   );
  //   const USDT_USDC_Addr = await DODOZooInstance.getDODO(USDTAddr, USDCAddr);
  //   logger.log("USDT_USDC_Addr:", USDT_USDC_Addr);

  //   // DODO-USDT
  //   await deployer.deploy(NaiveOracle);
  //   var DODO_USDT_Oracle = NaiveOracle.address;
  //   await DODOZooInstance.breedDODO(
  //     accounts[0],
  //     DODOAddr,
  //     USDTAddr,
  //     DODO_USDT_Oracle,
  //     config.lpFeeRate,
  //     config.mtFeeRate,
  //     config.k,
  //     config.gasPriceLimit
  //   );
  //   const DODO_USDT_Addr = await DODOZooInstance.getDODO(DODOAddr, USDTAddr);
  //   logger.log("DODO_USDT_Addr:", DODO_USDT_Addr);

  //   // //WETH-USDC
  //   await deployer.deploy(NaiveOracle);
  //   var WETH_USDC_Oracle = NaiveOracle.address;
  //   await DODOZooInstance.breedDODO(
  //     accounts[0],
  //     WETHAddr,
  //     USDCAddr,
  //     WETH_USDC_Oracle,
  //     config.lpFeeRate,
  //     config.mtFeeRate,
  //     config.k,
  //     config.gasPriceLimit
  //   );
  //   const WETH_USDC_Addr = await DODOZooInstance.getDODO(WETHAddr, USDCAddr);
  //   logger.log("WETH_USDC_Addr:", WETH_USDC_Addr);

  //   //WOO-USDT
  //   await deployer.deploy(NaiveOracle);
  //   var WOO_USDT_Oracle = NaiveOracle.address;
  //   await DODOZooInstance.breedDODO(
  //     accounts[0],
  //     WooAddr,
  //     USDTAddr,
  //     WOO_USDT_Oracle,
  //     config.lpFeeRate,
  //     config.mtFeeRate,
  //     config.k,
  //     config.gasPriceLimit
  //   );
  //   const WOO_USDT_Addr = await DODOZooInstance.getDODO(WooAddr, USDTAddr);
  //   logger.log("WOO_USDT_Addr:", WOO_USDT_Addr);

  //   //TODO:ing enableBaseDeposit enableQuoteDeposit enableTrading
  //   //TODO:ing apporve pair to token
  //   //TODO:ing mint to lp
  //   //TODO:ing deposit to Base && quote pool
  // }
};
