/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {Ownable} from "./lib/Ownable.sol";
import {IDODO} from "./intf/IDODO.sol";
import {ICloneFactory} from "./helper/CloneFactory.sol";


/**
 * @title DODOZoo
 * @author DODO Breeder
 *
 * @notice Register of All DODO
 */
contract DODOZoo is Ownable {
    address public _DODO_LOGIC_;
    address public _CLONE_FACTORY_;

    address public _DEFAULT_SUPERVISOR_;

    mapping(address => mapping(address => address)) internal _DODO_REGISTER_;
    address[] public _DODOs;

    // ============ Events ============

    event DODOBirth(address newBorn, address baseToken, address quoteToken);

    // ============ Constructor Function ============

    constructor(
        address _dodoLogic,
        address _cloneFactory,
        address _defaultSupervisor
    ) public {
        _DODO_LOGIC_ = _dodoLogic;
        _CLONE_FACTORY_ = _cloneFactory;
        _DEFAULT_SUPERVISOR_ = _defaultSupervisor;
    }

    // ============ Admin Function ============

    function setDODOLogic(address _dodoLogic) external onlyOwner {
        _DODO_LOGIC_ = _dodoLogic;
    }

    function setCloneFactory(address _cloneFactory) external onlyOwner {
        _CLONE_FACTORY_ = _cloneFactory;
    }

    function setDefaultSupervisor(address _defaultSupervisor) external onlyOwner {
        _DEFAULT_SUPERVISOR_ = _defaultSupervisor;
    }

    function removeDODO(address dodo) external onlyOwner {
        address baseToken = IDODO(dodo)._BASE_TOKEN_();
        address quoteToken = IDODO(dodo)._QUOTE_TOKEN_();
        require(isDODORegistered(baseToken, quoteToken), "DODO_NOT_REGISTERED");
        _DODO_REGISTER_[baseToken][quoteToken] = address(0);
        for (uint256 i = 0; i <= _DODOs.length - 1; i++) {
            if (_DODOs[i] == dodo) {
                _DODOs[i] = _DODOs[_DODOs.length - 1];
                _DODOs.pop();
                break;
            }
        }
    }

    function addDODO(address dodo) public onlyOwner {
        address baseToken = IDODO(dodo)._BASE_TOKEN_();
        address quoteToken = IDODO(dodo)._QUOTE_TOKEN_();
        require(!isDODORegistered(baseToken, quoteToken), "DODO_REGISTERED");
        _DODO_REGISTER_[baseToken][quoteToken] = dodo;
        _DODOs.push(dodo);
    }

    // ============ Breed DODO Function ============

    function breedDODO(
        address maintainer,
        address baseToken,
        address quoteToken,
        address oracle,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 k,
        uint256 gasPriceLimit
    ) external onlyOwner returns (address newBornDODO) {
        require(!isDODORegistered(baseToken, quoteToken), "DODO_REGISTERED");
        newBornDODO = ICloneFactory(_CLONE_FACTORY_).clone(_DODO_LOGIC_);
        IDODO(newBornDODO).init(
            _OWNER_,
            _DEFAULT_SUPERVISOR_,
            maintainer,
            baseToken,
            quoteToken,
            oracle,
            lpFeeRate,
            mtFeeRate,
            k,
            gasPriceLimit
        );
        addDODO(newBornDODO);
        emit DODOBirth(newBornDODO, baseToken, quoteToken);
        return newBornDODO;
    }

    // ============ View Functions ============

    function isDODORegistered(address baseToken, address quoteToken) public view returns (bool) {
        if (
            _DODO_REGISTER_[baseToken][quoteToken] == address(0) &&
            _DODO_REGISTER_[quoteToken][baseToken] == address(0)
        ) {
            return false;
        } else {
            return true;
        }
    }

    function getDODO(address baseToken, address quoteToken) external view returns (address) {
        return _DODO_REGISTER_[baseToken][quoteToken];
    }

    function getDODOs() external view returns (address[] memory) {
        return _DODOs;
    }
}
