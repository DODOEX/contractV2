/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IERC20} from "../../intf/IERC20.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {DecimalMath} from "../../lib/DecimalMath.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";
import {Ownable} from "../../lib/Ownable.sol";
import {InitializableOwnable} from "../../lib/InitializableOwnable.sol";

contract DVMVault is InitializableOwnable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public _BASE_TOKEN_;
    address public _QUOTE_TOKEN_;

    uint256 public _BASE_RESERVE_;
    uint256 public _QUOTE_RESERVE_;

    string public symbol;
    uint256 public decimals;
    string public name;

    uint256 public totalSupply;
    mapping(address => uint256) internal _SHARES_;
    mapping(address => mapping(address => uint256)) internal _ALLOWED_;

    // ============ Events ============

    event Transfer(address indexed from, address indexed to, uint256 amount);

    event Approval(address indexed owner, address indexed spender, uint256 amount);

    event Mint(address indexed user, uint256 value);

    event Burn(address indexed user, uint256 value);

    // init functions
    function init(
        address owner,
        address _baseToken,
        address _quoteToken
    ) public notInitialized {
        initOwner(owner);
        string memory connect = "_";
        string memory suffix = "DLP";
        string memory uid = string(abi.encodePacked(address(this)));
        name = string(
            abi.encodePacked(
                suffix,
                connect,
                IERC20(_baseToken).symbol(),
                connect,
                IERC20(_quoteToken).symbol(),
                connect,
                uid
            )
        );
        symbol = "DLP";
        decimals = IERC20(_baseToken).decimals();
        _BASE_TOKEN_ = _baseToken;
        _QUOTE_TOKEN_ = _quoteToken;
    }

    // Vault related

    function getVaultBalance() public view returns (uint256 baseBalance, uint256 quoteBalance) {
        return (
            IERC20(_BASE_TOKEN_).balanceOf(address(this)),
            IERC20(_QUOTE_TOKEN_).balanceOf(address(this))
        );
    }

    function getVaultReserve() public view returns (uint256 baseReserve, uint256 quoteReserve) {
        return (_BASE_RESERVE_, _QUOTE_RESERVE_);
    }

    function getBaseBalance() public view returns (uint256 baseBalance) {
        return IERC20(_BASE_TOKEN_).balanceOf(address(this));
    }

    function getQuoteBalance() public view returns (uint256 quoteBalance) {
        return IERC20(_QUOTE_TOKEN_).balanceOf(address(this));
    }

    function getBaseInput() public view returns (uint256 input) {
        return IERC20(_BASE_TOKEN_).balanceOf(address(this)).sub(_BASE_RESERVE_);
    }

    function getQuoteInput() public view returns (uint256 input) {
        return IERC20(_QUOTE_TOKEN_).balanceOf(address(this)).sub(_QUOTE_RESERVE_);
    }

    function sync() public onlyOwner {
        (uint256 baseBalance, uint256 quoteBalance) = getVaultBalance();
        if (baseBalance != _BASE_RESERVE_) {
            _BASE_RESERVE_ = baseBalance;
        }
        if (quoteBalance != _QUOTE_RESERVE_) {
            _QUOTE_RESERVE_ = quoteBalance;
        }
    }

    function transferOut(
        address token,
        address to,
        uint256 amount
    ) public onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    function transferBaseOut(address to, uint256 amount) public onlyOwner {
        IERC20(_BASE_TOKEN_).safeTransfer(to, amount);
    }

    function transferQuoteOut(address to, uint256 amount) public onlyOwner {
        IERC20(_QUOTE_TOKEN_).safeTransfer(to, amount);
    }

    // Shares related
    /**
     * @dev transfer token for a specified address
     * @param to The address to transfer to.
     * @param amount The amount to be transferred.
     */
    function transfer(address to, uint256 amount) public returns (bool) {
        require(amount <= _SHARES_[msg.sender], "BALANCE_NOT_ENOUGH");

        _SHARES_[msg.sender] = _SHARES_[msg.sender].sub(amount);
        _SHARES_[to] = _SHARES_[to].add(amount);
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @dev Gets the balance of the specified address.
     * @param owner The address to query the the balance of.
     * @return balance An uint256 representing the amount owned by the passed address.
     */
    function balanceOf(address owner) external view returns (uint256 balance) {
        return _SHARES_[owner];
    }

    function shareRatioOf(address owner) external view returns (uint256 shareRatio) {
        return DecimalMath.divFloor(_SHARES_[owner], totalSupply);
    }

    /**
     * @dev Transfer tokens from one address to another
     * @param from address The address which you want to send tokens from
     * @param to address The address which you want to transfer to
     * @param amount uint256 the amount of tokens to be transferred
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public returns (bool) {
        require(amount <= _SHARES_[from], "BALANCE_NOT_ENOUGH");
        require(amount <= _ALLOWED_[from][msg.sender], "ALLOWANCE_NOT_ENOUGH");

        _SHARES_[from] = _SHARES_[from].sub(amount);
        _SHARES_[to] = _SHARES_[to].add(amount);
        _ALLOWED_[from][msg.sender] = _ALLOWED_[from][msg.sender].sub(amount);
        emit Transfer(from, to, amount);
        return true;
    }

    /**
     * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
     * @param spender The address which will spend the funds.
     * @param amount The amount of tokens to be spent.
     */
    function approve(address spender, uint256 amount) public returns (bool) {
        _ALLOWED_[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @dev Function to check the amount of tokens that an owner _ALLOWED_ to a spender.
     * @param owner address The address which owns the funds.
     * @param spender address The address which will spend the funds.
     * @return A uint256 specifying the amount of tokens still available for the spender.
     */
    function allowance(address owner, address spender) public view returns (uint256) {
        return _ALLOWED_[owner][spender];
    }

    function mint(address user, uint256 value) external onlyOwner {
        _SHARES_[user] = _SHARES_[user].add(value);
        totalSupply = totalSupply.add(value);
        emit Mint(user, value);
        emit Transfer(address(0), user, value);
    }

    function burn(address user, uint256 value) external onlyOwner {
        _SHARES_[user] = _SHARES_[user].sub(value);
        totalSupply = totalSupply.sub(value);
        emit Burn(user, value);
        emit Transfer(user, address(0), value);
    }
}
