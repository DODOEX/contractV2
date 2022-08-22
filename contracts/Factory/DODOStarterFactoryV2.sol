/*

    Copyright 2022 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableOwnable} from "../lib/InitializableOwnable.sol";
import {ICloneFactory} from "../lib/CloneFactory.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {IERC20} from "../intf/IERC20.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";
import {IDODOStarter} from "../DODOStarter/intf/IDODOStarter.sol";

/**
 * @title DODOStarterFactory
 * @author DODO Breeder
 *
 * @notice Create And Register DODOStarter Pools 
 */
contract DODOStarterFactoryV2 is InitializableOwnable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Templates ============

    address public immutable _CLONE_FACTORY_;
    address public _FAIR_FUND_TEMPLATE_;
    address public _INSTANT_FUND_TEMPLATE_;

    mapping(address => address) fundingWhitelist;

    // ============ Registry ============
    // baseToken -> fundToken ->  fair Pool list
    mapping(address => mapping(address => address[])) public _FAIR_REGISTRY_;
    // baseToken -> fundToken ->  Instant Pool list
    mapping(address => mapping(address => address[])) public _INSTANT_REGISTRY_;

    // ============ Events ============
    event NewFairFund(
        address baseToken,
        address fundToken,
        address creator,
        address fairFundPool
    );

    event NewInstantFund(
        address baseToken,
        address fundToken,
        address creator,
        address instantFundPool
    );

    event SetWhitelist(address creator, address baseToken);
    event UpdateFairFundTempalte(address newTemplate);
    event UpdateInstantFundTempalte(address newTemplate);

    // ============ modifiers ===========

    modifier permissionCheck(address creator, address baseToken) {
        require(fundingWhitelist[creator] == baseToken || msg.sender == _OWNER_, "NO_PERMISSION");
        _;
    }

    constructor(
        address cloneFactory,
        address fairFundTemplate,
        address instantFundTemplate
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _FAIR_FUND_TEMPLATE_ = fairFundTemplate;
        _INSTANT_FUND_TEMPLATE_ = instantFundTemplate;
    }

    // ============ Functions ============
    function createFairFund(
        address[] memory addressList,
        uint256[] memory timeLine,
        uint256[] memory valueList,
        bool isOverCapStop
    ) external permissionCheck(addressList[0],addressList[1]) returns(address newFairFundPool){
        newFairFundPool = ICloneFactory(_CLONE_FACTORY_).clone(_FAIR_FUND_TEMPLATE_);

        IDODOStarter(newFairFundPool).init(
            addressList,
            timeLine,
            valueList,
            isOverCapStop
        );

        _FAIR_REGISTRY_[addressList[1]][addressList[2]].push(newFairFundPool);

        emit NewFairFund(addressList[1], addressList[2], addressList[0], newFairFundPool);
    }

    function createInstantFund(
        address[] memory addressList,
        uint256[] memory timeLine,
        uint256[] memory valueList
    ) external permissionCheck(addressList[0],addressList[1]) returns(address newInstantFundPool){
        newInstantFundPool = ICloneFactory(_CLONE_FACTORY_).clone(_INSTANT_FUND_TEMPLATE_);

        IDODOStarter(newInstantFundPool).init(
            addressList,
            timeLine,
            valueList
        );

        _INSTANT_REGISTRY_[addressList[1]][addressList[2]].push(newInstantFundPool);

        emit NewInstantFund(addressList[1], addressList[2], addressList[0], newInstantFundPool);
    }

    // ============ View Functions ============

    function getFairFundPools(address baseToken, address fundToken)
        external
        view
        returns (address[] memory pools)
    {
        return _FAIR_REGISTRY_[baseToken][fundToken];
    }

    function getFairFundPoolsBidirection(address token0, address token1)
        external
        view
        returns (address[] memory baseToken0Pools, address[] memory baseToken1Pools)
    {
        return (_FAIR_REGISTRY_[token0][token1], _FAIR_REGISTRY_[token1][token0]);
    }

    function getInstantFundPools(address baseToken, address fundToken)
        external
        view
        returns (address[] memory pools)
    {
        return _INSTANT_REGISTRY_[baseToken][fundToken];
    }

    function getInstantFundPoolsBidirection(address token0, address token1)
        external
        view
        returns (address[] memory baseToken0Pools, address[] memory baseToken1Pools)
    {
        return (_INSTANT_REGISTRY_[token0][token1], _INSTANT_REGISTRY_[token1][token0]);
    }


    // ============ Owner Functions ============

    function setWhitelist(address creator, address baseToken) external onlyOwner {
        fundingWhitelist[creator] = baseToken;
        emit SetWhitelist(creator, baseToken);
    }
    
    function updateFairFundTemplate(address _newFairFundTemplate) external onlyOwner {
        _FAIR_FUND_TEMPLATE_ = _newFairFundTemplate;
        emit UpdateFairFundTempalte(_newFairFundTemplate);
    }

    function updateInstantFundTemplate(address _newInstantFundTemplate) external onlyOwner {
        _INSTANT_FUND_TEMPLATE_ = _newInstantFundTemplate;
        emit UpdateInstantFundTempalte(_newInstantFundTemplate);
    }

}
