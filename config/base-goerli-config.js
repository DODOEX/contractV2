module.exports = {
    BASE_GOERLI_CONFIG: {
        //TOKEN
        WETH: "0x4200000000000000000000000000000000000006",
        CHI: "",
        DODO: "",

        //Helper
        DODOSellHelper: "0x193d1EBBaa3f84F9266030C2B2B2b24632d15D24",
        DODOCalleeHelper: "0x24077ac88473B06578A1C58171648861006B85dE",
        DODOV1PmmHelper: "0xebB06e8873612547e6630ded8Afa1bBAD5c0561E",
        DODOV2RouteHelper: "0xe315f83b8124c5BfA6837899035B5dD004197981",
        ERC20Helper: "0xa3d53e4f816810c00cA6a3Bc44504B84814628A9",
        DODOSwapCalcHelper: "0xf78bFEF2D57fb82e9d6669Fb0f62Ea542d566211",
        MultiCall: "0x7139BC95D1fA30895eC78C308c1Da671e6527A9b",
        CurveSample: "",

        //Template
        CloneFactory: "0x33354BCa7ed4ADbFB3135955DC6555c3e6E610B4",
        FeeRateModel: "0x13F4f108B4905dcC1facd102BE03a24d707b590f",
        FeeRateImpl: "",
        FeeRateDIP3Impl: "0xB4c6f461608205CA12E5b31E453956023B0e66DD",
        UserQuota: "0x6bcAc16cC11A9b90203909e50a9bBb4a818fcd0A",
        PermissionManager: "0x1e9270357b85AF9DD933244D4F3C05C2067980b2",
        DVM: "0xcDCfBD90C4848951cf157C25edcA8D0eD17eEc33",
        DPP: "0x40B8B0F8435294EB2A599e8a8FBeCB38628F06F4",
        DSP: "0xE1ef2d33708dc0679f7686193CB86897FC137f7a",
        DPPAdmin: "0xda3ED08a2E124637C24308898BE2CA28516C0f3c",
        DPPAdvanced: "0x21798A2eF0e081C125f115871F6b95FaCC40014b", //todo ERROR
        DPPAdvancedAdmin: "0xb3ED2A724f1EE0AE13f9a306484Fb3A1d359C0Df",
        // CP: "0xc37cfd4DdFA000D3Fc2D5fadF4D63B70530192D1",                   //TODO NO Need
        ERC20MineV2: "0xb832B4aDcC65b954e95108BB04BB496415cebA3a",
        ERC20MineV3: "0x306a559D7b7ac117efFa7e4d62E5cE05264f1e79",
        ERC20: "0x5e0297F3A3627816BD4e5454Af0b57F960be224c",
        CustomERC20: "0xc8B7116f1f3369BA004437D8d975c904f862a035",
        CustomMintableERC20: "0x8ab09236e8B7a45eA119F3F808C63d157B2f64CF",

        //Factory
        DVMFactory: "0x888C189EC28dce10c60A404A21f22662Ba8134dd",
        DPPFactory: "0x2851406143e4158Dabc82Bda6498E12C81B93525",
        DSPFactory: "0xD842D8A0Fc25A87F5bB43F9123B70D481b185A47",
        UpCpFactory: "",
        // CrowdPoolingFactory: "0x7B22dDD46fBc8b5518EcF2f5Cfe381cd6c130AdB", //TODO NO Need
        ERC20Factory: "",
        ERC20V2Factory: "0x4E4f8d8742822AF3B0E61cF6B2725Ff64515ce84",
        ERC20V3Factory: "0xcC1ddBe8654bb807106550903e5B910AA8782578",  //todo ERROR
        DODOMineV2Factory: "0x45e5ad761f929d9097DEdd191278B360b6Ab9ca9",
        DODOMineV3Registry: "0xFF57A5CBf6279d68A301d46E72347772bfC844FD",

        //Approve
        DODOApprove: "0xF2171268dD2581C55DEeb4Ed3489b726E79Ef0F5",
        DODOApproveProxy: "0xF68D5B437638990B82BF8B7a4B9204eC87Eb0760",

        //Periphery
        DODOIncentive: "",

        //Adpater
        DODOV1Adapter: "0xbB1eB7E5C1d8c645734DbBeBC904da56d1A8E014",
        DODOV2Adapter: "0x8D329f2E4AE130216D5Da19779D6199907aDeF2F",
        UniAdapter: "0xC6402c27F4cFc5d5C4674d0412ab15a0779226B1",
        CurveAdapter: "",

        //Proxy
        DODOV2Proxy: "0x0EDf30fffa1D584F1077CFdaE9c499c3E45501c1",
        DSPProxy: "0x14558924B756b6eeC200e2201732a5b150f9b534",
        CpProxy: "0xEA654e8501a9208716300D62060b20908D2236C4",
        DPPProxy: "0xfE49e5F0AEf3639dA48c1dC297C84C2a68c81B8A",
        RouteProxy: "0x8f3430AC47639B5ae2454c7d3bE2a4272eF7ADfd",
        DODOMineV3Proxy: "0xe0096b3Dc84f4cca520638F7F4be84A560798C3f",

        //vDODO
        DODOCirculationHelper: "",
        Governance: "",
        dodoTeam: "",
        vDODOToken: "",

        //Account
        multiSigAddress: "0xFA3f686392288a7055E1d9319d042eDa4B8C41F9",
        defaultMaintainer: "0xFA3f686392288a7055E1d9319d042eDa4B8C41F9",

        //================== NFT ====================
        BuyoutModel: "",
        Fragment: "",
        NFTCollateralVault: "",
        DODONFTRouteHelper: "",

        DodoNftErc721: "",
        DodoNftErc1155: "",

        DODONFTRegistry: "",
        DODONFTProxy: "",

        //=================== NFTPool ==================
        DODONFTApprove: "",
        DODONFTPoolProxy: "",
        FilterAdmin: "",
        FilterERC721V1: "",
        FilterERC1155V1: "",
        NFTPoolController: ""
    }
}