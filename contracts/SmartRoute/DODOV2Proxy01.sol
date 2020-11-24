/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {IDODOV2Proxy01} from "../intf/IDODOV2Proxy01.sol";
import {IDODOV2} from "../intf/IDODOV2.sol";
import {IERC20} from "../intf/IERC20.sol";
import {IWETH} from "../intf/IWETH.sol";
import {SafeMath} from "../lib/SafeMath.sol";
import {UniversalERC20} from "../lib/UniversalERC20.sol";
import {DecimalMath} from "../lib/DecimalMath.sol";

contract DODOV2Proxy01 is IDODOV2Proxy01 {
    using SafeMath for uint256;
    using UniversalERC20 for IERC20;

    address constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address payable public _WETH_;
    address public smartApprove;
    address public dodoSellHelper;
    address public dvmFactory;
    address public dppFactory;

    modifier judgeExpired(uint256 deadline) {
        require(deadline >= block.timestamp, 'DODOV2Proxy01: EXPIRED');
        _;
    }

    //============================== events ==================================
    event OrderHistory(
        address indexed fromToken,
        address indexed toToken,
        address indexed sender,
        uint256 fromAmount,
        uint256 returnAmount,
        uint256 timeStamp
    );

    event ExternalRecord(address indexed to, address indexed sender);
    //========================================================================



    constructor(
        address _dvmFactory,
        address _dppFactory,
        address payable _weth,
        address _smartApprove,
        address _dodoSellHelper
    ) public {
        dvmFactory = _dvmFactory;
        dppFactory = _dppFactory;
        _WETH_ = _weth;
        smartApprove = _smartApprove;
        dodoSellHelper = _dodoSellHelper;
    }
    
    //TODO:ETH
    function createDODOVendingMachine(
        address baseToken,
        address quoteToken,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 i,
        uint256 k,
        uint256 deadline
    ) external virtual override payable judgeExpired(deadline) returns (address newVendingMachine,uint256 shares) {
        require(k > 0 && k<= 10**18, "DODOV2Proxy01: K OUT OF RANGE");
        newVendingMachine = IDODOV2(dvmFactory).createDODOVendingMachine(baseToken,quoteToken,lpFeeRate,mtFeeRate,i,k);
        if(baseInAmount > 0) 
            IDODOV2(smartApprove).claimTokens(baseToken, msg.sender, newVendingMachine, baseInAmount);
        if(quoteInAmount > 0)
            IDODOV2(smartApprove).claimTokens(quoteToken, msg.sender, newVendingMachine, quoteInAmount);
        (shares,,) = IDODOV2(newVendingMachine).buyShares(msg.sender);
    }


    function _addDVMLiquidity(
        address DVMAddress,
        uint256 baseInAmount,
        uint256 quoteInAmount
    ) internal virtual view returns (uint baseAdjustedInAmount, uint quoteAdjustedInAmount) {
        (uint256 baseReserve, uint256 quoteReserve) = IDODOV2(DVMAddress).getVaultReserve();
        if (quoteReserve == 0 && baseReserve == 0) {
            baseAdjustedInAmount = baseInAmount;
            quoteAdjustedInAmount = quoteInAmount;
        }
        //TODO: 若init时候 baseInAmount > 0 quoteReserve = 0 之后没法添加quote？
        if (quoteReserve == 0 && baseReserve > 0) {
            baseAdjustedInAmount = baseInAmount;
            quoteAdjustedInAmount = 0;
        }
        if (quoteReserve > 0 && baseReserve > 0) {
            uint256 baseIncreaseRatio = DecimalMath.divFloor(baseInAmount, baseReserve);
            uint256 quoteIncreaseRatio = DecimalMath.divFloor(quoteInAmount, quoteReserve);
            if (baseIncreaseRatio <= quoteIncreaseRatio) {
                baseAdjustedInAmount = baseInAmount;
                quoteAdjustedInAmount = DecimalMath.mulFloor(quoteReserve, baseIncreaseRatio);
            } else {
                quoteAdjustedInAmount = quoteInAmount;
                baseAdjustedInAmount = DecimalMath.mulFloor(baseReserve, quoteIncreaseRatio);
            }
        }
    }

    //TODO:ETH 
    function addDVMLiquidity(
        address DVMAddress,
        address to,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 baseMinAmount,
        uint256 quoteMinAmount,
        uint256 deadline
    ) external virtual override payable judgeExpired(deadline) returns (uint256 shares,uint256 baseActualInAmount,uint256 quoteActualInAmount) {
        (uint256 baseAdjustedInAmount, uint256 quoteAdjustedInAmount) = _addDVMLiquidity(DVMAddress,baseInAmount,quoteInAmount);
        address _dvm = DVMAddress;
        if(baseAdjustedInAmount > 0)
            IDODOV2(smartApprove).claimTokens(IDODOV2(_dvm)._BASE_TOKEN_(), msg.sender, _dvm, baseAdjustedInAmount);
        if(quoteAdjustedInAmount > 0)
            IDODOV2(smartApprove).claimTokens(IDODOV2(_dvm)._QUOTE_TOKEN_(), msg.sender, _dvm, quoteAdjustedInAmount);
        (shares,baseActualInAmount,quoteActualInAmount) = IDODOV2(_dvm).buyShares(to);
        require(baseActualInAmount >= baseMinAmount && quoteActualInAmount >= quoteMinAmount, "DODOV2Proxy01: deposit amount is not enough");
    }

    //TODO:ETH 
    function removeDVMLiquidity(
        address DVMAddress,
        address to,
        uint256 shares,
        uint256 baseOutMinAmount,
        uint256 quoteOutMinAmount,
        uint256 deadline
    ) external virtual override payable judgeExpired(deadline) returns (uint256 baseOutAmount,uint256 quoteOutAmount) {
        require(shares > 0, "DODOV2Proxy01: Insufficient_Liquidity");
        IDODOV2(smartApprove).claimTokens(DVMAddress, msg.sender, DVMAddress, shares);
        (baseOutAmount,quoteOutAmount) = IDODOV2(DVMAddress).sellShares(to);
        require(baseOutAmount >= baseOutMinAmount && quoteOutAmount >= quoteOutMinAmount,"DODOV2Proxy01: withdraw amount is not enough");
    }

    //TODO:ETH 
    function createDODOPrivatePool(
        address baseToken,
        address quoteToken,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        address[] memory valueTemplates, //feeRateAddr,mtRateAddr,kAddr,iAddr
        uint256[] memory values, // feeRate,mtRate,k,i
        uint256 deadline
    ) external virtual override payable judgeExpired(deadline) returns (address newPrivatePool) {
        newPrivatePool = IDODOV2(dppFactory).createDODOPrivatePool(baseToken,quoteToken,valueTemplates,values);
        if(baseInAmount > 0) 
            IDODOV2(smartApprove).claimTokens(baseToken, msg.sender, newPrivatePool, baseInAmount);
        if(quoteInAmount > 0)
            IDODOV2(smartApprove).claimTokens(quoteToken, msg.sender, newPrivatePool, quoteInAmount);
        IDODOV2(newPrivatePool).initTargetAndReserve();
    }

    //TODO:ETH
    function resetDODOPrivatePool(
        address DPPAddress,
        uint256 newLpFeeRate,
        uint256 newMtFeeRate,
        uint256 newI,
        uint256 newK,
        uint256 baseInAmount,
        uint256 quoteInAmount,
        uint256 baseOutAmount,
        uint256 quoteOutAmount,
        uint256 deadline
    ) external virtual override payable judgeExpired(deadline) {
        if(baseInAmount > 0) 
            IDODOV2(smartApprove).claimTokens(IDODOV2(DPPAddress)._BASE_TOKEN_(), msg.sender, DPPAddress, baseInAmount);
        if(quoteInAmount > 0)
            IDODOV2(smartApprove).claimTokens(IDODOV2(DPPAddress)._QUOTE_TOKEN_(), msg.sender, DPPAddress, quoteInAmount);
        IDODOV2(DPPAddress).reset(
            newLpFeeRate,
            newMtFeeRate,
            newI,
            newK,
            baseOutAmount,
            quoteOutAmount
        );
    }

    function dodoSwap(
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint256[] memory directions,
        uint256 deadline
    ) external virtual override payable judgeExpired(deadline) returns (uint256 returnAmount) {
        require(minReturnAmount > 0, "DODOV2Proxy01: Min return should be bigger than 0.");
        require(dodoPairs.length > 0, "DODOV2Proxy01: pairs should exists.");

        if (fromToken != ETH_ADDRESS) {
            IDODOV2(smartApprove).claimTokens(fromToken, msg.sender, dodoPairs[0], fromTokenAmount);
        } else {
            require(msg.value == fromTokenAmount, "DODOV2Proxy01: ETH_AMOUNT_NOT_MATCH");
            IWETH(_WETH_).deposit{value: fromTokenAmount}();
            IWETH(_WETH_).transfer(dodoPairs[0],IWETH(_WETH_).balanceOf(address(this)));
        }

        for (uint256 i = 0; i < dodoPairs.length; i++) {
            address curTo;
            if(i == dodoPairs.length - 1){
                curTo = address(this);
            } else {
                curTo = dodoPairs[i+1];
            }
            if (directions[i] == 0) {
                IDODOV2(dodoPairs[i]).sellBase(curTo);
            } else {
                IDODOV2(dodoPairs[i]).sellQuote(curTo);
            }
        }
        IERC20(fromToken).universalTransfer(msg.sender, IERC20(fromToken).universalBalanceOf(address(this)));

        if (toToken == ETH_ADDRESS) {
            uint256 wethAmount = IWETH(_WETH_).balanceOf(address(this));
            IWETH(_WETH_).withdraw(wethAmount);
        }

        returnAmount = IERC20(toToken).universalBalanceOf(address(this));

        require(returnAmount >= minReturnAmount, "DODOV2Proxy01: Return amount is not enough");
        IERC20(toToken).universalTransfer(msg.sender, returnAmount);
        emit OrderHistory(fromToken, toToken, msg.sender, fromTokenAmount, returnAmount, block.timestamp);
    }

    function externalSwap(
        address fromToken,
        address toToken,
        address approveTarget,
        address to,
        uint256 gasSwap,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        bytes memory callDataConcat,
        uint256 deadline
    ) external virtual override payable judgeExpired(deadline) returns (uint256 returnAmount) {
        
        require(minReturnAmount > 0, "DODOV2Proxy01: Min return should be bigger then 0.");

        if (fromToken != ETH_ADDRESS) {
            IDODOV2(smartApprove).claimTokens(fromToken, msg.sender, address(this), fromTokenAmount);
            IERC20(fromToken).universalApprove(approveTarget, fromTokenAmount);
        }

        (bool success, ) = to.call{value: fromToken == ETH_ADDRESS ? msg.value : 0, gas: gasSwap}(
            callDataConcat
        );

        require(success, "DODOV2Proxy01: Contract Swap execution Failed");

        IERC20(fromToken).universalTransfer(msg.sender, IERC20(fromToken).universalBalanceOf(address(this)));
        returnAmount = IERC20(toToken).universalBalanceOf(address(this));

        require(returnAmount >= minReturnAmount, "DODOV2Proxy01: Return amount is not enough");
        IERC20(toToken).universalTransfer(msg.sender, returnAmount);
        emit OrderHistory(fromToken, toToken, msg.sender, fromTokenAmount, returnAmount, block.timestamp);
        emit ExternalRecord(to, msg.sender);
    }

    //====================== temporary for test ======================
    // function sellBaseOnDVM(
    //     address DVMAddress,
    //     address to,
    //     uint256 baseAmount,
    //     uint256 minReceive
    // ) public returns (uint256 receiveAmount) {
    //     IERC20(IDVM(DVMAddress)._BASE_TOKEN_()).safeTransferFrom(
    //         msg.sender,
    //         DVMAddress,
    //         baseAmount
    //     );
    //     receiveAmount = IDVM(DVMAddress).sellBase(to);
    //     require(receiveAmount >= minReceive, "RECEIVE_NOT_ENOUGH");
    //     return receiveAmount;
    // }

    // function sellQuoteOnDVM(
    //     address DVMAddress,
    //     address to,
    //     uint256 quoteAmount,
    //     uint256 minReceive
    // ) public returns (uint256 receiveAmount) {
    //     IERC20(IDVM(DVMAddress)._QUOTE_TOKEN_()).safeTransferFrom(
    //         msg.sender,
    //         DVMAddress,
    //         quoteAmount
    //     );
    //     receiveAmount = IDVM(DVMAddress).sellQuote(to);
    //     require(receiveAmount >= minReceive, "RECEIVE_NOT_ENOUGU");
    //     return receiveAmount;
    // }

    // function depositToDVM(
    //     address DVMAddress,
    //     address to,
    //     uint256 baseAmount,
    //     uint256 quoteAmount
    // ) public returns (uint256 shares) {
    //     uint256 adjustedBaseAmount;
    //     uint256 adjustedQuoteAmount;
    //     (uint256 baseReserve, uint256 quoteReserve) = IDVM(DVMAddress).getVaultReserve();
    //     if (quoteReserve == 0 && baseReserve == 0) {
    //         adjustedBaseAmount = baseAmount;
    //         adjustedQuoteAmount = quoteAmount;
    //     }
    //     if (quoteReserve == 0 && baseReserve > 0) {
    //         adjustedBaseAmount = baseAmount;
    //         adjustedQuoteAmount = 0;
    //     }
    //     if (quoteReserve > 0 && baseReserve > 0) {
    //         uint256 baseIncreaseRatio = DecimalMath.divFloor(baseAmount, baseReserve);
    //         uint256 quoteIncreaseRatio = DecimalMath.divFloor(quoteAmount, quoteReserve);
    //         if (baseIncreaseRatio <= quoteIncreaseRatio) {
    //             adjustedBaseAmount = baseAmount;
    //             adjustedQuoteAmount = DecimalMath.mulFloor(quoteReserve, baseIncreaseRatio);
    //         } else {
    //             adjustedQuoteAmount = quoteAmount;
    //             adjustedBaseAmount = DecimalMath.mulFloor(baseReserve, quoteIncreaseRatio);
    //         }
    //     }
    //     IERC20(IDVM(DVMAddress)._BASE_TOKEN_()).safeTransferFrom(
    //         msg.sender,
    //         DVMAddress,
    //         adjustedBaseAmount
    //     );
    //     IERC20(IDVM(DVMAddress)._QUOTE_TOKEN_()).safeTransferFrom(
    //         msg.sender,
    //         DVMAddress,
    //         adjustedQuoteAmount
    //     );
    //     shares = IDVM(DVMAddress).buyShares(to);
    //     return shares;
    // }
}
