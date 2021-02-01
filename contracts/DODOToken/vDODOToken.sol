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
    function governanceCall(address account, uint256 amount,bytes calldata data) external returns (bool);
}


interface IDODOLockedHelper {
    function getDodoLockedAmount() external view returns (uint256);
}


contract vDODOToken is InitializableOwnable ,ReentrancyGuard{
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Storage(ERC20) ============

    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    mapping(address => mapping(address => uint256)) internal _ALLOWED_;


    // ============ Storage ============
    address immutable _DODO_LOCKED_HELPER_;
    address immutable _DODO_TOKEN_;
    address immutable _DODO_APPROVE_PROXY_;
    address public _DOOD_GOV_;
    bool cantransfer;
    uint256 public dodoPerBlock; 

    uint256 constant public _MAG_SP_AMOUNT_ = 10; // 0.1
    
    uint256 constant public _MIN_X_ = 10**18;
    uint256 constant public _MAX_X_ = 10 * 10**18;
    uint256 constant public _MIN_Y_ = 5 * 10**18;
    uint256 constant public _MAX_Y_ = 15 * 10**18;
    
    uint256 public alpha = 100;
    uint256 public lastRewardBlock;
    uint256 public dodoFeeDestroyRatio;
    mapping(address => bool) public operater;
    mapping(address => UserInfo) public userInfo;
   
    struct UserInfo {
        address superior;
        uint256 vdodoAmount;
        uint256 overdraft; 
        bool    hasParticipateGov;              //是否正在参与治理，是的话就不可以提币
    }

    // ============ Events ============
    event ParticipatoryGov(address user, uint256 amount);
    event Deposit(address user,address superior, uint256 amount);
    event Withdraw(address user, uint256 amount);
    event SetCantransfer(bool allowed);
    event RemoveOperation(address operater);
    event AddOperation(address operater);
    event ChangePerReward(uint256 dodoPerBlock);
    event UpdateDodoFeeDestroyRatio(uint256 dodoFeeDestroyRatio);

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);


    // ============ Modifiers ============
    //TODO: 是否需要operator的白名单设计？
    modifier onlyOperater() {
        require(cantransfer || operater[msg.sender] , "vDODOToken: not allowed transfer");
        _;
    }

    constructor(
        address _dodoGov,
        address _dodoToken,
        address _dodoLockedHelper,
        address _dodoApproveProxy,
        string memory _name, 
        string memory _symbol)
    public {
        name = _name;
        symbol = _symbol;
        decimals = 18;
        _DODO_APPROVE_PROXY_ = _dodoApproveProxy;
        _DOOD_GOV_ = _dodoGov;
        _DODO_LOCKED_HELPER_ = _dodoLockedHelper;
        _DODO_TOKEN_ = _dodoToken;
        lastRewardBlock = block.number;
    }

    // ============ Ownable Functions ============`

    function setCantransfer(bool _allowed) public onlyOwner {
        cantransfer = _allowed;
        emit SetCantransfer(_allowed);
    }

    function addOperationAddress(address _operater) public onlyOwner {
        operater[_operater] = true;
        emit AddOperation(_operater);
    }

    function removeOperation(address _operater) public onlyOwner {
        operater[_operater] = false;
        emit RemoveOperation(_operater);
    }

    function changePerReward(uint256 _dodoPerBlock) public onlyOwner {
        _updateAlpha(getAlpha());
        dodoPerBlock = _dodoPerBlock;
        emit ChangePerReward(dodoPerBlock);
    }

    function updateDodoFeeDestroyRatio(uint256 _dodoFeeDestroyRatio) public onlyOwner {
        dodoFeeDestroyRatio = _dodoFeeDestroyRatio;
        emit UpdateDodoFeeDestroyRatio(_dodoFeeDestroyRatio);
    }
    
    // ============ Functions ============
    function participatoryGov(
        uint256 _amount,
        bytes calldata _data
    ) external preventReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(user.vdodoAmount > _amount, "vDODOToken: no enough vdodo");
        if (_data.length > 0)
            IGovernance(_DOOD_GOV_).governanceCall(msg.sender, _amount, _data);

        user.vdodoAmount = user.vdodoAmount.sub(_amount);
        user.hasParticipateGov = true;
        //TODO: 是否减掉总量?
        totalSupply = totalSupply.sub(_amount);

        emit ParticipatoryGov(msg.sender, _amount);
    }


    function deposit(uint256 _dodoAmount,address _superiorAddress) public preventReentrant {
        require(_dodoAmount > 0, "vDODOToken: must deposit greater than 0");
        IDODOApproveProxy(_DODO_APPROVE_PROXY_).claimTokens(
            _DODO_TOKEN_,
            msg.sender,
            address(this),
            _dodoAmount
        );

        uint tmpAlpha = getAlpha();

        UserInfo storage user = userInfo[msg.sender];
        user.vdodoAmount = user.vdodoAmount.add(_dodoAmount.div(tmpAlpha));
        
        if(user.superior == address(0) && _superiorAddress != address(0) && _superiorAddress != msg.sender){
            user.superior = _superiorAddress;
        }
        uint256 _dodoAmountDivAlpha = DecimalMath.divFloor(_dodoAmount, tmpAlpha);
        
        if(user.superior != address(0)){
            UserInfo storage superiorUser = userInfo[user.superior];
    
            superiorUser.vdodoAmount = superiorUser.vdodoAmount.add(_dodoAmountDivAlpha.mul(_MAG_SP_AMOUNT_).div(100));

            superiorUser.overdraft = superiorUser.overdraft.add(_dodoAmount.mul(_MAG_SP_AMOUNT_).div(100));

            totalSupply = totalSupply.add(_dodoAmountDivAlpha.mul(_MAG_SP_AMOUNT_ + 100).div(100));
        }else {
            totalSupply = totalSupply.add(_dodoAmountDivAlpha);
        }

        _updateAlpha(tmpAlpha);

        emit Deposit(msg.sender, _superiorAddress, _dodoAmount);
    }
    

    function withdraw(uint256 _vDodoAmount) public preventReentrant {
        UserInfo storage user = userInfo[msg.sender];
        uint256 userAmount = user.vdodoAmount;
        require(userAmount >= _vDodoAmount, "vDODOToken: no enough vdodo token");
        require(!user.hasParticipateGov, "vDODOToken: hasParticipateGov");
        
        uint256 tmpAlpha = getAlpha();
        
        user.vdodoAmount = userAmount.sub(_vDodoAmount);

        if(user.superior != address(0)) {
            UserInfo storage superiorUser = userInfo[user.superior];
            superiorUser.vdodoAmount = superiorUser.vdodoAmount.sub(_vDodoAmount.mul(_MAG_SP_AMOUNT_).div(100));

            uint256 _overdraft = _vDodoAmount.mul(tmpAlpha).mul(_MAG_SP_AMOUNT_).div(100);
            superiorUser.overdraft = superiorUser.overdraft.sub(_overdraft);

            totalSupply = totalSupply.sub(_vDodoAmount.mul(_MAG_SP_AMOUNT_ + 100).div(100));
        } else {
            totalSupply = totalSupply.sub(_vDodoAmount);
        }

        (uint256 dodoReceive, uint256 destroyDodoAmount, uint256 withdrawFeeAmount) = getWithdrawAmount(_vDodoAmount);
        
        IERC20(_DODO_TOKEN_).transfer(msg.sender, dodoReceive);        
        _transfer(address(this), address(0), destroyDodoAmount);

        tmpAlpha = tmpAlpha.add(withdrawFeeAmount.div(totalSupply));
        _updateAlpha(tmpAlpha);

        emit Withdraw(msg.sender, _vDodoAmount);
    }

    // ============ Functions(ERC20) ============
    function balanceOf(address _address) public view returns (uint256 balance) {
        UserInfo memory user = userInfo[_address];
        balance = user.vdodoAmount.sub(user.overdraft.div(alpha));
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(amount <= _ALLOWED_[from][msg.sender], "ALLOWANCE_NOT_ENOUGH");
        _transfer(from, to, amount);
        _ALLOWED_[from][msg.sender] = _ALLOWED_[from][msg.sender].sub(amount);
        emit Transfer(from, to, amount);
        return true;
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) private onlyOperater {
        _ALLOWED_[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return _ALLOWED_[owner][spender];
    }

    function _transfer(address from, address to, uint256 _amount) internal onlyOperater {
        require(from != address(0), " transfer from the zero address");
        require(to != address(0), " transfer to the zero address");
        require(balanceOf(from) >= _amount,"no enough to transfer");
        
        UserInfo storage user = userInfo[from];
        user.vdodoAmount= user.vdodoAmount.sub(_amount);

        address fromSuperiorAddr = user.superior;

        if(fromSuperiorAddr != address(0)) {
            UserInfo storage fromSuperior = userInfo[fromSuperiorAddr];
            fromSuperior.vdodoAmount = fromSuperior.vdodoAmount.sub(_amount.mul(_MAG_SP_AMOUNT_).div(100));
        }

        UserInfo storage toUser = userInfo[to];
        toUser.vdodoAmount = toUser.vdodoAmount.add(_amount);

        address toSuperiorAddr = toUser.superior;
        if(toSuperiorAddr != address(0)) {
            UserInfo storage toSuperior = userInfo[toSuperiorAddr];
            toUser.vdodoAmount =toSuperior.vdodoAmount.add(_amount.mul(_MAG_SP_AMOUNT_).div(100)); 
        } 

        emit Transfer(from, to, _amount);
    }

    // ============ View Functions ============
    function canWithDraw(address _address) public view returns (uint256 withDrawAmount) {
        UserInfo memory user = userInfo[_address];
        withDrawAmount = user.vdodoAmount.mul(alpha).sub(user.overdraft);
    }

    function getAlpha() public view returns (uint256) {
        uint256 accuDODO = dodoPerBlock * (block.number.sub(lastRewardBlock));
        if(totalSupply > 0){
            return alpha.add(accuDODO.div(totalSupply));
        }else {
            return alpha;
        }
    }


    function getWithdrawAmount(uint256 vDodoAmount) public view returns(uint256 dodoReceive, uint256 destroyDodoAmount, uint256 withdrawFeeAmount) {
        uint256 feeRatio = _checkReward();
        uint256 tmpAlpha = getAlpha();
        uint256 withdrawDodoAmount = tmpAlpha.mul(vDodoAmount);

        withdrawFeeAmount = DecimalMath.mulCeil(withdrawDodoAmount,feeRatio).div(100);
        dodoReceive = withdrawDodoAmount.sub(withdrawFeeAmount);

        if(dodoFeeDestroyRatio > 0){
            destroyDodoAmount = DecimalMath.mulCeil(withdrawDodoAmount,dodoFeeDestroyRatio).div(100);
            withdrawFeeAmount = withdrawFeeAmount.sub(destroyDodoAmount);
        }else {
            destroyDodoAmount = 0;
        }
    }


     // ============ internal  function ============
    function _updateAlpha(uint256 newAlpha) internal {
        alpha = newAlpha;
        lastRewardBlock = block.number;
    }

     // ============= Helper and calculation function ===============
    function _checkReward() internal view returns (uint256) {
        uint256 dodoTotalLockedAmout = IDODOLockedHelper(_DODO_LOCKED_HELPER_).getDodoLockedAmount();
        // (x - 1)^2 / 81 + (y - 15)^2 / 100 = 1 ==> y = sqrt(100* (x*x +2x ) / 81)) +15
        // y = 5 (x ≤ 1)
        // y = 15 (x ≥ 10)
        uint256 x = DecimalMath.divCeil(dodoTotalLockedAmout,totalSupply);
        if( x <= _MIN_X_){
            return _MIN_Y_;
        }else if(x >= _MAX_X_){
            return _MAX_Y_;
        }else{
            uint256 xSubOne = x.sub(10**18);
            uint256 rewardAmount = uint256(81 * 10**18).sub(xSubOne.mul(xSubOne)).mul(100).div(81).sqrt().add(15);
            return rewardAmount;
        }
    }
}


//TODO: donate function?