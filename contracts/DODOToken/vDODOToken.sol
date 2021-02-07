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
import {IDODOApproveProxy} from "../SmartRoute/DODOApproveProxy.sol";

interface IGovernance {
    function getLockedDODO(address account) external view returns (uint256);
}

interface IDODOCirculationHelper {
    // Locked vDOOD not counted in circulation
    function getCirculation() external view returns (uint256);

    function getDodoWithdrawFeeRatio() external view returns (uint256);
}

contract vDODOToken is InitializableOwnable {
    using SafeMath for uint256;

    // ============ Storage(ERC20) ============

    string public name = "vDODO Token";
    string public symbol = "vDODO";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => mapping(address => uint256)) internal _ALLOWED_;

    // ============ Storage ============

    address immutable _DODO_TOKEN_;
    address immutable _DODO_APPROVE_PROXY_;
    address immutable _DODO_TEAM_;
    address public _DOOD_GOV_;
    address public _DODO_CIRCULATION_HELPER_;

    bool public _CAN_TRANSFER_;

    // staking reward parameters
    uint256 public dodoPerBlock;
    uint256 public constant _SUPERIOR_RATIO_ = 10**17; // 0.1
    uint256 public constant _DODO_RATIO_ = 100 * 10**18; // 100
    uint256 public dodoFeeBurnRation;

    // accounting
    uint128 public alpha =  10**18; // 1 
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
        address dodoApproveProxy,
        address dodoTeam
    ) public {
        _DOOD_GOV_ = dodoGov;
        _DODO_TOKEN_ = dodoToken;
        _DODO_APPROVE_PROXY_ = dodoApproveProxy;
        lastRewardBlock = uint128(block.number);
        _DODO_TEAM_ = dodoTeam;
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
    
    function emergencyWithdraw() public onlyOwner {
        uint256 dodoBalance = IERC20(_DODO_TOKEN_).balanceOf(address(this));
        IERC20(_DODO_TOKEN_).transfer(_OWNER_, dodoBalance);
    }

    // ============ Functions ============

    function mint(uint256 dodoAmount, address superiorAddress) public {
        require(superiorAddress != address(0) && superiorAddress != msg.sender, "vDODOToken: Superior INVALID");
        require(dodoAmount > 0, "vDODOToken: must mint greater than 0");
        
        _updateAlpha();
        
        IDODOApproveProxy(_DODO_APPROVE_PROXY_).claimTokens(
            _DODO_TOKEN_,
            msg.sender,
            address(this),
            dodoAmount
        );

        uint256 newVdodoAmount = DecimalMath.divFloor(dodoAmount,_DODO_RATIO_);

        UserInfo storage user = userInfo[msg.sender];
        _mint(user, newVdodoAmount);

        uint256 increSuperiorVDODO = DecimalMath.mulFloor(newVdodoAmount, _SUPERIOR_RATIO_);
        
        if (user.superior == address(0)) {
            require(superiorAddress == _DODO_TEAM_ || userInfo[superiorAddress].superior != address(0), "vDODOToken: INVALID_SUPERIOR_ADDRESS");
            user.superior = superiorAddress;
        }

        _mintToSuperior(user, increSuperiorVDODO);
        
        emit MintVDODO(msg.sender, superiorAddress, dodoAmount);
    }

    function redeem(uint256 dodoAmount)
        public
        balanceEnough(msg.sender, dodoAmount)
    {
        _updateAlpha();

        UserInfo storage user = userInfo[msg.sender];
        uint256 vDodoAmount = DecimalMath.divFloor(dodoAmount,_DODO_RATIO_);
        _redeem(user, vDodoAmount);

        if (user.superior != address(0)) {
            uint256 superiorRedeemVDODO = DecimalMath.mulFloor(vDodoAmount, _SUPERIOR_RATIO_);
            _redeemFromSuperior(user, superiorRedeemVDODO);
        }

        (uint256 dodoReceive, uint256 burnDodoAmount, uint256 withdrawFeeDodoAmount) = getWithdrawAmount(dodoAmount);
        
        IERC20(_DODO_TOKEN_).transfer(msg.sender, dodoReceive);

        if(burnDodoAmount > 0){
            IERC20(_DODO_TOKEN_).transfer(address(0), burnDodoAmount);
        }        

        if(withdrawFeeDodoAmount > 0) {
            alpha = uint128(uint256(alpha).add(DecimalMath.divFloor(withdrawFeeDodoAmount, totalSupply)));
        }

        emit RedeemVDODO(msg.sender, dodoAmount);
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

    function balanceOf(address account) public view returns (uint256 dodoAmount) {
        UserInfo memory user = userInfo[account];
        dodoAmount = DecimalMath.mulFloor(uint256(user.VDODOAmount),_DODO_RATIO_.add(getLatestAlpha())).sub(user.credit);
    }

    function availableBalanceOf(address account) public view returns (uint256 balance) {
        if(_DOOD_GOV_ == address(0)){
            balance = balanceOf(account);
        }else {
            uint256 lockedBalance = IGovernance(_DOOD_GOV_).getLockedDODO(account);
            balance = balanceOf(account).sub(lockedBalance);
        }
    }

    function transfer(address to, uint256 dodoAmount) public returns (bool) {
        _updateAlpha();
        _transfer(msg.sender, to, dodoAmount);
        return true;
    }

    function approve(address spender, uint256 dodoAmount) public returns (bool) {
        _ALLOWED_[msg.sender][spender] = dodoAmount;
        emit Approval(msg.sender, spender, dodoAmount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 dodoAmount
    ) public returns (bool) {
        require(dodoAmount <= _ALLOWED_[from][msg.sender], "ALLOWANCE_NOT_ENOUGH");
        _updateAlpha();
        _transfer(from, to, dodoAmount);
        _ALLOWED_[from][msg.sender] = _ALLOWED_[from][msg.sender].sub(dodoAmount);
        return true;
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return _ALLOWED_[owner][spender];
    }

    // ============ View Functions ============

    function getLatestAlpha() public view returns(uint256) {
        uint256 accuDODO = dodoPerBlock * (block.number - lastRewardBlock);
        if (totalSupply > 0) {
            return uint256(alpha).add(DecimalMath.divFloor(accuDODO, totalSupply));
        } else {
            return alpha;
        }
    }

    function getWithdrawAmount(uint256 dodoAmount) public view returns(uint256 dodoReceive, uint256 burnDodoAmount, uint256 withdrawFeeDodoAmount) {
        uint256 vDodoAmount = DecimalMath.divFloor(dodoAmount,_DODO_RATIO_);
        uint256 feeRatio = IDODOCirculationHelper(_DODO_CIRCULATION_HELPER_).getDodoWithdrawFeeRatio();

        uint256 newAlpha = getLatestAlpha();
        uint256 withdrawDodoAmount = DecimalMath.mulFloor(vDodoAmount, _DODO_RATIO_.add(newAlpha));

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
            uint256 dodoAmount = DecimalMath.mulCeil(vdodoAmount, _DODO_RATIO_.add(alpha));
            superiorUser.credit = superiorUser.credit.add(dodoAmount);
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
            uint256 creditVDODO = DecimalMath.divFloor(superiorUser.credit, _DODO_RATIO_.add(alpha));

            if (vdodoAmount >= creditVDODO) {
                superiorUser.credit = 0;
                _redeem(superiorUser, creditVDODO);
            } else {
                superiorUser.credit = superiorUser.credit.sub(
                    DecimalMath.mulFloor(vdodoAmount, _DODO_RATIO_.add(alpha))
                );
                _redeem(superiorUser, vdodoAmount);
            }
        }
    }

    function _transfer(
        address from,
        address to,
        uint256 _dodoAmount
    ) internal balanceEnough(from, _dodoAmount) canTransfer {
        require(from != address(0), "transfer from the zero address");
        require(to != address(0), "transfer to the zero address");
        
        uint256 _amount = DecimalMath.divFloor(_dodoAmount,_DODO_RATIO_);

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

        emit Transfer(from, to, _dodoAmount);
    }
}
