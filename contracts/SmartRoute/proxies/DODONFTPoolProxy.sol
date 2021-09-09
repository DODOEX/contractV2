/*
    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0
*/

pragma solidity 0.6.9;

import {SafeMath} from "../../lib/SafeMath.sol";
import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {ICloneFactory} from "../../lib/CloneFactory.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";
import {IFilterAdmin} from "../../NFTPool/intf/IFilterAdmin.sol";
import {IERC721} from "../../intf/IERC721.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";

interface IFilter01 {
    function init(
        address filterAdmin,
        address nftCollection,
        bool[] memory switches,
        uint256[] memory tokenRanges,
        uint256[] memory nftAmounts,
        uint256[] memory priceRules,
        uint256[] memory spreadIds
    ) external;
}

contract DODONFTPoolProxy is ReentrancyGuard, InitializableOwnable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Storage ============
    address constant _ETH_ADDRESS_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    mapping(uint256 => address) public _FILTER_TEMPLATES_;
    address public _FILTER_ADMIN_TEMPLATE_;
    address public _DEFAULT_MAINTAINER_;
    address public _NFT_POOL_FEE_MODEL_;
    address public immutable _CLONE_FACTORY_;


    // ============ Event ==============
    event SetFilterTemplate(uint256 idx, address filterTemplate);

    constructor(
        address cloneFactory,
        address filterAdminTemplate,
        address nftPoolFeeModel,
        address defaultMaintainer
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _FILTER_ADMIN_TEMPLATE_ = filterAdminTemplate;
        _NFT_POOL_FEE_MODEL_ = nftPoolFeeModel;
        _DEFAULT_MAINTAINER_ = defaultMaintainer;
    }

    function createNewNFTPool01(
        string memory name,
        string memory symbol,
        uint256 fee,
        address nftCollection,
        bool[] memory switches,
        uint256[] memory tokenRanges,
        uint256[] memory nftAmounts,
        uint256[] memory priceRules,
        uint256[] memory spreadIds
    ) external returns(address newFilterAdmin) {
        newFilterAdmin = ICloneFactory(_CLONE_FACTORY_).clone(_FILTER_ADMIN_TEMPLATE_);

        address filter01 = createFilter01(
            newFilterAdmin,
            nftCollection,
            switches,
            tokenRanges,
            nftAmounts,
            priceRules,
            spreadIds
        );

        address[] memory filters = new address[](1);
        filters[0] = filter01;
        
        IFilterAdmin(newFilterAdmin).init(
            msg.sender, 
            name,
            symbol,
            fee,
            _NFT_POOL_FEE_MODEL_,
            _DEFAULT_MAINTAINER_,
            filters
        );
    }

    function createFilter01(
        address filterAdmin,
        address nftCollection,
        bool[] memory switches,
        uint256[] memory tokenRanges,
        uint256[] memory nftAmounts,
        uint256[] memory priceRules,
        uint256[] memory spreadIds
    ) public returns(address newFilter01) {
        newFilter01 = ICloneFactory(_CLONE_FACTORY_).clone(_FILTER_TEMPLATES_[1]);
        IFilter01(newFilter01).init(filterAdmin, nftCollection, switches, tokenRanges, nftAmounts, priceRules, spreadIds);
    }

    function erc721ToErc20(
        address filterAdmin,
        address filter,
        address nftContract,
        uint256 tokenId,
        address toToken,
        address dodoApprove,
        address dodoProxy,
        bytes memory dodoSwapData
    ) 
        external
        preventReentrant
    {
        IERC721(nftContract).safeTransferFrom(msg.sender, address(this), tokenId);
        IERC721(nftContract).approve(filter, tokenId);

        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = tokenId;

        //TODO:
        uint256 mintAmount = IFilterAdmin(filterAdmin).ERC721In(filter, nftContract, tokenIds, 0);

        _generalApproveMax(filterAdmin, dodoApprove, mintAmount);

        (bool success, ) = dodoProxy.call(dodoSwapData);
        require(success, "API_SWAP_FAILED");

        uint256 returnAmount = _generalBalanceOf(toToken, address(this));

        _generalTransfer(toToken, msg.sender, returnAmount);
    }
    

    //====================== Ownable ========================
    function changeDefaultMaintainer(address newMaintainer) external onlyOwner {
        _DEFAULT_MAINTAINER_ = newMaintainer;
    }

    function changeFilterAdminTemplate(address newFilterAdminTemplate) external onlyOwner {
        _FILTER_ADMIN_TEMPLATE_ = newFilterAdminTemplate;
    }

    function changeNftPoolFeeModel(address newNftPoolFeeModel) external onlyOwner {
        _NFT_POOL_FEE_MODEL_ = newNftPoolFeeModel;
    }

    function setFilterTemplate(uint256 idx, address newFilterTemplate) external onlyOwner {
        _FILTER_TEMPLATES_[idx] = newFilterTemplate;
        emit SetFilterTemplate(idx, newFilterTemplate);
    }


    //======================= Internal =====================
    function _generalApproveMax(
        address token,
        address to,
        uint256 amount
    ) internal {
        uint256 allowance = IERC20(token).allowance(address(this), to);
        if (allowance < amount) {
            if (allowance > 0) {
                IERC20(token).safeApprove(to, 0);
            }
            IERC20(token).safeApprove(to, uint256(-1));
        }
    }

    function _generalBalanceOf(
        address token, 
        address who
    ) internal view returns (uint256) {
        if (token == _ETH_ADDRESS_) {
            return who.balance;
        } else {
            return IERC20(token).balanceOf(who);
        }
    }

    function _generalTransfer(
        address token,
        address payable to,
        uint256 amount
    ) internal {
        if (amount > 0) {
            if (token == _ETH_ADDRESS_) {
                to.transfer(amount);
            } else {
                IERC20(token).safeTransfer(to, amount);
            }
        }
    }
}