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

    // ============ Storage ============
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
}