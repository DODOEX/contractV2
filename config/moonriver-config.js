module.exports = {
    MOONRIVER_CONFIG: {
        //TOKEN
        WETH: "0xf50225a84382c74CbdeA10b0c176f71fc3DE0C4d",
        CHI: "0x0000000000000000000000000000000000000000",
        DODO: "",

        //Helper
        //MultiCall: "0x2ff2CeE6E9359F9eA1cF2f51d18bF9F2045447E4",
        //DODOSwapCalcHelper: "0xA45b1105d21dFd3915EaDF1b5523196B458C7614",
        //DODOZoo: "0x02fCB21dc1cf221939C1d4277fB54016b5d32bC7",
        //DODO: "0xB5397B2210f49e96a5EB2c9747Aa2bD9397d90C0",
        //ERC20Helper: "0x6373ceB657C83C91088d328622573FB766064Ac4",
        DODOSellHelper: "0x5e84190a270333aCe5B9202a3F4ceBf11b81bB01",
        DODOCalleeHelper: "0xc4436fBAE6eBa5d95bf7d53Ae515F8A707Bd402A", // replace weth need to redeploy
        DODOV1PmmHelper: "0x3CD6D7F5fF977bf8069548eA1F9441b061162b42",
        DODOV2RouteHelper: "0x8a6998b9A4E4f63c8aDB46ceEB01857A956A8122",
        CurveSample: "",

        //Template
        CloneFactory: "0xDfaf9584F5d229A9DBE5978523317820A8897C5A",
        FeeRateModel: "0x2BBD66fC4898242BDBD2583BBe1d76E8b8f71445",
        //FeeRateDIP3: "0xbef0C8Cd420b76e9d31509abbfd7f8C9f664527c",
        FeeRateImpl: "",
        UserQuota: "",
        PermissionManager: "0x729f7f44bf64Ce814716b6261e267DbE6cdf021c",
        DVM: "0xC3BeD579CaB3EC29B22D9AB99F4E586af42496b9",
        DPP: "0x6fdDB76c93299D985f4d3FC7ac468F9A168577A4",
        DSP: "0x0672952Fab6BD1336C57AE09E49DB6D3e78B1896",
        DPPAdmin: "0x041ABa00c57Dd47abC37A2931dF569a2A2cc57Be",
        CP: "0x72d220cE168C4f361dD4deE5D826a01AD8598f6C",
        //ERC20MineV2: "0xD734a08359296e44b87F4d404135cd0832A7a363",
        ERC20MineV3: "0x4599ed18F34cFE06820E3684bF0aACB8D75c644d",

        ERC20: "0x80930Cb1849F7D42531506fF45E66724338A821b",
        CustomERC20: "0x914Dcc2760b93e912180978C2B6330562AA4e7c9",
        CustomMintableERC20: "0xf2a87022CE8D672969873C3baFd2281122b2EA93",


        //Factory
        DVMFactory: "0x738Ebf387A0CE0eb46b0eF8Fa5DEa2EaE6B1Df51",
        DPPFactory: "0xd0e1aA51dF0896c126Ce6F8A064E551e0DD3D39b",
        DSPFactory: "0xB76de21f04F677f07D9881174a1D8E624276314C",
        UpCpFactory: "0x043957f7554275b90c5178872faE851dcfC1089D",
        CrowdPoolingFactory: "0x0596908263Ef2724fBfBcAfA1c983FCD7a629038",
        ERC20V2Factory: "0xaeB5CF31b97dce6134e416129845e01106fFB177",
        ERC20V3Factory: "0x1518e34156F12049b387620a7778685bf4d0D61B",
        //DODOMineV2Factory: "0xe71C0660CEC20F74CcB243d6c33AFC12419e8f41",
        DODOMineV3Registry: "0x5515363c0412AdD5c72d3E302fE1bD7dCBCF93Fe",

        //Approve
        DODOApprove: "0xE8C9A78725D0451FA19878D5f8A3dC0D55FECF25",
        DODOApproveProxy: "0x7737fd30535c69545deeEa54AB8Dd590ccaEBD3c",

        //Adapter
        DODOV1Adapter: "0x40672211D4310ad71daDc8cDE7Aa3Fb90d420855",
        DODOV2Adapter: "0xbe9a66e49503e84ae59a4d0545365AABedf33b40",
        UniAdapter: "0xa356867fDCEa8e71AEaF87805808803806231FdC",
        CurveAdapter: "",

        //Proxy
        DODOV2Proxy: "0xd9deC7c3C06e62a4c1BeEB07CadF568f496b14c2",
        DSPProxy: "0x9f015aa5557ffBb47850c045Df67Bf229B07f2eA",
        CpProxy: "0x357c5E9cfA8B834EDcef7C7aAbD8F9Db09119d11",
        DPPProxy: "0xB8605027F9a29D6a68eC489561c9a7ec9180aECC", //添加至ApproveProxy 等待时间锁
        RouteProxy: "0x0125Cd41312F72a0774112Ca639D65A2C02e3627",        
        DODOMineV3Proxy: "0xb159260989012fA98af560A3Fa6D9cd11a64cf6E",

        //Account
        multiSigAddress: "0xef49a6DBa1C8DF859E49c17E9A485B439c7689d3",
        defaultMaintainer: "0xef49a6DBa1C8DF859E49c17E9A485B439c7689d3",


        //================== NFT ====================
        BuyoutModel: "",
        Fragment: "",
        NFTCollateralVault: "",
        DODONFTRouteHelper: "",

        InitializableERC721: "",
        InitializableERC1155: "",
        NFTTokenFactory: "",

        DodoNftErc721: "",
        DodoNftErc1155: "",

        DODONFTRegistry: "",
        DODONFTProxy: "",
    }
}