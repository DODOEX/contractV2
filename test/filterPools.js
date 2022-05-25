var Web3 = require('web3');
const { parseFixed, formatFixed } = require('@ethersproject/bignumber')
const tokenAbi = require('../build/contracts/InitializableERC20.json').abi;
const dvmFactoryAbi = require('../build/contracts/DVMFactory.json').abi;
const dspFactoryAbi = require('../build/contracts/DSPFactory.json').abi;

//BSC
// var web3 = new Web3(new Web3.providers.HttpProvider("https://bsc-dataseed1.binance.org"));
// var dvmFactoryAddress = "0x790B4A80Fb1094589A3c0eFC8740aA9b0C1733fB"
// var dspFactoryAddress = "0x0fb9815938Ad069Bf90E14FE6C596c514BEDe767"

//Polygon
var web3 = new Web3(new Web3.providers.HttpProvider("https://bsc-dataseed4.ninicoin.io/"));
var dvmFactoryAddress = "0x790B4A80Fb1094589A3c0eFC8740aA9b0C1733fB"
var dspFactoryAddress = "0x0fb9815938Ad069Bf90E14FE6C596c514BEDe767"

filterMain();

async function filterMain() {
    var baseToken = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
    var quoteToken = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"
    var baseTokenDecimals = 18;
    var quoteTokenDecimals = 18;
    var baseTokenInstance = new web3.eth.Contract(tokenAbi,baseToken)
    var quoteTokenInstance = new web3.eth.Contract(tokenAbi,quoteToken)

    var dvmFactoryInstance = new web3.eth.Contract(dvmFactoryAbi, dvmFactoryAddress);
    var dspFactoryInstance = new web3.eth.Contract(dspFactoryAbi, dspFactoryAddress);

    var dvmPoolBy = await dvmFactoryInstance.methods.getDODOPoolBidirection(baseToken, quoteToken).call(); //getDODOPoolBidirection
    var dspPoolBy = await dspFactoryInstance.methods.getDODOPoolBidirection(baseToken, quoteToken).call();

    console.log(dvmPoolBy)
    console.log("========= DVM " + (dvmPoolBy[0].length+dvmPoolBy[1].length) + " =========");

    var dvmPools = dvmPoolBy[0]
    for (var i = 0; i < dvmPools.length; i++) {

        var baseBalance = await baseTokenInstance.methods.balanceOf(dvmPools[i]).call()
        var quoteBalance = await quoteTokenInstance.methods.balanceOf(dvmPools[i]).call()

        console.log("pool:" + dvmPools[i] + " baseBalance:" + formatFixed(baseBalance,baseTokenDecimals) + " quoteBalance:" + formatFixed(quoteBalance,quoteTokenDecimals));
    }

    dvmPools = dvmPoolBy[1]
    for (var i = 0; i < dvmPools.length; i++) {

        var baseBalance = await baseTokenInstance.methods.balanceOf(dvmPools[i]).call()
        var quoteBalance = await quoteTokenInstance.methods.balanceOf(dvmPools[i]).call()

        console.log("pool:" + dvmPools[i] + " baseBalance:" + formatFixed(baseBalance,baseTokenDecimals) + " quoteBalance:" + formatFixed(quoteBalance,quoteTokenDecimals));
    }

    console.log("========= DSP " + (dspPoolBy[0].length+dspPoolBy[1].length) + " =========");

    var dspPools = dspPoolBy[0]
    for (var i = 0; i < dspPools.length; i++) {

        var baseBalance = await baseTokenInstance.methods.balanceOf(dspPools[i]).call()
        var quoteBalance = await quoteTokenInstance.methods.balanceOf(dspPools[i]).call()

        console.log("pool:" + dspPools[i] + " baseBalance:" + formatFixed(baseBalance, baseTokenDecimals) + " quoteBalance:" + formatFixed(quoteBalance, quoteTokenDecimals));
    }

    dspPools = dspPoolBy[1]
    for (var i = 0; i < dspPools.length; i++) {

        var baseBalance = await baseTokenInstance.methods.balanceOf(dspPools[i]).call()
        var quoteBalance = await quoteTokenInstance.methods.balanceOf(dspPools[i]).call()

        console.log("pool:" + dspPools[i] + " baseBalance:" + formatFixed(baseBalance, baseTokenDecimals) + " quoteBalance:" + formatFixed(quoteBalance, quoteTokenDecimals));
    }
}

//BSC

// base: 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56  (BUSD)
// quote: 0x55d398326f99059fF775485246999027B3197955 (USDT)
// pools: 0x012eFA4c5edC7494255763a05Cf728d278D83351

// baseToken: 0x55d398326f99059fF775485246999027B3197955   (USDT)
// quoteToken：0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d  (USDC)
// pool: 0x3Eaad4BDF38DBE6B6344E9fa77f589c81e0b0b71

// baseToken: 0xe9e7cea3dedca5984780bafc599bd69add087d56   (BUSD)
// quoteToken: 0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d  (USDC)
// pool: 0xcC889cA75f1BDba3D380E4f0a74811f13D6C1abe

// base: 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c     (WBNB)
// quote：0xe9e7cea3dedca5984780bafc599bd69add087d56    (BUSD)
// pools: 0x0F36544D0B1A107B98EdFabB1d95538C316C1DcD

// base: 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c    (WBNB)
// quote: 0x55d398326f99059fF775485246999027B3197955   (USDT)
// pools: 0x0d7eAb35B8Df6a894dd92c802dBFA898C4B91E38   


// base: 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c    (WBNB)
// quote: 0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d   (USDC)
// pools: 