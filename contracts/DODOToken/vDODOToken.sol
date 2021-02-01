/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IERC20} from "../intf/IERC20.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";
import {InitializableOwnable} from "../lib/InitializableOwnable.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {ReentrancyGuard} from "../lib/ReentrancyGuard.sol";
import {IDODOApproveProxy} from "../SmartRoute/DODOApproveProxy.sol";

interface IGovernance {
    function getLockedvDODO(address account) external returns (uint256);
}

interface IDODOCirculationHelper {
    // vDODO 锁仓不算流通
    function getCirculation() external returns (uint256);

    function getVDODOWithdrawFeeRatio() external returns (uint256);
}

contract vDODOToken is InitializableOwnable, ReentrancyGuard {
    using SafeMath for uint256;

    // ============ Storage(ERC20) ============

    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    mapping(address => mapping(address => uint256)) internal _ALLOWED_;

    // ============ Storage ============

    address immutable _DODO_TOKEN_;
    address immutable _DODO_APPROVE_PROXY_;
    address public _DOOD_GOV_;
    address public _DODO_CIRCULATION_HELPER_;

    bool public _CAN_TRANSFER_;

    // staking reward parameters
    uint256 public dodoPerBlock;
    uint256 public constant _SUPERIOR_RATIO_ = 10**17; // 0.1
    uint256 public dodoFeeDestroyRatio;

    // accounting
    uint256 public alpha = 100 * 10**18; // 100
    uint256 public lastRewardBlock;
    mapping(address => UserInfo) public userInfo;

    struct UserInfo {
        uint256 VDODOAmount;
        uint256 credit;
        address superior;
        uint256 superiorVDODO;
    }

    // ============ Events ============

    event Deposit(address user, address superior, uint256 amount);
    event Withdraw(address user, uint256 amount);
    event SetCantransfer(bool allowed);

    event ChangePerReward(uint256 dodoPerBlock);
    event UpdateDodoFeeDestroyRatio(uint256 dodoFeeDestroyRatio);

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    // ============ Modifiers ============

    modifier canTransfer() {
        require(_CAN_TRANSFER_, "vDODOToken: not allowed transfer");
        _;
    }

    modifier balanceEnough(address account, uint256 amount) {
        require(availableBalanceOf(account) >= amount, "vDODOToken: available amount not enough");
        _;
    }

    // ============ Constructor ============

    constructor(
        address _dodoGov,
        address _dodoToken,
        address _dodoCirculationHelper,
        address _dodoApproveProxy,
        string memory _name,
        string memory _symbol
    ) public {
        name = _name;
        symbol = _symbol;
        decimals = 18;
        _DODO_APPROVE_PROXY_ = _dodoApproveProxy;
        _DOOD_GOV_ = _dodoGov;
        _DODO_CIRCULATION_HELPER_ = _dodoCirculationHelper;
        _DODO_TOKEN_ = _dodoToken;
        lastRewardBlock = block.number;
    }

    // ============ Ownable Functions ============`

    function setCantransfer(bool _allowed) public onlyOwner {
        _CAN_TRANSFER_ = _allowed;
        emit SetCantransfer(_allowed);
    }

    function changePerReward(uint256 _dodoPerBlock) public onlyOwner {
        _updateAlpha();
        dodoPerBlock = _dodoPerBlock;
        emit ChangePerReward(dodoPerBlock);
    }

    function updateDodoFeeDestroyRatio(uint256 _dodoFeeDestroyRatio) public onlyOwner {
        dodoFeeDestroyRatio = _dodoFeeDestroyRatio;
        emit UpdateDodoFeeDestroyRatio(_dodoFeeDestroyRatio);
    }

    function updateDODOCirculationHelper(address _helper) public onlyOwner {
        _DODO_CIRCULATION_HELPER_ = _helper;
    }

    // ============ Functions ============

    function mint(uint256 _dodoAmount, address _superiorAddress) public preventReentrant {
        require(_dodoAmount > 0, "vDODOToken: must deposit greater than 0");
        IDODOApproveProxy(_DODO_APPROVE_PROXY_).claimTokens(
            _DODO_TOKEN_,
            msg.sender,
            address(this),
            _dodoAmount
        );

        _updateAlpha();
        uint256 newVdodoAmount = DecimalMath.divFloor(_dodoAmount, alpha);

        UserInfo storage user = userInfo[msg.sender];
        _mint(user, newVdodoAmount);

        uint256 superiorVDODO;
        if (user.superior == address(0) && _superiorAddress != address(0)) {
            require(_superiorAddress != msg.sender, "COULD NOT SET SELF AS SUPERIOR");
            superiorVDODO = DecimalMath.divFloor(user.VDODOAmount, _SUPERIOR_RATIO_);
            user.superior = _superiorAddress;
        } else if (user.superior != address(0)) {
            superiorVDODO = DecimalMath.divFloor(newVdodoAmount, _SUPERIOR_RATIO_);
        }

        _mintToSuperior(user, superiorVDODO);

        emit Deposit(msg.sender, _superiorAddress, _dodoAmount);
    }

    function redeem(uint256 _vDodoAmount)
        public
        preventReentrant
        balanceEnough(msg.sender, _vDodoAmount)
    {
        _updateAlpha();

        UserInfo storage user = userInfo[msg.sender];
        _redeem(user, _vDodoAmount);

        if (user.superior != address(0)) {
            uint256 superiorRedeemVDODO = DecimalMath.divFloor(_vDodoAmount, _SUPERIOR_RATIO_);
            _redeemFromSuperior(user, superiorRedeemVDODO);
        }

        uint256 feeRatio =
            IDODOCirculationHelper(_DODO_CIRCULATION_HELPER_).getVDODOWithdrawFeeRatio();
        uint256 withdrawDodoAmount = DecimalMath.mulFloor(_vDodoAmount, alpha);

        uint256 withdrawFeeAmount = DecimalMath.mulCeil(withdrawDodoAmount, feeRatio);
        uint256 dodoReceive = withdrawDodoAmount.sub(withdrawFeeAmount);

        IERC20(_DODO_TOKEN_).transfer(msg.sender, dodoReceive);

        if (dodoFeeDestroyRatio > 0) {
            uint256 destroyDodoAmount =
                DecimalMath.mulCeil(withdrawDodoAmount, dodoFeeDestroyRatio);
            _transfer(address(this), address(0), destroyDodoAmount);
            withdrawFeeAmount = withdrawFeeAmount.sub(destroyDodoAmount);
        }

        alpha = alpha.add(DecimalMath.divFloor(withdrawFeeAmount, totalSupply));
        emit Withdraw(msg.sender, _vDodoAmount);
    }

    // ============ Functions(ERC20) ============

    function balanceOf(address account) public view returns (uint256 balance) {
        UserInfo memory user = userInfo[account];
        balance = user.VDODOAmount.sub(DecimalMath.divFloor(user.credit, alpha));
    }

    function availableBalanceOf(address account) public returns (uint256 balance) {
        uint256 lockedBalance = IGovernance(_DOOD_GOV_).getLockedvDODO(account);
        balance = balanceOf(account).sub(lockedBalance);
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        _ALLOWED_[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public returns (bool) {
        require(amount <= _ALLOWED_[from][msg.sender], "ALLOWANCE_NOT_ENOUGH");
        _transfer(from, to, amount);
        _ALLOWED_[from][msg.sender] = _ALLOWED_[from][msg.sender].sub(amount);
        emit Transfer(from, to, amount);
        return true;
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return _ALLOWED_[owner][spender];
    }

    // ============ View Functions ============

    function canWithDraw(address _address) public view returns (uint256 withDrawAmount) {
        UserInfo memory user = userInfo[_address];
        withDrawAmount = user.VDODOAmount.mul(alpha).sub(user.credit);
    }

    // ============ internal  function ============

    function _updateAlpha() internal {
        uint256 accuDODO = dodoPerBlock * (block.number.sub(lastRewardBlock));
        if (totalSupply > 0) {
            alpha = alpha.add(DecimalMath.divFloor(accuDODO, totalSupply));
        }
        lastRewardBlock = block.number;
    }

    function _mint(UserInfo storage to, uint256 amount) internal {
        to.VDODOAmount = to.VDODOAmount.add(amount);
        totalSupply = totalSupply.add(amount);
    }

    function _mintToSuperior(UserInfo storage user, uint256 vdodoAmount) internal {
        if (vdodoAmount > 0) {
            user.superiorVDODO = user.superiorVDODO.add(vdodoAmount);
            UserInfo storage superiorUser = userInfo[user.superior];
            _mint(superiorUser, vdodoAmount);
            superiorUser.credit = superiorUser.credit.add(DecimalMath.mulFloor(vdodoAmount, alpha));
        }
    }

    function _redeem(UserInfo storage from, uint256 amount) internal {
        from.VDODOAmount = from.VDODOAmount.sub(amount);
        totalSupply = totalSupply.sub(amount);
    }

    function _redeemFromSuperior(UserInfo storage user, uint256 vdodoAmount) internal {
        if (vdodoAmount > 0) {
            // 最多撤销当时给superior的
            vdodoAmount = user.superiorVDODO <= vdodoAmount ? user.superiorVDODO : vdodoAmount;
            user.superiorVDODO = user.superiorVDODO.sub(vdodoAmount);

            // 最多撤销superior的全部credit
            UserInfo storage superiorUser = userInfo[user.superior];
            uint256 creditVDODO = DecimalMath.divFloor(superiorUser.credit, alpha);

            if (vdodoAmount >= creditVDODO) {
                superiorUser.credit = 0;
                _redeem(superiorUser, creditVDODO);
            } else {
                superiorUser.credit = superiorUser.credit.sub(
                    DecimalMath.mulFloor(vdodoAmount, alpha)
                );
                _redeem(superiorUser, vdodoAmount);
            }
        }
    }

    function _transfer(
        address from,
        address to,
        uint256 _amount
    ) internal balanceEnough(msg.sender, _amount) {
        require(from != address(0), "transfer from the zero address");
        require(to != address(0), "transfer to the zero address");

        UserInfo storage fromUser = userInfo[from];
        fromUser.VDODOAmount = fromUser.VDODOAmount.sub(_amount);

        UserInfo storage toUser = userInfo[to];
        toUser.VDODOAmount = toUser.VDODOAmount.add(_amount);

        uint256 superiorRedeemVDODO = DecimalMath.divFloor(_amount, _SUPERIOR_RATIO_);

        address fromSuperiorAddr = fromUser.superior;
        if (fromSuperiorAddr != address(0)) {
            _redeemFromSuperior(fromUser, superiorRedeemVDODO);
        }

        address toSuperiorAddr = toUser.superior;
        if (toSuperiorAddr != address(0)) {
            _mintToSuperior(toUser, superiorRedeemVDODO);
        }

        emit Transfer(from, to, _amount);
    }

    function donate(uint256 amount) public {
        IERC20(_DODO_TOKEN_).transferFrom(msg.sender, address(this), amount);
        alpha = alpha.add(DecimalMath.divFloor(amount, totalSupply));
    }
}
