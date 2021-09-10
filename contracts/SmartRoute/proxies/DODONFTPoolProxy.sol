/*
    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0
*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {SafeMath} from "../../lib/SafeMath.sol";
import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";
import {ICloneFactory} from "../../lib/CloneFactory.sol";
import {ReentrancyGuard} from "../../lib/ReentrancyGuard.sol";
import {IFilter} from "../../NFTPool/intf/IFilter.sol";
import {IFilterAdmin} from "../../NFTPool/intf/IFilterAdmin.sol";
import {IDODONFTApprove} from "../../intf/IDODONFTApprove.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";

interface IFilterV1 {
    function init(
        address filterAdmin,
        address nftCollection,
        bool[] memory toggles,
        uint256[] memory numParams,
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
    address public _MAINTAINER_;
    address public _CONTROLLER_;
    address public immutable _CLONE_FACTORY_;
    address public immutable _DODO_NFT_APPROVE_;
    address public immutable _DODO_APPROVE_;


    // ============ Event ==============
    event SetFilterTemplate(uint256 idx, address filterTemplate);

    constructor(
        address cloneFactory,
        address filterAdminTemplate,
        address controllerModel,
        address defaultMaintainer,
        address dodoNftApprove,
        address dodoApprove
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _FILTER_ADMIN_TEMPLATE_ = filterAdminTemplate;
        _CONTROLLER_ = controllerModel;
        _MAINTAINER_ = defaultMaintainer;
        _DODO_NFT_APPROVE_ = dodoNftApprove;
        _DODO_APPROVE_ = dodoApprove;
    }

    // ================ ERC721 In and Out ===================
    function erc721In(
        address filter,
        address nftCollection,
        uint256[] memory tokenIds,
        address to,
        uint256 minMintAmount
    ) external {
        for(uint256 i = 0; i < tokenIds.length; i++) {
            require(IFilter(filter).isNFTValid(nftCollection,tokenIds[i]), "NOT_REGISTRIED");
            IDODONFTApprove(_DODO_NFT_APPROVE_).claimERC721(nftCollection, msg.sender, filter, tokenIds[i]);
        }
        uint256 received = IFilter(filter).ERC721In(tokenIds, to);
        require(received >= minMintAmount, "MINT_AMOUNT_NOT_ENOUGH");
    }

    function erc721TargetOut(
        address filter,
        uint256[] memory indexes,
        address to,
        uint256 maxBurnAmount 
    ) external {
        uint256 paid = IFilter(filter).ERC721TargetOut(indexes, to);
        require(paid <= maxBurnAmount, "BURN_AMOUNT_EXCEED");
    }

    function erc721RandomOut(
        address filter,
        uint256 amount,
        address to,
        uint256 maxBurnAmount 
    ) external {
        uint256 paid = IFilter(filter).ERC721RandomOut(amount, to);
        require(paid <= maxBurnAmount, "BURN_AMOUNT_EXCEED");
    }

    // ================== ERC1155 In and Out ===================
    function erc1155In(
        address filter,
        address nftCollection,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        address to,
        uint256 minMintAmount
    ) external {
        for(uint256 i = 0; i < tokenIds.length; i++) {
            require(IFilter(filter).isNFTValid(nftCollection,tokenIds[i]), "NOT_REGISTRIED");
        }
        IDODONFTApprove(_DODO_NFT_APPROVE_).claimERC1155Batch(nftCollection, msg.sender, filter, tokenIds, amounts);
        uint256 received = IFilter(filter).ERC1155In(tokenIds, to);
        require(received >= minMintAmount, "MINT_AMOUNT_NOT_ENOUGH");
    }

    function erc1155TargetOut(
        address filter,
        uint256[] memory indexes,
        uint256[] memory amounts,
        address to,
        uint256 maxBurnAmount 
    ) external {
        uint256 paid = IFilter(filter).ERC1155TargetOut(indexes, amounts, to);
        require(paid <= maxBurnAmount, "BURN_AMOUNT_EXCEED");
    }

    function erc1155RandomOut(
        address filter,
        uint256 amount,
        address to,
        uint256 maxBurnAmount 
    ) external {
        uint256 paid = IFilter(filter).ERC1155RandomOut(amount, to);
        require(paid <= maxBurnAmount, "BURN_AMOUNT_EXCEED");
    }


    // ================== Create NFTPool ===================
    function createNewNFTPoolV1(
        address nftCollection,
        uint256 filterKey, //1 => FilterERC721V1, 2 => FilterERC1155V1
        string[] memory tokenInfo, 
        uint256[] memory numParams,//0 - initSupply, 1 - fee
        bool[] memory toggles,
        uint256[] memory filterNumParams, //0 - startId, 1 - endId, 2 - maxAmount, 3 - minAmount
        uint256[] memory priceRules,
        uint256[] memory spreadIds
    ) external returns(address newFilterAdmin) {
        newFilterAdmin = ICloneFactory(_CLONE_FACTORY_).clone(_FILTER_ADMIN_TEMPLATE_);

        address filterV1 = createFilterV1(
            filterKey,
            newFilterAdmin,
            nftCollection,
            toggles,
            filterNumParams,
            priceRules,
            spreadIds
        );

        address[] memory filters = new address[](1);
        filters[0] = filterV1;
        
        IFilterAdmin(newFilterAdmin).init(
            msg.sender, 
            numParams[0],
            tokenInfo[0],
            tokenInfo[1],
            numParams[1],
            _CONTROLLER_,
            _MAINTAINER_,
            filters
        );
    }

    // ================== Create Filter ===================
    function createFilterV1(
        uint256 key,
        address filterAdmin,
        address nftCollection,
        bool[] memory toggles,
        uint256[] memory numParams, //0 - startId, 1 - endId, 2 - maxAmount, 3 - minAmount
        uint256[] memory priceRules,
        uint256[] memory spreadIds
    ) public returns(address newFilterV1) {
        newFilterV1 = ICloneFactory(_CLONE_FACTORY_).clone(_FILTER_TEMPLATES_[key]);
        IFilterV1(newFilterV1).init(
            filterAdmin,
            nftCollection,
            toggles,
            numParams,
            priceRules,
            spreadIds
        );
    }


    // ================== NFT ERC20 Swap ======================
    function erc721ToErc20(
        address filterAdmin,
        address filter,
        address nftContract,
        uint256 tokenId,
        address toToken,
        address dodoProxy,
        bytes memory dodoSwapData
    ) 
        external
        preventReentrant
    {
        IDODONFTApprove(_DODO_NFT_APPROVE_).claimERC721(nftContract, msg.sender, filter, tokenId);

        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = tokenId;

        uint256 receivedFragAmount = IFilter(filter).ERC721In(tokenIds, address(this));

        _generalApproveMax(filterAdmin, _DODO_APPROVE_, receivedFragAmount);

        (bool success, ) = dodoProxy.call(dodoSwapData);
        require(success, "API_SWAP_FAILED");

        uint256 returnAmount = _generalBalanceOf(toToken, address(this));

        _generalTransfer(toToken, msg.sender, returnAmount);
    }
    

    //====================== Ownable ========================
    function changeMaintainer(address newMaintainer) external onlyOwner {
        _MAINTAINER_ = newMaintainer;
    }

    function changeFilterAdminTemplate(address newFilterAdminTemplate) external onlyOwner {
        _FILTER_ADMIN_TEMPLATE_ = newFilterAdminTemplate;
    }

    function changeController(address newControllerModel) external onlyOwner {
        _CONTROLLER_ = newControllerModel;
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