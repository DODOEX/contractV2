/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {SafeMath} from "../lib/SafeMath.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";
import {IDVM} from "../DODOVendingMachine/intf/IDVM.sol";
import {IERC20} from "../intf/IERC20.sol";
import {InitializableMintableERC20} from "../external/ERC20/InitializableMintableERC20.sol";


//TODO?：why mintable
contract Fragment is InitializableMintableERC20 {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Storage ============
    
    bool public _IS_BUYOUT_;
    uint256 public _BUYOUT_TIMESTAMP_;
    uint256 public _BUYOUT_PRICE_;

    address public _COLLATERAL_VAULT_;
    address public _QUOTE_;
    address public _DVM_;

    function init(
      address owner, 
      address dvm, 
      address collateralVault, 
      uint256 supply, 
      uint256 ownerRatio,
      uint256 buyoutTimestamp
    ) external {
        // init local variables
        initOwner(owner);
        _DVM_ = dvm;
        _COLLATERAL_VAULT_ = collateralVault;
        _QUOTE_ = IDVM(_DVM_)._QUOTE_TOKEN_();
        _BUYOUT_TIMESTAMP_ = buyoutTimestamp;

        // init FRAG meta data
        string memory suffix = "FRAG_";
        name = string(abi.encodePacked(suffix, IDVM(_DVM_).addressToShortString(_COLLATERAL_VAULT_)));
        symbol = "FRAG";
        decimals = 18;

        // init FRAG distribution
        totalSupply = supply;
        balances[owner] = DecimalMath.mulFloor(supply, ownerRatio);
        balances[dvm] = supply.sub(balances[owner]);
        emit Transfer(address(0), owner, balances[owner]);
        emit Transfer(address(0), dvm, balances[dvm]);

        // init DVM liquidity
        IDVM(_DVM_).buyShares(address(this));
    }

    //需要先转入QUOTE
    function buyout() external {
      require(!_IS_BUYOUT_, "ALREADY BUYOUT");
      _IS_BUYOUT_ = true;
      _BUYOUT_PRICE_ = IDVM(_DVM_).getMidPrice();
      uint256 requireQuote = DecimalMath.mulCeil(_BUYOUT_PRICE_, totalSupply);
      require(IERC20(_QUOTE_).balanceOf(address(this))>=requireQuote, "QUOTE NOT ENOUGH");

      IDVM(_DVM_).sellShares(
        IERC20(_DVM_).balanceOf(address(this)),
        address(this),
        0,
        0,
        "",
        uint256(-1)
      );

      uint256 ownerQuote = DecimalMath.mulFloor(_BUYOUT_PRICE_, balances[address(this)]);
      _clearSelfBalance();

      IERC20(_QUOTE_).safeTransfer(_OWNER_, ownerQuote);
    }

    // buyout之后的恒定兑换，需要先转入FRAG
    function redeem(address to) external {
      require(_IS_BUYOUT_, "NEED BUYOUT");

      IERC20(_QUOTE_).safeTransfer(to, DecimalMath.mulFloor(_BUYOUT_PRICE_, balances[address(this)]));
      _clearSelfBalance();
    }

    function getBuyoutRequirement() external view returns (uint256 requireQuote){
      require(!_IS_BUYOUT_, "ALREADY BUYOUT");
      uint256 price = IDVM(_DVM_).getMidPrice();
      requireQuote = DecimalMath.mulCeil(price, totalSupply);
    }

    function _clearSelfBalance() internal {
      emit Transfer(address(this), address(0), balances[address(this)]);
      balances[address(this)] = 0;
    }
}
