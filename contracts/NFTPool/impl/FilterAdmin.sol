/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {InitializableInternalMintableERC20} from "../../external/ERC20/InitializableInternalMintableERC20.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {IControllerModel} from "../intf/IControllerModel.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";

contract FilterAdmin is InitializableInternalMintableERC20 {
    using SafeMath for uint256;

    // ============ Storage ============
    address[] public _FILTER_REGISTRY_;
    uint256 public _FEE_;
    address public _CONTROLLER_MODEL_;
    address public _DEFAULT_MAINTAINER_;

    // ============ Event ============
    event ChangeFee(uint256 fee);

    function init(
        address owner,
        uint256 initSupply,
        string memory name,
        string memory symbol,
        uint256 fee,
        address controllerModel,
        address defaultMaintainer,
        address[] memory filters
    ) external {
        super.init(owner, initSupply, name, symbol, 18);
        _FILTER_REGISTRY_ = filters;
        _FEE_ = fee;
        _CONTROLLER_MODEL_ = controllerModel;
        _DEFAULT_MAINTAINER_ = defaultMaintainer;
    }

    function mintFragTo(address to, uint256 rawAmount) external returns (uint256 received){
        require(isIncludeFilter(msg.sender), "FILTER_NOT_REGISTRIED");

        (uint256 poolFee, uint256 mtFee) = queryChargeMintFee(rawAmount);
        if(poolFee > 0) _mint(_OWNER_, poolFee);
        if(mtFee > 0) _mint(_DEFAULT_MAINTAINER_, mtFee);
        
        received = rawAmount.sub(poolFee).sub(mtFee);
        _mint(to, received); 
    }

    function burnFragFrom(address from, uint256 rawAmount) external returns (uint256 paid){
        require(isIncludeFilter(msg.sender), "FILTER_NOT_REGISTRIED");

        (uint256 poolFee, uint256 mtFee) = queryChargeBurnFee(rawAmount);
        if(poolFee > 0) _mint(_OWNER_, poolFee);
        if(mtFee > 0) _mint(_DEFAULT_MAINTAINER_, mtFee);

        paid = rawAmount.add(poolFee).add(mtFee);
        _burn(from, paid);
    }

    //================ View ================
    function queryChargeMintFee(uint256 rawAmount) public returns (uint256 poolFee, uint256 mtFee) {
        uint256 mtFeeRate = IControllerModel(_CONTROLLER_MODEL_).getMintFee(address(this));
        poolFee = DecimalMath.mulFloor(rawAmount, _FEE_);
        mtFee = DecimalMath.mulFloor(rawAmount, mtFeeRate);
    }

    function queryChargeBurnFee(uint256 rawAmount) public returns (uint256 poolFee, uint256 mtFee) {
        uint256 mtFeeRate = IControllerModel(_CONTROLLER_MODEL_).getBurnFee(address(this));
        poolFee = DecimalMath.mulFloor(rawAmount, _FEE_);
        mtFee = DecimalMath.mulFloor(rawAmount, mtFeeRate);
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
        require(newFee <= DecimalMath.ONE, "FEE_TOO_LARGE");
        _FEE_ = newFee;
        emit ChangeFee(newFee);
    }
}
