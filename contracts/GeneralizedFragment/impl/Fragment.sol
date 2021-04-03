/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {SafeMath} from "../../lib/SafeMath.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {IDVM} from "../../DODOVendingMachine/intf/IDVM.sol";
import {IDODOCallee} from "../../intf/IDODOCallee.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {InitializableERC20} from "../../external/ERC20/InitializableERC20.sol";
import {ICollateralVault} from "../../CollateralVault/intf/ICollateralVault.sol";

contract Fragment is InitializableERC20 {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Storage ============
    
    bool public _IS_BUYOUT_;
    bool public _IS_OPEN_BUYOUT_;
    uint256 public _BUYOUT_TIMESTAMP_;
    uint256 public _BUYOUT_PRICE_;

    address public _COLLATERAL_VAULT_;
    address public _VAULT_PRE_OWNER_;
    address public _QUOTE_;
    address public _DVM_;

    bool internal _FRAG_INITIALIZED_;

    function init(
      address dvm, 
      address vaultPreOwner,
      address collateralVault,
      uint256 totalSupply, 
      uint256 ownerRatio,
      uint256 buyoutTimestamp,
      bool isOpenBuyout
    ) external {
        require(!_FRAG_INITIALIZED_, "DODOFragment: ALREADY_INITIALIZED");
        _FRAG_INITIALIZED_ = true;

        // init local variables
        _DVM_ = dvm;
        _QUOTE_ = IDVM(_DVM_)._QUOTE_TOKEN_();
        _VAULT_PRE_OWNER_ = vaultPreOwner;
        _COLLATERAL_VAULT_ = collateralVault;
        _BUYOUT_TIMESTAMP_ = buyoutTimestamp;
        _IS_OPEN_BUYOUT_ = isOpenBuyout;

        // init FRAG meta data
        string memory prefix = "FRAG_";
        name = string(abi.encodePacked(prefix, IDVM(_DVM_).addressToShortString(_COLLATERAL_VAULT_)));
        symbol = "FRAG";
        decimals = 18;
        super.init(address(this), totalSupply, name, symbol, decimals);

        // init FRAG distribution
        uint256 vaultPreOwnerBalance = DecimalMath.mulFloor(totalSupply, ownerRatio);
        transfer(_VAULT_PRE_OWNER_,vaultPreOwnerBalance);
        transfer(_DVM_,totalSupply.sub(vaultPreOwnerBalance));

        // init DVM liquidity
        IDVM(_DVM_).buyShares(address(this));
    }


    function buyout(address newVaultOwner) external {
      require(_IS_OPEN_BUYOUT_, "DODOFragment: NOT_SUPPORT_BUYOUT");
      require(block.timestamp > _BUYOUT_TIMESTAMP_, "DODOFragment: BUYOUT_NOT_START");
      require(!_IS_BUYOUT_, "DODOFragment: ALREADY_BUYOUT");
      _IS_BUYOUT_ = true;
      
      _BUYOUT_PRICE_ = IDVM(_DVM_).getMidPrice();
      uint256 requireQuote = DecimalMath.mulCeil(_BUYOUT_PRICE_, totalSupply);
      require(IERC20(_QUOTE_).balanceOf(address(this)) >= requireQuote, "DODOFragment: QUOTE_NOT_ENOUGH");

      IDVM(_DVM_).sellShares(
        IERC20(_DVM_).balanceOf(address(this)),
        address(this),
        0,
        0,
        "",
        uint256(-1)
      );  

      uint256 preOwnerQuote = DecimalMath.mulFloor(_BUYOUT_PRICE_, balances[_VAULT_PRE_OWNER_]);
      IERC20(_QUOTE_).safeTransfer(_VAULT_PRE_OWNER_, preOwnerQuote);
      _clearBalance(_VAULT_PRE_OWNER_);

      uint256 newOwnerQuote = DecimalMath.mulFloor(_BUYOUT_PRICE_, balances[newVaultOwner]);
      IERC20(_QUOTE_).safeTransfer(newVaultOwner, newOwnerQuote);
      _clearBalance(newVaultOwner);

      ICollateralVault(_COLLATERAL_VAULT_).directTransferOwnership(newVaultOwner);
    }


    function redeem(address to, bytes calldata data) external {
      require(_IS_BUYOUT_, "DODOFragment: NEED_BUYOUT");

      uint256 quoteAmount = DecimalMath.mulFloor(_BUYOUT_PRICE_, balances[msg.sender]);
      IERC20(_QUOTE_).safeTransfer(to, quoteAmount);
      _clearBalance(msg.sender);

      if (data.length > 0) {
        IDODOCallee(to).NFTRedeemCall(
          msg.sender,
          quoteAmount,
          data
        );
      }
    }

    function getBuyoutRequirement() external view returns (uint256 requireQuote){
      require(_IS_OPEN_BUYOUT_, "NOT SUPPORT BUYOUT");
      require(!_IS_BUYOUT_, "ALREADY BUYOUT");
      uint256 price = IDVM(_DVM_).getMidPrice();
      requireQuote = DecimalMath.mulCeil(price, totalSupply);
    }

    function _clearBalance(address account) internal {
      uint256 clearBalance = balances[account];
      balances[account] = 0;
      balances[address(0)] = clearBalance;
      emit Transfer(account, address(0), clearBalance);
    }
}
