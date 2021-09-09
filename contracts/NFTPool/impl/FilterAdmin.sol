/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableInternalMintableERC20} from "../../external/ERC20/InitializableInternalMintableERC20.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {IFilterModel} from "../intf/IFilterModel.sol";
import {IControllerModel} from "../intf/IControllerModel.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";

contract FilterAdmin is InitializableInternalMintableERC20, ReentrancyGuard {
    using SafeMath for uint256;

    // ============ Storage ============
    address[] public _FILTER_REGISTRY_;
    uint256 public _FEE_;
    address public _CONTROLLER_MODEL_;
    address public _DEFAULT_MAINTAINER_;

    // ============ Event ============
    event ChangeFee(uint256 fee);

    function init(
        address _owner,
        string memory _name,
        string memory _symbol,
        uint256 fee,
        address controllerModel,
        address defaultMaintainer,
        address[] memory filters
    ) external {
        super.init(_owner, 0, _name, _symbol, 18);
        _FILTER_REGISTRY_ = filters;
        _FEE_ = fee;
        _CONTROLLER_MODEL_ = controllerModel;
        _DEFAULT_MAINTAINER_ = defaultMaintainer;
    }

    function chargeMint(address user, uint256 totalMintAmount) external {
        require(isIncludeFilter(msg.sender), "FILTER_NOT_REGISTRIED");

        (uint256 poolFeeAmount, uint256 mtFeeAmount) = getMintFee(user, totalMintAmount);
        if(poolFeeAmount > 0) _mint(_OWNER_, poolFeeAmount);
        if(mtFeeAmount > 0) _mint(_DEFAULT_MAINTAINER_, mtFeeAmount);
        
        _mint(user, totalMintAmount.sub(poolFeeAmount).sub(mtFeeAmount)); 
    }

    function chargeRandomBurn(address user, uint256 totalBurnAmount) external {
        require(isIncludeFilter(msg.sender), "FILTER_NOT_REGISTRIED");

        (uint256 poolFeeAmount, uint256 mtFeeAmount) = getRandomBurnFee(user, totalBurnAmount);
        if(poolFeeAmount > 0) _mint(_OWNER_, poolFeeAmount);
        if(mtFeeAmount > 0) _mint(_DEFAULT_MAINTAINER_, mtFeeAmount);

        _burn(user, totalBurnAmount);
    }

    function chargeTargetBurn(address user, uint256 totalBurnAmount) external {
        require(isIncludeFilter(msg.sender), "FILTER_NOT_REGISTRIED");

        (uint256 poolFeeAmount, uint256 mtFeeAmount) = getTargetBurnFee(user, totalBurnAmount);
        if(poolFeeAmount > 0) _mint(_OWNER_, poolFeeAmount);
        if(mtFeeAmount > 0) _mint(_DEFAULT_MAINTAINER_, mtFeeAmount);

        _burn(user, totalBurnAmount);
    }

    //================ View ================
    function getMintFee(address user, uint256 totalMintAmount) public returns (uint256 poolFeeAmount, uint256 mtFeeAmount) {
        uint256 mtFeeRate = IControllerModel(_CONTROLLER_MODEL_).getNFTInFee(address(this), user);
        poolFeeAmount = DecimalMath.mulFloor(totalMintAmount, _FEE_);
        mtFeeAmount = DecimalMath.mulFloor(totalMintAmount, mtFeeRate);
    }

    function getRandomBurnFee(address user, uint256 totalBurnAmount) public returns (uint256 poolFeeAmount, uint256 mtFeeAmount) {
        uint256 mtFeeRate = IControllerModel(_CONTROLLER_MODEL_).getNFTRandomOutFee(address(this), user);
        poolFeeAmount = DecimalMath.mulFloor(totalBurnAmount, _FEE_);
        mtFeeAmount = DecimalMath.mulFloor(totalBurnAmount, mtFeeRate);
    }

    function getTargetBurnFee(address user, uint256 totalBurnAmount) public returns (uint256 poolFeeAmount, uint256 mtFeeAmount) {
        uint256 mtFeeRate = IControllerModel(_CONTROLLER_MODEL_).getNFTTargetOutFee(address(this), user);
        poolFeeAmount = DecimalMath.mulFloor(totalBurnAmount, _FEE_);
        mtFeeAmount = DecimalMath.mulFloor(totalBurnAmount, mtFeeRate);
    }

    function isIncludeFilter(address filter) view public returns (bool) {
        uint256 i = 0;
        for(; i < _FILTER_REGISTRY_.length; i++) {
            if(filter == _FILTER_REGISTRY_[i]) break;
        }
        return i == _FILTER_REGISTRY_.length ? false : true;
    }

    function getFilters() view public returns (address[] memory) {
        return _FILTER_REGISTRY_;
    }

    function version() virtual external pure returns (string memory) {
        return "FADMIN 1.0.0";
    }

    //================= Owner ================
    function addFilter(address filter) external onlyOwner {
        require(!isIncludeFilter(filter), "FILTER_NOT_INCLUDE");
        _FILTER_REGISTRY_.push(filter);
    }

    function changeFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1e18, "FEE_TOO_LARGE");
        _FEE_ = newFee;
        emit ChangeFee(newFee);
    }
}
