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
    function getLockedvDODO(address account) external view returns (uint256);
}

interface IDODOCirculationHelper {
    // vDODO 锁仓不算流通
    function getCirculation() external view returns (uint256);

    function getVDODOWithdrawFeeRatio() external view returns (uint256);
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
    uint256 public dodoFeeBurnRation;

    // accounting
    uint128 public alpha = 100 * 10**18; // 100
    uint128 public lastRewardBlock;
    mapping(address => UserInfo) public userInfo;

    struct UserInfo {
        uint128 VDODOAmount;
        uint128 superiorVDODO;
        address superior;
        uint256 credit;
    }

    // ============ Events ============

    event MintVDODO(address user, address superior, uint256 amount);
    event RedeemVDODO(address user, uint256 amount);
    event SetCantransfer(bool allowed);

    event ChangePerReward(uint256 dodoPerBlock);
    event UpdatedodoFeeBurnRation(uint256 dodoFeeBurnRation);

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
        address dodoGov,
        address dodoToken,
        address dodoCirculationHelper,
        address dodoApproveProxy,
        string memory _name,
        string memory _symbol
    ) public {
        name = _name;
        symbol = _symbol;
        decimals = 18;
        _DODO_APPROVE_PROXY_ = dodoApproveProxy;
        _DOOD_GOV_ = dodoGov;
        _DODO_CIRCULATION_HELPER_ = dodoCirculationHelper;
        _DODO_TOKEN_ = dodoToken;
        lastRewardBlock = uint128(block.number);
    }

    // ============ Ownable Functions ============`

    function setCantransfer(bool allowed) public onlyOwner {
        _CAN_TRANSFER_ = allowed;
        emit SetCantransfer(allowed);
    }

    function changePerReward(uint256 _dodoPerBlock) public onlyOwner {
        _updateAlpha();
        dodoPerBlock = _dodoPerBlock;
        emit ChangePerReward(_dodoPerBlock);
    }

    function updatedodoFeeBurnRation(uint256 _dodoFeeBurnRation) public onlyOwner {
        dodoFeeBurnRation = _dodoFeeBurnRation;
        emit UpdatedodoFeeBurnRation(_dodoFeeBurnRation);
    }

    function updateDODOCirculationHelper(address helper) public onlyOwner {
        _DODO_CIRCULATION_HELPER_ = helper;
    }

    function updateGovernance(address governance) public onlyOwner {
        _DOOD_GOV_ = governance;
    }

    // ============ Functions ============

    function mint(uint256 dodoAmount, address superiorAddress) public preventReentrant {
        require(superiorAddress != address(0) && superiorAddress != msg.sender, "vDODOToken: Superior INVALID");
        require(dodoAmount > 0, "vDODOToken: must mint greater than 0");
        
        _updateAlpha();
        
        IDODOApproveProxy(_DODO_APPROVE_PROXY_).claimTokens(
            _DODO_TOKEN_,
            msg.sender,
            address(this),
            dodoAmount
        );

        uint256 newVdodoAmount = DecimalMath.divFloor(dodoAmount, alpha);

        UserInfo storage user = userInfo[msg.sender];
        _mint(user, newVdodoAmount);

        uint256 increSuperiorVDODO = DecimalMath.mulFloor(newVdodoAmount, _SUPERIOR_RATIO_);
        
        if (user.superior == address(0)) {
            user.superior = superiorAddress;
        }

        _mintToSuperior(user, increSuperiorVDODO);
        
        emit MintVDODO(msg.sender, superiorAddress, dodoAmount);
    }

    function redeem(uint256 vDodoAmount)
        public
        preventReentrant
        balanceEnough(msg.sender, vDodoAmount)
    {
        _updateAlpha();

        UserInfo storage user = userInfo[msg.sender];
        _redeem(user, vDodoAmount);

        if (user.superior != address(0)) {
            uint256 superiorRedeemVDODO = DecimalMath.mulFloor(vDodoAmount, _SUPERIOR_RATIO_);
            _redeemFromSuperior(user, superiorRedeemVDODO);
        }

        (uint256 dodoReceive, uint256 burnDodoAmount, uint256 withdrawFeeDodoAmount) = getWithdrawAmount(vDodoAmount);
        
        IERC20(_DODO_TOKEN_).transfer(msg.sender, dodoReceive);

        if(burnDodoAmount > 0){
            _transfer(address(this), address(0), burnDodoAmount);
        }        

        if(withdrawFeeDodoAmount > 0) {
            alpha = uint128(uint256(alpha).add(DecimalMath.divFloor(withdrawFeeDodoAmount, totalSupply)));
        }

        emit RedeemVDODO(msg.sender, vDodoAmount);
    }


    function donate(uint256 dodoAmount) public {
        IDODOApproveProxy(_DODO_APPROVE_PROXY_).claimTokens(
            _DODO_TOKEN_,
            msg.sender,
            address(this),
            dodoAmount
        );
        alpha = uint128(uint256(alpha).add(DecimalMath.divFloor(dodoAmount, totalSupply)));
    }

    // ============ Functions(ERC20) ============

    function balanceOf(address account) public view returns (uint256 balance) {
        UserInfo memory user = userInfo[account];
        balance = uint256(user.VDODOAmount).sub(DecimalMath.divFloor(user.credit, getLatestAlpha()));
    }

    function availableBalanceOf(address account) public view returns (uint256 balance) {
        uint256 lockedBalance = IGovernance(_DOOD_GOV_).getLockedvDODO(account);
        balance = balanceOf(account).sub(lockedBalance);
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        _updateAlpha();
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
        _updateAlpha();
        _transfer(from, to, amount);
        _ALLOWED_[from][msg.sender] = _ALLOWED_[from][msg.sender].sub(amount);
        emit Transfer(from, to, amount);
        return true;
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return _ALLOWED_[owner][spender];
    }

    // ============ View Functions ============

    function canWithdraw(address account) public view returns (uint256 dodoAmount) {
        UserInfo memory user = userInfo[account];
        dodoAmount = DecimalMath.mulFloor(uint256(user.VDODOAmount),getLatestAlpha()).sub(user.credit);
    }

    function getLatestAlpha() public view returns(uint256) {
        uint256 accuDODO = dodoPerBlock * (block.number.sub(lastRewardBlock));
        if (totalSupply > 0) {
            return uint256(alpha).add(DecimalMath.divFloor(accuDODO, totalSupply));
        } else {
            return alpha;
        }
    }

    function getWithdrawAmount(uint256 vDodoAmount) public view returns(uint256 dodoReceive, uint256 burnDodoAmount, uint256 withdrawFeeDodoAmount) {
        uint256 feeRatio = IDODOCirculationHelper(_DODO_CIRCULATION_HELPER_).getVDODOWithdrawFeeRatio();

        uint256 newAlpha = getLatestAlpha();
        uint256 withdrawDodoAmount = DecimalMath.mulFloor(vDodoAmount, newAlpha);

        withdrawFeeDodoAmount = DecimalMath.mulCeil(withdrawDodoAmount, feeRatio);
        dodoReceive = withdrawDodoAmount.sub(withdrawFeeDodoAmount);
    
        if(dodoFeeBurnRation > 0){
            burnDodoAmount = DecimalMath.mulFloor(withdrawFeeDodoAmount,dodoFeeBurnRation);
            withdrawFeeDodoAmount = withdrawFeeDodoAmount.sub(burnDodoAmount);
        }else {
            burnDodoAmount = 0;
        }
    }

    // ============ Internal Functions ============

    function _updateAlpha() internal {
        uint256 newAlpha = getLatestAlpha();
        require(newAlpha <= uint128(-1), "OVERFLOW");
        alpha = uint128(newAlpha);
        lastRewardBlock = uint128(block.number);
    }

    function _mint(UserInfo storage to, uint256 vdodoAmount) internal {
        require(vdodoAmount <= uint128(-1), "OVERFLOW");
        to.VDODOAmount = uint128(uint256(to.VDODOAmount).add(vdodoAmount));
        totalSupply = totalSupply.add(vdodoAmount);
    }

    function _mintToSuperior(UserInfo storage user, uint256 vdodoAmount) internal {
        if (vdodoAmount > 0) {
            user.superiorVDODO = uint128(uint256(user.superiorVDODO).add(vdodoAmount));
            UserInfo storage superiorUser = userInfo[user.superior];
            _mint(superiorUser, vdodoAmount);
            uint256 dodoAmount = DecimalMath.mulFloor(vdodoAmount, alpha);
            superiorUser.credit = superiorUser.credit.add(DecimalMath.mulFloor(dodoAmount, _SUPERIOR_RATIO_));
        }
    }

    function _redeem(UserInfo storage from, uint256 vdodoAmount) internal {
        from.VDODOAmount = uint128(uint256(from.VDODOAmount).sub(vdodoAmount));
        totalSupply = totalSupply.sub(vdodoAmount);
    }

    function _redeemFromSuperior(UserInfo storage user, uint256 vdodoAmount) internal {
        if (vdodoAmount > 0) {
            vdodoAmount = user.superiorVDODO <= vdodoAmount ? user.superiorVDODO : vdodoAmount;
            user.superiorVDODO = uint128(uint256(user.superiorVDODO).sub(vdodoAmount));

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
    ) internal balanceEnough(msg.sender, _amount) canTransfer {
        require(from != address(0), "transfer from the zero address");
        require(to != address(0), "transfer to the zero address");

        UserInfo storage fromUser = userInfo[from];
        fromUser.VDODOAmount = uint128(uint256(fromUser.VDODOAmount).sub(_amount));

        UserInfo storage toUser = userInfo[to];
        toUser.VDODOAmount = uint128(uint256(toUser.VDODOAmount).add(_amount));

        uint256 superiorRedeemVDODO = DecimalMath.mulFloor(_amount, _SUPERIOR_RATIO_);

        if (fromUser.superior != address(0)) {
            _redeemFromSuperior(fromUser, superiorRedeemVDODO);
        }

        if (toUser.superior != address(0)) {
            _mintToSuperior(toUser, superiorRedeemVDODO);
        }

        emit Transfer(from, to, _amount);
    }
}
