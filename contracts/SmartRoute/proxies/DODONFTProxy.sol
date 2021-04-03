/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {IDODOApproveProxy} from "../DODOApproveProxy.sol";
import {ICloneFactory} from "../../lib/CloneFactory.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {IWETH} from "../../intf/IWETH.sol";
import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {ICollateralVault} from "../../CollateralVault/intf/ICollateralVault.sol";
import {IDODOV2} from "../intf/IDODOV2.sol";
import {IFragment} from "../../GeneralizedFragment/intf/IFragment.sol";
import {IFeeDistributor} from "../../intf/IFeeDistributor.sol";
import {IDODONFTRegistry} from "../../Factory/Registries/DODONFTRegistry.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";


/**
 * @title DODONFTProxy
 * @author DODO Breeder
 *
 * @notice Entrance of NFT in DODO platform
 */
contract DODONFTProxy is ReentrancyGuard, InitializableOwnable {
    using SafeMath for uint256;


    // ============ Storage ============

    address constant _ETH_ADDRESS_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public immutable _WETH_;
    address public immutable _DODO_APPROVE_PROXY_;
    address public immutable _CLONE_FACTORY_;
    address public immutable _DVM_FACTORY_;
    address public immutable _NFT_REGISTY_;

    address public _VAULT_TEMPLATE_;
    address public _FRAG_TEMPLATE_;
    address public _FEE_TEMPLATE_;

    // ============ Events ============
    event ChangeVaultTemplate(address newVaultTemplate);
    event ChangeFragTemplate(address newFragTemplate);
    event ChangeFeeTemplate(address newFeeTemplate);
    event CreateNFTCollateralVault(address creator, address vault);
    event CreateFragment(address vault, address fragment, address dvm, address feeDistributor);
    event Buyout(address from, address fragment, uint256 amount);
    event Stake(address from, address feeDistributor, uint256 amount);


    fallback() external payable {}

    receive() external payable {}

    constructor(
        address cloneFactory,
        address payable weth,
        address dodoApproveProxy,
        address dvmFactory,
        address vaultTemplate,
        address fragTemplate,
        address feeTemplate,
        address nftRegistry
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _WETH_ = weth;
        _DODO_APPROVE_PROXY_ = dodoApproveProxy;
        _DVM_FACTORY_ = dvmFactory;
        _VAULT_TEMPLATE_ = vaultTemplate;
        _FRAG_TEMPLATE_ = fragTemplate;
        _FEE_TEMPLATE_ = feeTemplate;
        _NFT_REGISTY_ = nftRegistry;
    }

    function createNFTCollateralVault(string memory name) external returns (address newVault) {
        newVault = ICloneFactory(_CLONE_FACTORY_).clone(_VAULT_TEMPLATE_);
        ICollateralVault(newVault).init(msg.sender, name);
        emit CreateNFTCollateralVault(msg.sender, newVault);
    }

    function createFragment(
        address quoteToken,
        address collateralVault,
        address vaultPreOwner,
        address stakeToken,
        uint256[] calldata dvmParams, //0 - lpFeeRate, 1 - I, 2 - K
        uint256[] calldata fragParams, //0 - totalSupply, 1 - ownerRatio, 2 - buyoutTimestamp
        bool isOpenBuyout
    ) external returns (address newFragment, address newDvm, address newFeeDistributor) {
        require(msg.sender == collateralVault, "NEED_BE_CALLED_BY_VAULT");

        newFragment = ICloneFactory(_CLONE_FACTORY_).clone(_FRAG_TEMPLATE_);
        address _quoteToken = quoteToken == _ETH_ADDRESS_ ? _WETH_ : quoteToken;
        
        {
        uint256[] memory  _dvmParams = dvmParams;
        uint256[] memory  _fragParams = fragParams;
        
        newDvm = IDODOV2(_DVM_FACTORY_).createDODOVendingMachine(
            newFragment,
            _quoteToken,
            _dvmParams[0],
            _dvmParams[1],
            _dvmParams[2],
            false
        );

        IFragment(newFragment).init(
            newDvm, 
            vaultPreOwner, 
            msg.sender, 
            _fragParams[0], 
            _fragParams[1], 
            _fragParams[2], 
            isOpenBuyout
        );
        }

        ICollateralVault(msg.sender).directTransferOwnership(newFragment);
        
        
        if(stakeToken == address(0)) {
            newFeeDistributor = address(0);
        } else {
            newFeeDistributor = ICloneFactory(_CLONE_FACTORY_).clone(_FEE_TEMPLATE_);
            IFeeDistributor(newFeeDistributor).init(newFragment, _quoteToken, stakeToken);
        }

        IDODONFTRegistry(_NFT_REGISTY_).addRegistry(msg.sender, newFragment, newFeeDistributor, newDvm);

        emit CreateFragment(msg.sender, newFragment, newDvm, newFeeDistributor);
    }

    function buyout(
        address fragment,
        uint256 quoteAmount,
        uint8 flag // 0 - ERC20, 1 - quoteInETH
    ) external payable preventReentrant {
        _deposit(msg.sender, fragment, IFragment(fragment)._QUOTE_(), quoteAmount, flag == 1);
        IFragment(fragment).buyout(msg.sender);
        emit Buyout(msg.sender, fragment, quoteAmount);
    }

    function stakeToFeeDistributor(
        address feeDistributor,
        uint256 stakeAmount,
        uint8 flag // 0 - ERC20, 1 - ETH
    ) external payable preventReentrant {
        _deposit(msg.sender, feeDistributor, IFeeDistributor(feeDistributor)._STAKE_TOKEN_(), stakeAmount, flag == 1);
        IFeeDistributor(feeDistributor).stake(msg.sender);
        emit Stake(msg.sender, feeDistributor, stakeAmount);
    }

    //============= Owner ===================
    function updateVaultTemplate(address newVaultTemplate) external onlyOwner {
        _VAULT_TEMPLATE_ = newVaultTemplate;
        emit ChangeVaultTemplate(newVaultTemplate);
    }

    function updateFragTemplate(address newFragTemplate) external onlyOwner {
        _FRAG_TEMPLATE_ = newFragTemplate;
        emit ChangeFragTemplate(newFragTemplate);
    }

    function updateFeeTemplate(address newFeeTemplate) external onlyOwner {
        _FEE_TEMPLATE_ = newFeeTemplate;
        emit ChangeFeeTemplate(newFeeTemplate);
    }


    function _deposit(
        address from,
        address to,
        address token,
        uint256 amount,
        bool isETH
    ) internal {
        if (isETH) {
            if (amount > 0) {
                IWETH(_WETH_).deposit{value: amount}();
                if (to != address(this)) SafeERC20.safeTransfer(IERC20(_WETH_), to, amount);
            }
        } else {
            IDODOApproveProxy(_DODO_APPROVE_PROXY_).claimTokens(token, from, to, amount);
        }
    }
}
