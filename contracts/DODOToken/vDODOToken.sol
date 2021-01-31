/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/
pragma solidity 0.6.9;

import {IERC20} from "../intf/IERC20.sol";
import {Address} from "../lib/Address.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";
import {InitializableOwnable} from "../lib/InitializableOwnable.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {ReentrancyGuard} from "../lib/ReentrancyGuard.sol";


interface IGovernance {
    function governanceCall(address account, uint256 amount,bytes calldata data) external returns (bool);
}


interface IDODOLockedHelper {
    function getDodoLockedAmount() external returns (uint256);
}


contract vDODOToken is IERC20, InitializableOwnable ,ReentrancyGuard{
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

    uint256 constant public _MAG_SP_AMOUNT_ = 10;
    //TODO： 可去掉
    uint256 constant public _MAG_TOTALSP_AMOUNT_ = 110;
    uint256 constant public _BASE_AMOUNT_ = 100;
    
    uint256 constant public _MIN_X_ = 1;
    uint256 constant public _MIN_X_Y_ = 5;
    uint256 constant public _MAX_X_ = 10;
    uint256 constant public _MAX_X_Y_ = 15;
    
    uint256 public alpha = 100;
    uint256 public totalOverDraft;
    uint256 public lastRewardBlock;
    uint256 public dodoFeeDestroyRatio;
    mapping(address => mapping(address => uint256)) internal _ALLOWED_;
    mapping(address => bool) public operater;
    mapping(address => UserInfo) public userInfo;
   
    struct UserInfo {
        address superior;
        uint256 vdodoAmount;
        uint256 overdraft; 
        uint256 totalRedeem;
        bool    hasParticipateGov;              //是否正在参与治理，是的话就不可以提币
    }

    // ============ Events ============
    event ParticipatoryGov(address user, uint256 amount);
    event Deposit(address user,address superior, uint256 amount);
    event Redeem(address user, uint256 amount);
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

    //TODO:是否可以不写？
    receive() external payable {
        revert();
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
    }

    // ============ Ownable Functions ============

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
        //TODO: update lastReward?
        dodoPerBlock = _dodoPerBlock;
        emit ChangePerReward(dodoPerBlock);
    }

    function updateDodoFeeDestroyRatio(uint256 _dodoFeeDestroyRatio) public onlyOwner {
        dodoFeeDestroyRatio = _dodoFeeDestroyRatio;
        emit UpdateDodoFeeDestroyRatio(_dodoFeeDestroyRatio);
    }
    

    // ============ Functions ============

    //TODO 投票与代理是否分开
    function participatoryGov(
        uint256 _amount,
        bytes calldata _data
    ) external preventReentrant {
        UserInfo memory user = userInfo[msg.sender];
        require(user.vdodoAmount > _amount, "vDODOToken: no enough vdodo");
        if (_data.length > 0)
            IGovernance(_DOOD_GOV_).governanceCall(msg.sender, _amount, _data);

        uint256 userVdodoAmount = user.vdodoAmount.sub(_amount);
        //TODO: 是否减掉总量
        totalSupply = totalSupply.sub(_amount);
        //TODO: 欠款为0？
        _updateUserData(msg.sender,userVdodoAmount,0);
        _changeUserParticipateState(msg.sender,true);
        emit ParticipatoryGov(msg.sender, _amount);
    }


    //TODO  round up /down
    function deposit(uint256 _amount,address _superiorAddress) public preventReentrant {
        require(_amount > 0,"must deposit greater than 0");

        IDODOApprove(_DODO_APPROVE_PROXY_).claimTokens(
            fromToken,
            msg.sender,
            address(this),
            fromTokenAmount
        );


        IERC20(_DODO_TOKEN_).transferFrom(msg.sender, address(this), _amount);
        _updateAlpha();

        UserInfo memory user = userInfo[msg.sender];
        // 自己的sp + x/alpha
        uint256 newVdodoAmount = _amount.div(alpha);
        uint256 fromVdodoAmount = user.vdodoAmount.add(newVdodoAmount);
        _updateUserData(msg.sender,fromVdodoAmount,0);

        if(user.superior==address(0x0) && _superiorAddress != address(0x0)){
            _updateSuperiorAddress(msg.sender,_superiorAddress);
        }

        UserInfo memory superiorUser = userInfo[user.superior];
        // 上级sp +（ x/alpha）* 0.1 （round up）
        uint256 superiorVdodoAmount = superiorUser.vdodoAmount.add(
            _amount.div(alpha)
            .mul(_MAG_SP_AMOUNT_).div(_BASE_AMOUNT_));

        // 上级DODO欠款 + x*0.1 （round up）
        uint256 overdraft = _amount.mul(_MAG_SP_AMOUNT_).div(_BASE_AMOUNT_);
        uint256 superiorOverdraft = superiorUser.overdraft.add(overdraft);

        _updateUserData(user.superior,superiorVdodoAmount,superiorOverdraft);

        uint256 newtotalOverDraft = totalOverDraft.add(overdraft);
        _updatetotalOverDraft(newtotalOverDraft);
        // total sp + x/alpha*1.1
        uint256 newtotalSupply = totalSupply.add(_amount.div(alpha).mul(_MAG_TOTALSP_AMOUNT_).div(_BASE_AMOUNT_));
        _updatetotalSupply(newtotalSupply);
        emit Deposit(msg.sender,_superiorAddress, _amount);
    }
    
    //TODO  round up /down
    function redeem(uint256 _amount) public preventReentrant{
        UserInfo memory user = userInfo[msg.sender];
        require(user.vdodoAmount>=_amount,"no enough vdodo token");
        require(!user.hasParticipateGov,"hasParticipateGov");
        _updateAlpha();

        // 自己的sp - x

        uint256 userVdodoAmount = user.vdodoAmount.sub(_amount);
        _updateUserData(msg.sender,userVdodoAmount,0);

        UserInfo memory superiorUser = userInfo[user.superior];
        // 上级sp - （x)*0.1（round down）
        uint256 superiorVdodoAmount = superiorUser.vdodoAmount.sub(
            _amount.mul(_MAG_SP_AMOUNT_).div(_BASE_AMOUNT_));

        // 上级DODO欠款 - x*alpha*0.1 （round down）
        uint256 overdraft = _amount.mul(alpha).mul(_MAG_SP_AMOUNT_).div(_BASE_AMOUNT_);
        uint256  superiorOverdraft= superiorUser.overdraft.sub(overdraft);
        _updateUserData(user.superior,superiorVdodoAmount,superiorOverdraft);


        uint256 newtotalOverDraft = totalOverDraft.sub(overdraft);    
        _updatetotalOverDraft(newtotalOverDraft);

        // total sp - （x+x*0.1）//TODO
        uint256 newtotalSupply = totalSupply.sub(_amount.mul(_MAG_TOTALSP_AMOUNT_).div(_BASE_AMOUNT_));
        _updatetotalSupply(newtotalSupply);

        lastRewardBlock = block.number;

        uint256 feeRatio = checkReward();
        // alpha* x * 80% transfer to user
        uint256 dodoAmount = alpha.mul(_amount);

        uint256 dodoFee = dodoAmount.mul(feeRatio).div(_BASE_AMOUNT_);
        uint256 dodoReceive = dodoAmount.sub(dodoFee);

        dodo.safeTransferFrom(address(this), msg.sender, dodoReceive);
        uint256 newRedeem = user.totalRedeem.add(dodoReceive);
        _updateUserRedeem(msg.sender,newRedeem);

        // 3. 这部分税会继续拆成两部分，第一部分销毁，第二部分分给所有vDODO持有人
        uint256 distributeAmount = dodoFee;
        //是否需要销毁
        if(dodoFeeDestroyRatio>0){
            // uint256 dodoFee = dodoAmount.mul(feeRatio).div(_BASE_AMOUNT_);
            uint256 destroyAmount = dodoFee.mul(dodoFeeDestroyRatio).div(_BASE_AMOUNT_);
            transfer(address(0), destroyAmount);
            distributeAmount = dodoFee.sub(destroyAmount);
        }

        //可以设置

        // alpha = alpha*X + x * 20% /totalSp
        uint256 feeAmount = _amount.mul(distributeAmount).div(_BASE_AMOUNT_);

        alpha = alpha.mul(_amount).add(feeAmount.div(totalSupply));
        emit Redeem(msg.sender, _amount);
    }

    // balanceOf = sp-DODO欠款/alpha
    function balanceOf(address _address) public view override returns (uint256 balance) {
        UserInfo memory user = userInfo[_address];
        balance = user.vdodoAmount.sub(user.overdraft.div(alpha));
    }

    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, _ALLOWED_[sender][msg.sender].sub(amount));
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

    function allowance(address owner, address spender) public view override returns (uint256) {
        return _ALLOWED_[owner][spender];
    }

    function _transfer(address from, address to, uint256 _amount) internal onlyOperater virtual {
        require(from != address(0), " transfer from the zero address");
        require(to != address(0), " transfer to the zero address");
        // require(balanceOf(from)≥amount)
        require(balanceOf(from) >= _amount,"no enough to transfer");
        UserInfo memory user = userInfo[from];
        //  sp[from] -= amount
        uint256 fromSpAmount = user.vdodoAmount.sub(_amount);
        _updateUserData(from,fromSpAmount,0);

        //  sp[上级[from]] -= amount*0.1 （round down)
        UserInfo memory fromSuperior = userInfo[user.superior];
        uint256 fromSuperiorSpAmount = fromSuperior.vdodoAmount.sub(_amount.mul(_MAG_SP_AMOUNT_).div(_BASE_AMOUNT_));
        _updateUserData(user.superior,fromSuperiorSpAmount,0);

        UserInfo memory toUser = userInfo[to];
        // sp[to] += amount 
        uint256 toSpAmount = toUser.vdodoAmount.add(_amount);
        _updateUserData(to,toSpAmount,0);

        // sp[上级[to]] += amount*0.1    
        UserInfo memory toSuperior = userInfo[toUser.superior];
        uint256 toSuperiorSpAmount =toSuperior.vdodoAmount.add(_amount.mul(_MAG_SP_AMOUNT_).div(_BASE_AMOUNT_)); 
        _updateUserData(toUser.superior,toSuperiorSpAmount,0);

        emit Transfer(from, to, _amount);
    }

    // 可提取DODO数额 = sp*alpha - DODO欠款
    function canWithDraw(address _address) public view returns (uint256 withDrawAmount) {
        UserInfo memory user = userInfo[_address];
        withDrawAmount = user.vdodoAmount.mul(alpha).sub(user.overdraft);
    }

    function checkUserInfo(address _userAddress) public view returns(address,uint256,uint256,uint256,bool) {
        UserInfo memory user = userInfo[_userAddress];
        return (user.superior, user.vdodoAmount, user.overdraft,user.totalRedeem,user.hasParticipateGov);

    }

     // ============ internal  function ============
    function _updateAlpha() internal {
        // accuDODO = dodoPerBlock*(block-lastRewardBlock)
        uint256 accuDODO = dodoPerBlock * (block.number.sub(lastRewardBlock));
        if(totalSupply > 0){
            // alpha = alpha + accuDODO/totalSp （round down）
             alpha = alpha.add(accuDODO.div(totalSupply));
        }
    }



    function _updateUserData(address _who,uint256 _vdodoAmount,uint256 _overdraft) internal {
        UserInfo storage userWho = userInfo[_who];
        if(_vdodoAmount>0){
            userWho.vdodoAmount = _vdodoAmount;
        }
        if(_overdraft>0){
            userWho.overdraft = _overdraft;
        }
    }
    function _updateUserRedeem(address _who,uint256 _newRedeem) internal {
        if(_newRedeem>0){
            UserInfo storage userWho = userInfo[_who];
            userWho.totalRedeem = _newRedeem;
        }
    }

    function _updateSuperiorAddress(address _who,address _newAddres) internal {
        UserInfo storage userWho = userInfo[_who];
        userWho.superior = _newAddres;
    }
    function _changeUserParticipateState(address _who,bool _newState) internal {
        UserInfo storage userWho = userInfo[_who];
        userWho.hasParticipateGov = _newState;
    }

    function _updatetotalOverDraft(uint256 _overdraft) internal {
        totalOverDraft = _overdraft;
    }
    
    function _updatetotalSupply(uint256 _newVdodoAmount) internal {
        totalSupply = _newVdodoAmount;
    }
     // ============= Helper and calculation function ===============
    function checkReward() internal  returns(uint256) {
        uint256 dodoTotalLockedAmout = IDODOLockedHelper(_DODO_LOCKED_HELPER_).getDodoLockedAmount();
        // (x - 1)^2 / 81 + (y - 15)^2 / 100 = 1 ==> y = sqrt(100* (x*x +2x ) / 81)) +15
        // y = 5 (x ≤ 1)
        // y = 15 (x ≥ 10)
        uint256 x = dodoTotalLockedAmout.divCeil(totalSupply);
        if(x<=_MIN_X_){
            return _MIN_X_Y_;
        }else if(x>=_MAX_X_){
            return _MAX_X_Y_;
        }else{
            uint256 rewardAmount = x.mul(x).add(x.mul(2)).mul(100).div(81).sqrt().add(15);
            return rewardAmount;
        }
    }
}


//官方的收益会定期回购DODO Token并分红。因此要留一个donate接口，方便外部注入资金----> 为什么不可以使用 DODOToken.transfer?

// TODO DecimalMath calculation 