pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {IDODOV2Proxy01} from "../intf/IDODOV2Proxy01.sol";
import {IDODOV2} from "../intf/IDODOV2.sol";
import {IDODOV1} from "../intf/IDODOV1.sol";
import {IDODOApproveProxy} from "../DODOApproveProxy.sol";
import {IERC20} from "../../intf/IERC20.sol";
import {IWETH} from "../../intf/IWETH.sol";
import {SafeMath} from "../../lib/SafeMath.sol";
import {UniversalERC20} from "../lib/UniversalERC20.sol";
import {SafeERC20} from "../../lib/SafeERC20.sol";
import {IDODOAdapter} from "../intf/IDODOAdapter.sol";


/**
 * @title DODORouteProxy
 * @author DODO Breeder
 *
 * @notice Entrance of Split trading in DODO platform
 */
contract DODORouteProxy {
    using SafeMath for uint256;
    using UniversalERC20 for IERC20;

    // ============ Storage ============

    address constant _ETH_ADDRESS_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public immutable _WETH_;
    address public immutable _DODO_APPROVE_PROXY_;

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
        require(deadLine >= block.timestamp, "DODORouteProxy: EXPIRED");
        _;
    }

    fallback() external payable {}

    receive() external payable {}

    constructor (
        address payable weth,
        address dodoApproveProxy
    ) public {
        _WETH_ = weth;
        _DODO_APPROVE_PROXY_ = dodoApproveProxy;
    }

    function dodoMutliSwap(
        address _fromToken,
        address _toToken,
        uint256 _fromTokenAmount,
        uint256 minReturnAmount,
        uint256[] memory totalWeight,
        address[] memory midToken,
        uint256[] calldata splitNumber,
        bytes[] calldata sequence,
        address[] memory assetFrom,
        uint256 deadLine
    ) external payable judgeExpired(deadLine) returns (uint256 returnAmount) {
        require(midToken[0] == _fromToken && midToken[midToken.length - 1] == _toToken, 'RABMixSwap: INVALID_PATH');
        require(assetFrom.length == splitNumber.length+1, 'RABMixSwap: PAIR_ASSETTO_NOT_MATCH');        
        require(minReturnAmount > 0, "RABMixSwap: RETURN_AMOUNT_ZERO");

        uint256 toTokenOriginBalance = IERC20(_toToken).universalBalanceOf(msg.sender);
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

    
    //====================== internal =======================

    function _RABHelper(
        uint256[] memory totalWeight,
        address[] memory midToken,
        uint256[] memory splitNumberHelp,
        bytes[] memory swapSequence,
        address[] memory assetFrom
    ) internal { 
        for(uint256 i = 1; i < splitNumber.length; i++) { 
            // define midtoken address, ETH -> WETH address
            uint256 curTotalAmount = IERC20(midToken[i]).tokenBalanceOf(assetFrom[i-1]);
            uint256 curTotalWeight = totalWeight[i-1];
            
            for(uint256 j = splitNumber[i-1]; j < splitNumber[i]; j++) {
                (address pool, address adapter, uint256 mixPara) = abi.decode(swapSequence[j], (address, address, uint256));
                uint256 direction = mixPara >> 17;
                uint256 weight = (0xffff & mixPara) >> 9;
                uint256 poolEdition = (0xff & mixPara);

                //uint256 poolWeight = swapSequence[j][i].weight;
                //address pool = swapSequence[j][i].pool;

                //require(poolWeight < curTotalWeight, 'RABMixSwap: INVALID_SUBWEIGHT');

                if(assetFrom[j] == address(this)) {
                    uint256 curAmount = curTotalAmount.div(curTotalWeight).mul(weight);
            
                    if(poolEdition == 1) {  
                        //For using transferFrom pool (like dodoV1)
                        IERC20(midToken[i]).transfer(adapter, curAmount);
                    } else {
                        //For using transfer pool (like dodoV2)
                        IERC20(midToken[i]).transfer(pool, curAmount);
                    }
                }
                
                if(direction == 0) {
                    IDODOAdapter(adapter).sellBase(assetFrom[i], pool, "");
                } else {
                    IDODOAdapter(adapter).sellQuote(assetFrom[i], pool, "");
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
                if (to != address(this)) SafeERC20.safeTransfer(IERC20(_WETH_), to, amount);
            }
        } else {
            IDODOApproveProxy(_DODO_APPROVE_PROXY_).claimTokens(token, from, to, amount);
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
            if (amount > 0) {
                SafeERC20.safeTransfer(IERC20(token), to, amount);
            }
        }
    }
}