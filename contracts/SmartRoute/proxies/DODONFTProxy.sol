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
import {IDVM} from "../../DODOVendingMachine/intf/IDVM.sol";
import {IConstFeeRateModel} from "../../lib/ConstFeeRateModel.sol";
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
    address public immutable _DEFAULT_MAINTAINER_;

    address public _VAULT_TEMPLATE_;
    address public _FRAG_TEMPLATE_;
    address public _FEE_TEMPLATE_;
    address public _DVM_TEMPLATE_;
    address public _MTFEE_TEMPLATE_;

    // ============ Events ============
    event ChangeVaultTemplate(address newVaultTemplate);
    event ChangeFragTemplate(address newFragTemplate);
    event ChangeFeeTemplate(address newFeeTemplate);
    event ChangeMtFeeTemplate(address newMtFeeTemplate);
    event ChangeDvmTemplate(address newDvmTemplate);
    event CreateNFTCollateralVault(address creator, address vault, string name, string baseURI);
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
        address defaultMaintainer,
        address vaultTemplate,
        address fragTemplate,
        address feeTemplate,
        address dvmTemplate,
        address mtFeeTemplate,
        address nftRegistry
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _WETH_ = weth;
        _DODO_APPROVE_PROXY_ = dodoApproveProxy;
        _DVM_FACTORY_ = dvmFactory;
        _DEFAULT_MAINTAINER_ = defaultMaintainer;
        _VAULT_TEMPLATE_ = vaultTemplate;
        _FRAG_TEMPLATE_ = fragTemplate;
        _FEE_TEMPLATE_ = feeTemplate;
        _DVM_TEMPLATE_ = dvmTemplate;
        _MTFEE_TEMPLATE_ = mtFeeTemplate;
        _NFT_REGISTY_ = nftRegistry;
    }

    function createNFTCollateralVault(string memory name, string memory baseURI) external returns (address newVault) {
        newVault = ICloneFactory(_CLONE_FACTORY_).clone(_VAULT_TEMPLATE_);
        ICollateralVault(newVault).init(msg.sender, name, baseURI);
        emit CreateNFTCollateralVault(msg.sender, newVault, name, baseURI);
    }

    function createFragment(
        address quoteToken,
        address vaultPreOwner,
        address stakeToken,
        uint256[] calldata dvmParams, //0 - lpFeeRate, 1 - mtFeeRate 2 - I, 3 - K
        uint256[] calldata fragParams, //0 - totalSupply, 1 - ownerRatio, 2 - buyoutTimestamp
        bool isOpenTwap 
    ) external returns (address newFragment, address newDvm, address newFeeDistributor) {
        newFragment = ICloneFactory(_CLONE_FACTORY_).clone(_FRAG_TEMPLATE_);
        address _quoteToken = quoteToken == _ETH_ADDRESS_ ? _WETH_ : quoteToken;
        
        if(stakeToken == address(0)) {
            newFeeDistributor = address(0);
        } else {
            newFeeDistributor = ICloneFactory(_CLONE_FACTORY_).clone(_FEE_TEMPLATE_);
            IFeeDistributor(newFeeDistributor).init(newFragment, _quoteToken, stakeToken);
        }

        {
        uint256[] memory  _dvmParams = dvmParams;
        uint256[] memory  _fragParams = fragParams;
        
        newDvm = ICloneFactory(_CLONE_FACTORY_).clone(_DVM_TEMPLATE_);
        IDVM(newDvm).init(
            newFeeDistributor == address(0) ? _DEFAULT_MAINTAINER_ : newFeeDistributor,
            newFragment,
            _quoteToken,
            _dvmParams[0],
            _createConstantMtFeeRateModel(_dvmParams[1]),
            _dvmParams[2],
            _dvmParams[3],
            isOpenTwap
        );
        IFragment(newFragment).init(
            newDvm, 
            vaultPreOwner, 
            msg.sender, 
            _fragParams[0], 
            _fragParams[1], 
            _fragParams[2]
        );
        }

        ICollateralVault(msg.sender).directTransferOwnership(newFragment);
        
        IDODONFTRegistry(_NFT_REGISTY_).addRegistry(msg.sender, newFragment, _quoteToken, newFeeDistributor, newDvm);

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

    function updateMtFeeTemplate(address newMtFeeTemplate) external onlyOwner {
        _MTFEE_TEMPLATE_ = newMtFeeTemplate;
        emit ChangeMtFeeTemplate(newMtFeeTemplate);
    }

    function updateDvmTemplate(address newDvmTemplate) external onlyOwner {
        _DVM_TEMPLATE_ = newDvmTemplate;
        emit ChangeDvmTemplate(newDvmTemplate);
    }

    //============= Internal ================

    function _createConstantMtFeeRateModel(uint256 mtFee) internal returns (address mtFeeModel) {
        mtFeeModel = ICloneFactory(_CLONE_FACTORY_).clone(_MTFEE_TEMPLATE_);
        IConstFeeRateModel(mtFeeModel).init(mtFee);
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
