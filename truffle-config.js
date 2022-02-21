/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * truffleframework.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like @truffle/hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */

var HDWalletProvider = require("@truffle/hdwallet-provider");
const NonceTrackerSubprovider = require('web3-provider-engine/subproviders/nonce-tracker')
var privKey = process.env.privKey;
var infuraId = process.env.infuraId;

// const fs = require('fs');
// const mnemonic = fs.readFileSync(".secret").toString().trim();
require("ts-node/register"); // eslint-disable-line
require("dotenv-flow").config(); // eslint-disable-line

module.exports = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a development blockchain for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */
  deploySwitch: {
    DEPLOY_V1:      false,
    DEPLOY_V2:      false,
    ERC20V3Factory: true,
    MOCK_TOKEN:     false,
    MOCK_V2_POOL:   false,
    vDODOToken:     false,
    DODORecharge:   false,
    MINE:           false,
    FEERATEIMPL:    false,
    WETH:           false,
    DODO:           false,
    UpCP:           false,
    DVM:            false,
    CP:             false,
    CPFactory:      false,
    MultiCall:      false,
    DSP:            false,
    LockedVault:    false,
    MULTIHOP:       false,
    CpProxy:        false,
    ERC20V2Factory: false,
    DEPLOY_NFT:     false,
    COLLECTIONS:    false,
    MYSTERYBOX_V1:  false,
    Drops_V2:       false,
    MineV3:         false,
    NFT_POOL:       false
  },

  networks: {
    // Useful for testing. The `development` name is special - truffle uses it by default
    // if it's defined here and no other network is specified at the command line.
    // You should run a client (like ganache-cli, geth or parity) in a separate terminal
    // tab if you use this network and you must also set the `host`, `port` and `network_id`
    // options below to some value.
    //
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: 5777,
      gas: 1000000000,
      gasPrice: 1,
    },

    kovan: {
      networkCheckTimeout: 100000,
      provider: function () {
        return new HDWalletProvider(privKey, "https://kovan.infura.io/v3/" + infuraId);
      },
      gas: 12000000,
      gasPrice: 10000000000,
      network_id: 42,
      skipDryRun: true
    },

    rinkeby: {
      networkCheckTimeout: 100000,
      provider: function () {
        return new HDWalletProvider(privKey, "https://rinkeby.infura.io/v3/" + infuraId);
        // return new HDWalletProvider(privKey, "https://eth-rinkeby.dodoex.io");
      },
      gas: 10000000,
      gasPrice: 1500000000,
      network_id: 4,
      skipDryRun: true
    },

    live: {
      networkCheckTimeout: 100000,
      provider: function () {
        return new HDWalletProvider(privKey, "https://mainnet.infura.io/v3/" + infuraId);
      },
      gas: 4000000,
      gasPrice: 60000000000,
      network_id: 1,
      skipDryRun: true
    },

    bsclive: {
      provider: function () {
        return new HDWalletProvider(privKey, "https://bsc-dataseed1.binance.org");
      },
      network_id: 56,
      confirmations: 10,
      gasPrice: 5000000000,
      timeoutBlocks: 200,
      gasPrice: 6000000000,
      skipDryRun: true
    },

    heco: {
      networkCheckTimeout: 100000,
      provider: function () {
        return new HDWalletProvider(privKey, "https://http-mainnet.hecochain.com");
      },
      gasPrice: 3000000000,
      network_id: 128
    },

    moonriver: {
      provider: () => {
        return new HDWalletProvider(privKey, 'https://rpc.moonriver.moonbeam.network');
      },
      gasPrice: 2000000000,
      network_id: 1285
    },

    avax: {
      provider: () => {
        return new HDWalletProvider(privKey, 'https://api.avax.network/ext/bc/C/rpc');
      },
      gasPrice: 30000000000,
      network_id: 43114
    },

    aurora: {
      networkCheckTimeout: 100000,
      provider: () => {
        let hdWalletProvider = new HDWalletProvider(privKey, 'https://mainnet.aurora.dev');
        hdWalletProvider.engine.addProvider(new NonceTrackerSubprovider())
        return hdWalletProvider
      },
      network_id: 0x4e454152,
      gas: 10000000,
      gasPrice: 30000000,
    },

    ok: {
      networkCheckTimeout: 100000,
      provider: () => {
        return new HDWalletProvider(privKey, 'https://exchainrpc.okex.org')
      },
      gasPrice: 500000000,
      network_id: 66,
      confirmations: 5,
      timeoutBlocks: 200,
      skipDryRun: true
    },

    boba: {
      networkCheckTimeout: 100000,
      provider: () => {
        return new HDWalletProvider({
          privateKeys: [privKey],
          providerOrUrl: 'https://mainnet.boba.network',
          chainId: 288
        })
      },
      network_id: 288,
      gasPrice: 1000000000,
      timeoutBlocks: 200,
      skipDryRun: true
    },

    neon_test: {
      networkCheckTimeout: 100000,
      provider: () => {
        return new HDWalletProvider(privKey, 'https://proxy.testnet.neonlabs.org/solana')
      },
      network_id: 111,
      gasPrice: 0
    },

    arb: {
      networkCheckTimeout: 100000,
      provider: function () {
        return new HDWalletProvider(privKey, "https://arb1.arbitrum.io/rpc")
      },
      network_id: '42161',
      gas: 2000000,
      gasPrice: 1000000000,
      skipDryRun: true
    },

    matic: {
      networkCheckTimeout: 1000000,
      provider: () => {
        return new HDWalletProvider(privKey, 'https://polygon-mainnet.infura.io/v3/' + infuraId)
      },
      network_id: 137,
      gas: 6000000,
      gasPrice: 35000000000,
      // confirmations: 2,
      // timeoutBlocks: 200,
      skipDryRun: true
    },

    coverage: {
      host: "127.0.0.1",
      port: 6545,
      network_id: 1002,
      gas: 0xfffffffffff,
      gasPrice: 1,
    },
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    timeout: false,
  },
  plugins: ["solidity-coverage"],
  // Configure your compilers
  compilers: {
    solc: {
      version: "0.6.9", // Fetch exact version from solc-bin (default: truffle's version)
      settings: {
        // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200,
        },
        evmVersion: "istanbul"
      },
    },
  },
};