pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IDODOV2Proxy01} from "./intf/IDODOV2Proxy01.sol";
import {IDODOV2} from "./intf/IDODOV2.sol";
import {IDODOV1} from "./intf/IDODOV1.sol";
import {IDODOApprove} from "../intf/IDODOApprove.sol";
import {IDODOSellHelper} from "./helper/DODOSellHelper.sol";
import {IERC20} from "../intf/IERC20.sol";
import {IWETH} from "../intf/IWETH.sol";
import {IUni} from "./intf/IUni.sol";
import {IChi} from "./intf/IChi.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {UniversalERC20} from "./lib/UniversalERC20.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";
import {ReentrancyGuard} from "../lib/ReentrancyGuard.sol";
import {InitializableOwnable} from "../lib/InitializableOwnable.sol";
import {IDODOIncentive} from "../DODOToken/DODOIncentive.sol";
import {IDODOAdapter} from "./intf/IDODOAdapter.sol";

contract RABSwap is ReentrancyGuard, InitializableOwnable {
    using SafeMath for uint256;
    using UniversalERC20 for IERC20;

    // ============ Storage ============

    address constant _ETH_ADDRESS_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public immutable _DODO_PROXY_;
    address public immutable _WETH_;
    address public immutable _DODO_APPROVE_;
    address public immutable _DODO_SELL_HELPER_;
    //address public immutable _DODO_INCENTIVE_;
    address public immutable _CHI_TOKEN_;
    uint256 public _GAS_DODO_MAX_RETURN_ = 0;
    uint256 public _GAS_EXTERNAL_RETURN_ = 0;

    struct SwapPara {
        //address fromAddress;
        address pool;
        //address assetTo;
        address adapter;
        uint256 direction;
        uint256 weight;
    }

    // ============ Events ============

     event OrderHistory(
        address fromToken,
        address toToken,
        address sender,
        uint256 fromAmount,
        uint256 returnAmount
    );

    // ============ Modifiers ============

    modifier judgeExpired(uint256 deadLine) {
        require(deadLine >= block.timestamp, "DODOV2Proxy01: EXPIRED");
        _;
    }

    fallback() external payable {}

    receive() external payable {}

    constructor (
        address dodoProxy,
        address payable weth,
        address dodoApprove,
        address dodoSellHelper,
        address chiToken
        //address dodoIncentive
    ) public {
        _WETH_ = weth;
        _DODO_APPROVE_ = dodoApprove;
        _DODO_SELL_HELPER_ = dodoSellHelper;
        _CHI_TOKEN_ = chiToken;
        _DODO_PROXY_ = dodoProxy;
        //_DODO_INCENTIVE_ = dodoIncentive;
    }

    function updateGasReturn(uint256 newDodoGasReturn, uint256 newExternalGasReturn) public onlyOwner {
        _GAS_DODO_MAX_RETURN_ = newDodoGasReturn;
        _GAS_EXTERNAL_RETURN_ = newExternalGasReturn;
    }


    function _RABHelper(
        uint256[] memory totalWeight,
        address[] memory midToken,
        uint256[] memory splitNumberHelp,
        bytes[] memory swapSequence,
        address[] memory assetFrom
    ) internal { // splitNumber[0] is null
        for(uint256 j = 1; j < splitNumberHelp.length; ++j) { 
        
            uint256 curTotalAmount = IERC20(midToken[j-1]).tokenBalanceOf(assetFrom[j-1]);
            uint256 curTotalWeight = totalWeight[j-1];
            
            for(uint256 i = 0; i < splitNumberHelp[j]; ++i) {
                uint256 tmpNumber = splitNumberHelp[j] - splitNumberHelp[j-1] + i;
                (address pool, address adapter, uint256 direction, uint256 weight) = abi.decode(swapSequence[tmpNumber], (address, address, uint256, uint256));

                //uint256 poolWeight = swapSequence[j][i].weight;
                //address pool = swapSequence[j][i].pool;

                //require(poolWeight < curTotalWeight, 'RABMixSwap: INVALID_SUBWEIGHT');

                if(assetFrom[j] == address(this)) {
                    uint256 curAmount = curTotalAmount.div(curTotalWeight).mul(weight);
                    
                    IERC20(midToken[j-1]).transfer(pool, curAmount);
                }

                if(direction == 0) {
                    IDODOAdapter(adapter).sellBase(assetFrom[j+1], pool);
                } else {
                    IDODOAdapter(adapter).sellQuote(assetFrom[j+1], pool);
                }
            }
        }

    }

    /*
    function _decodeSwap(bytes calldata originData) internal returns (address _pool, address _adapter, uint256 _direction, uint256 _weight) {
        for(uint256 i = 0; i < originData.length; ++i) {
            bytes memory tmpData = originData[i];
            (address _pool, address _adapter, uint256 _direction, uint256 _weight) = abi.decode(tmpData, (address, address, uint256, uint256));
        }   
    }
    */

    function RABMixSwap_Sec(
        address _fromToken,
        address _toToken,
        uint256 _fromTokenAmount,
        uint256 minReturnAmount,
        uint256[] memory totalWeight,
        address[] memory midToken,
        uint256[] calldata splitNumber,
        bytes[] calldata sequence,
        address[] memory assetFrom,
        //bool isIncentive,
        uint256 deadLine
    ) external payable judgeExpired(deadLine) returns (uint256 returnAmount) {
        
        uint256 toTokenOriginBalance = IERC20(_toToken).universalBalanceOf(msg.sender);
        
       
        
        require(midToken[0] == _fromToken && midToken[midToken.length - 1] == _toToken, 'RABMixSwap: INVALID_PATH');
        require(assetFrom.length == splitNumber.length+1, 'RABMixSwap: PAIR_ASSETTO_NOT_MATCH');
        
        require(minReturnAmount > 0, "RABMixSwap: RETURN_AMOUNT_ZERO");


    
        
        
        _deposit(msg.sender, assetFrom[0], _fromToken, _fromTokenAmount, _fromToken == _ETH_ADDRESS_);

        
        _RABHelper(totalWeight, midToken, splitNumber, sequence, assetFrom);
    

        if(_toToken == _ETH_ADDRESS_) {
            returnAmount = IWETH(_WETH_).balanceOf(address(this));
            IWETH(_WETH_).withdraw(returnAmount);
            msg.sender.transfer(returnAmount);
        }else {
            returnAmount = IERC20(_toToken).tokenBalanceOf(msg.sender).sub(toTokenOriginBalance);
        }

        require(returnAmount >= minReturnAmount, "RABMixSwap: Return amount is not enough");
        
        

        emit OrderHistory(
            _fromToken,
            _toToken,
            msg.sender,
            _fromTokenAmount,
            returnAmount
        );
        
        
    }

    function _deposit(
        address from,
        address to,
        address token,
        uint256 amount,
        bool isETH
    ) internal {
        if (isETH) {
            if (amount > 0) {
                IWETH(_WETH_).deposit{value: amount}();
                if (to != _DODO_PROXY_) SafeERC20.safeTransfer(IERC20(_WETH_), to, amount);
            }
        } else {
            IDODOApprove(_DODO_APPROVE_).claimTokens(token, from, to, amount);
        }
    }

    function _withdraw(
        address payable to,
        address token,
        uint256 amount,
        bool isETH
    ) internal {
        if (isETH) {
            if (amount > 0) {
                IWETH(_WETH_).withdraw(amount);
                to.transfer(amount);
            }
        } else {
            SafeERC20.safeTransfer(IERC20(token), to, amount);
        }
    }

    function _dodoGasReturn(uint256 originGas) internal {
        uint256 _gasDodoMaxReturn = _GAS_DODO_MAX_RETURN_;
        if(_gasDodoMaxReturn > 0) {
            uint256 calcGasTokenBurn = originGas.sub(gasleft()) / 65000;
            uint256 gasTokenBurn = calcGasTokenBurn > _gasDodoMaxReturn ? _gasDodoMaxReturn : calcGasTokenBurn;
            if(gasTokenBurn >= 3 && gasleft() > 27710 + gasTokenBurn * 6080)
                IChi(_CHI_TOKEN_).freeUpTo(gasTokenBurn);
        }
    }

    function _externalGasReturn() internal {
        uint256 _gasExternalReturn = _GAS_EXTERNAL_RETURN_;
        if(_gasExternalReturn > 0) {
            if(gasleft() > 27710 + _gasExternalReturn * 6080)
                IChi(_CHI_TOKEN_).freeUpTo(_gasExternalReturn);
        }
    }
}