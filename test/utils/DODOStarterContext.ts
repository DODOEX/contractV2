/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

import BigNumber from 'bignumber.js';
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';

import * as contracts from './Contracts';
import { decimalStr, mweiStr, MAX_UINT256 } from './Converter';
import { EVM, getDefaultWeb3 } from './EVM';
import * as log from './Log';

BigNumber.config({
    EXPONENTIAL_AT: 1000,
    DECIMAL_PLACES: 80,
});

export interface DODOStarterContextInitConfig {
    // time config
    bidDuration: BigNumber;
    calmDuration: BigNumber;
    tokenVestingDuration: BigNumber;
    fundVestingDuration: BigNumber;
    lpVestingDuration: BigNumber;
    // value config
    lowerPrice: string;
    upperPrice: string;
    tokenCliffRate: string;
    fundCliffRate: string;
    lpCliffRate: string;
    initialLiquidity: string;
}

export class DODOStarterContext {
    EVM: EVM;
    Web3: Web3;

    //contract
    DODOStarterFactory: Contract;
    FairFunding: Contract;
    InstantFunding: Contract;

    //account
    Deployer: string;
    Maintainer: string;
    SpareAccounts: string[];

    //token
    SellToken: Contract;
    FundToken: Contract;

    async init(config: DODOStarterContextInitConfig) {
        this.EVM = new EVM();
        this.Web3 = getDefaultWeb3();

        const allAccounts = await this.Web3.eth.getAccounts();
        this.Deployer = allAccounts[0];
        this.Maintainer = allAccounts[1];
        this.SpareAccounts = allAccounts.slice(2, 10);

        this.SellToken = await contracts.newContract(
            contracts.MINTABLE_ERC20_CONTRACT_NAME,
            ["SellToken", "DODO", 18]
        );

        this.FundToken = await contracts.newContract(
            contracts.MINTABLE_ERC20_CONTRACT_NAME,
            ["FundToken", "USDT", 18]
        );

        let cloneFactory = await contracts.newContract(
            contracts.CLONE_FACTORY_CONTRACT_NAME
        );

        let fairFundingTemplate = await contracts.newContract(
            contracts.FAIR_FUNDING
        )

        let instantFundingTemplate = await contracts.newContract(
            contracts.INSTANT_FUNDING
        )

        this.DODOStarterFactory = await contracts.newContract(contracts.DODO_STARTER_FACTORY,
            [
                cloneFactory.options.address,
                fairFundingTemplate.options.address,
                instantFundingTemplate.options.address
            ]
        )

        await this.DODOStarterFactory.methods.initOwner(this.Deployer).send(this.sendParam(this.Deployer));
        
        await this.SellToken.methods.mint(this.Deployer, decimalStr("10000")).send(this.sendParam(this.Deployer));
        await this.SellToken.methods.approve(this.DODOStarterFactory.options.address, decimalStr("10000")).send(this.sendParam(this.Deployer));
        
        let starttime = (await this.Web3.eth.getBlock(await this.Web3.eth.getBlockNumber())).timestamp;

        await this.DODOStarterFactory.methods.createFairFund(
            [
                this.Deployer,
                this.SellToken.options.address,
                this.FundToken.options.address,
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
            ],
            [
                starttime,
                config.bidDuration,
                config.calmDuration,
                new BigNumber(starttime).plus(config.bidDuration).plus(config.calmDuration).plus(1),
                config.tokenVestingDuration,
                new BigNumber(starttime).plus(config.bidDuration).plus(config.calmDuration).plus(1),
                config.fundVestingDuration,
                new BigNumber(starttime).plus(config.bidDuration).plus(config.calmDuration).plus(1),
                config.lpVestingDuration,
            ],
            [
                config.lowerPrice,
                config.upperPrice,
                config.tokenCliffRate,
                config.fundCliffRate,
                config.lpCliffRate,
                config.initialLiquidity,
            ],
            decimalStr("10000"),
            true,
        ).send(this.sendParam(this.Deployer, "0.2"))

        let fairPools = await this.DODOStarterFactory.methods.getFairFundPools(
            this.SellToken.options.address,
            this.FundToken.options.address
        ).call();

        console.log(`fair fund pools: ${JSON.stringify(fairPools)}`)

        let fairPool = fairPools.slice(-1)[0];
    
        this.FairFunding = await contracts.getContractWithAddress(contracts.FAIR_FUNDING, fairPool);
        
        console.log('start createing instant fund......')
        await this.SellToken.methods.mint(this.Deployer, decimalStr("10000")).send(this.sendParam(this.Deployer));
        await this.SellToken.methods.approve(this.DODOStarterFactory.options.address, decimalStr("10000")).send(this.sendParam(this.Deployer));
        let starttime2 = (await this.Web3.eth.getBlock(await this.Web3.eth.getBlockNumber())).timestamp;
        await this.DODOStarterFactory.methods.createInstantFund(
            [
                this.Deployer,
                this.SellToken.options.address,
                this.FundToken.options.address,
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
            ],
            [
                starttime2,
                config.bidDuration,
                new BigNumber(starttime2).plus(config.bidDuration).plus(config.calmDuration).plus(1),
                config.tokenVestingDuration,
                new BigNumber(starttime2).plus(config.bidDuration).plus(config.calmDuration).plus(1),
                config.fundVestingDuration,
                new BigNumber(starttime2).plus(config.bidDuration).plus(config.calmDuration).plus(1),
                config.lpVestingDuration,
            ],
            [
                decimalStr("10"),
                decimalStr("1"),
                config.tokenCliffRate,
                config.fundCliffRate,
                config.lpCliffRate,
                config.initialLiquidity,
            ],
            decimalStr("10000"), 
        ).send(this.sendParam(this.Deployer))

        console.log(`finish creating instant pools`)

        let instantPools = await this.DODOStarterFactory.methods.getInstantFundPools(
            this.SellToken.options.address,
            this.FundToken.options.address
        ).call();

        console.log(`instant fund pools: ${JSON.stringify(instantPools)}`)

        let instantPool = instantPools.slice(-1)[0];
    
        this.InstantFunding = await contracts.getContractWithAddress(contracts.INSTANT_FUNDING, instantPool);

        console.log(log.blueText("[Init DODOStarter context]"));
    }

    sendParam(sender, value = "0") {
        return {
            from: sender,
            gas: process.env["COVERAGE"] ? 10000000000 : 7000000,
            gasPrice: mweiStr("1000"),
            value: decimalStr(value),
        };
    }

    async mintTestToken(to: string, token: Contract, amount: string) {
        await token.methods.mint(to, amount).send(this.sendParam(this.Deployer));
    }

    async approveProxy(account: string, target: string, token: Contract) {
        await token.methods
            .approve(target, MAX_UINT256)
            .send(this.sendParam(account));
    }
}