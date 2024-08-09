/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {InitializableOwnable} from "../lib/InitializableOwnable.sol";
import {ICloneFactory} from "../lib/CloneFactory.sol";

interface IGSP {
    function init(
        address maintainer,
        address admin,
        address baseTokenAddress,
        address quoteTokenAddress,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 i,
        uint256 k,
        bool isOpenTWAP
    ) external;

    function _BASE_TOKEN_() external view returns (address);

    function _QUOTE_TOKEN_() external view returns (address);

    function _I_() external view returns (uint256);

    function _MT_FEE_RATE_MODEL_() external view returns (address); // Useless, just for compatibility

    function getVaultReserve() external view returns (uint256 baseReserve, uint256 quoteReserve);

    function getUserFeeRate(address user) external view returns (uint256 lpFeeRate, uint256 mtFeeRate);

    function getMtFeeTotal() external view returns (uint256 mtFeeBase, uint256 mtFeeQuote);

    function sellBase(address to) external returns (uint256);

    function sellQuote(address to) external returns (uint256);

    function buyShares(address to) external returns (uint256 shares, uint256 baseInput, uint256 quoteInput);

    function sellShares(uint256 shareAmount, address to, uint256 baseMinAmount, uint256 quoteMinAmount, bytes calldata data, uint256 deadline) external returns (uint256 baseAmount, uint256 quoteAmount);
}

interface IGSPFactory {
    function createDODOGasSavingPool(
        address admin,
        address baseToken,
        address quoteToken,
        uint256 lpFeeRate,
        uint256 i,
        uint256 k,
        bool isOpenTWAP
    ) external returns (address newGasSavingPool);
}

/**
 * @title DODO GasSavingPool Factory
 * @author DODO Breeder
 *
 * @notice Create And Register GSP Pools
 */
contract GSPFactory is InitializableOwnable {
    // ============ Templates ============

    address public immutable _CLONE_FACTORY_;
    address public _DEFAULT_MAINTAINER_;
    address public _GSP_TEMPLATE_;

    // ============ Registry ============

    // base -> quote -> GSP address list
    mapping(address => mapping(address => address[])) public _REGISTRY_;
    // creator -> GSP address list
    mapping(address => address[]) public _USER_REGISTRY_;

    // ============ Events ============

    event NewGSP(address baseToken, address quoteToken, address creator, address GSP);

    event RemoveGSP(address GSP);

    // ============ Functions ============

    constructor(
        address cloneFactory,
        address GSPTemplate,
        address defaultMaintainer
    ) public {
        _CLONE_FACTORY_ = cloneFactory;
        _GSP_TEMPLATE_ = GSPTemplate;
        _DEFAULT_MAINTAINER_ = defaultMaintainer;
    }

    function createDODOGasSavingPool(
        address admin,
        address baseToken,
        address quoteToken,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 i,
        uint256 k,
        bool isOpenTWAP
    ) external returns (address newGasSavingPool) {
        newGasSavingPool = ICloneFactory(_CLONE_FACTORY_).clone(_GSP_TEMPLATE_);
        {
            IGSP(newGasSavingPool).init(
                _DEFAULT_MAINTAINER_,
                admin,
                baseToken,
                quoteToken,
                lpFeeRate,
                mtFeeRate,
                i,
                k,
                isOpenTWAP
            );
        }
        _REGISTRY_[baseToken][quoteToken].push(newGasSavingPool);
        _USER_REGISTRY_[tx.origin].push(newGasSavingPool);
        emit NewGSP(baseToken, quoteToken, tx.origin, newGasSavingPool);
    }

    // ============ Admin Operation Functions ============

    function updateGSPTemplate(address _newGSPTemplate) external onlyOwner {
        _GSP_TEMPLATE_ = _newGSPTemplate;
    }

    function updateDefaultMaintainer(address _newMaintainer) external onlyOwner {
        _DEFAULT_MAINTAINER_ = _newMaintainer;
    }

    function addPoolByAdmin(
        address creator,
        address baseToken,
        address quoteToken,
        address pool
    ) external onlyOwner {
        _REGISTRY_[baseToken][quoteToken].push(pool);
        _USER_REGISTRY_[creator].push(pool);
        emit NewGSP(baseToken, quoteToken, creator, pool);
    }

    function removePoolByAdmin(
        address creator,
        address baseToken,
        address quoteToken,
        address pool
    ) external onlyOwner {
        address[] memory registryList = _REGISTRY_[baseToken][quoteToken];
        for (uint256 i = 0; i < registryList.length; i++) {
            if (registryList[i] == pool) {
                registryList[i] = registryList[registryList.length - 1];
                break;
            }
        }
        _REGISTRY_[baseToken][quoteToken] = registryList;
        _REGISTRY_[baseToken][quoteToken].pop();
        address[] memory userRegistryList = _USER_REGISTRY_[creator];
        for (uint256 i = 0; i < userRegistryList.length; i++) {
            if (userRegistryList[i] == pool) {
                userRegistryList[i] = userRegistryList[userRegistryList.length - 1];
                break;
            }
        }
        _USER_REGISTRY_[creator] = userRegistryList;
        _USER_REGISTRY_[creator].pop();
        emit RemoveGSP(pool);
    }

    // ============ View Functions ============

    function getDODOPool(address baseToken, address quoteToken)
        external
        view
        returns (address[] memory machines)
    {
        return _REGISTRY_[baseToken][quoteToken];
    }

    function getDODOPoolBidirection(address token0, address token1)
        external
        view
        returns (address[] memory baseToken0Machines, address[] memory baseToken1Machines)
    {
        return (_REGISTRY_[token0][token1], _REGISTRY_[token1][token0]);
    }

    function getDODOPoolByUser(address user) external view returns (address[] memory machines) {
        return _USER_REGISTRY_[user];
    }
}