/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import {Ownable} from "../lib/Ownable.sol";
import {IDODO} from "../intf/IDODO.sol";
import {IERC20} from "../intf/IERC20.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";
import {SafeMath} from "../lib/SafeMath.sol";

interface IUniswapV2Pair {
    function token0() external view returns (address);

    function token1() external view returns (address);

    function getReserves()
        external
        view
        returns (
            uint112 reserve0,
            uint112 reserve1,
            uint32 blockTimestampLast
        );

    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external;
}

contract UniswapArbitrageur {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public _UNISWAP_;
    address public _DODO_;
    address public _BASE_;
    address public _QUOTE_;

    bool public _REVERSE_; // true if dodo.baseToken=uniswap.token0

    constructor(address _uniswap, address _dodo) public {
        _UNISWAP_ = _uniswap;
        _DODO_ = _dodo;

        _BASE_ = IDODO(_DODO_)._BASE_TOKEN_();
        _QUOTE_ = IDODO(_DODO_)._QUOTE_TOKEN_();

        address token0 = IUniswapV2Pair(_UNISWAP_).token0();
        address token1 = IUniswapV2Pair(_UNISWAP_).token1();

        if (token0 == _BASE_ && token1 == _QUOTE_) {
            _REVERSE_ = false;
        } else if (token0 == _QUOTE_ && token1 == _BASE_) {
            _REVERSE_ = true;
        } else {
            require(true, "DODO_UNISWAP_NOT_MATCH");
        }

        IERC20(_BASE_).approve(_DODO_, uint256(-1));
        IERC20(_QUOTE_).approve(_DODO_, uint256(-1));
    }

    function executeBuyArbitrage(uint256 baseAmount) external returns (uint256 quoteProfit) {
        IDODO(_DODO_).buyBaseToken(baseAmount, uint256(-1), "0xd");
        quoteProfit = IERC20(_QUOTE_).balanceOf(address(this));
        IERC20(_QUOTE_).transfer(msg.sender, quoteProfit);
        return quoteProfit;
    }

    function executeSellArbitrage(uint256 baseAmount) external returns (uint256 baseProfit) {
        IDODO(_DODO_).sellBaseToken(baseAmount, 0, "0xd");
        baseProfit = IERC20(_BASE_).balanceOf(address(this));
        IERC20(_BASE_).transfer(msg.sender, baseProfit);
        return baseProfit;
    }

    function dodoCall(
        bool isDODOBuy,
        uint256 baseAmount,
        uint256 quoteAmount,
        bytes calldata
    ) external {
        require(msg.sender == _DODO_, "WRONG_DODO");
        if (_REVERSE_) {
            _inverseArbitrage(isDODOBuy, baseAmount, quoteAmount);
        } else {
            _arbitrage(isDODOBuy, baseAmount, quoteAmount);
        }
    }

    function _inverseArbitrage(
        bool isDODOBuy,
        uint256 baseAmount,
        uint256 quoteAmount
    ) internal {
        (uint112 _reserve0, uint112 _reserve1, ) = IUniswapV2Pair(_UNISWAP_).getReserves();
        uint256 token0Balance = uint256(_reserve0);
        uint256 token1Balance = uint256(_reserve1);
        uint256 token0Amount;
        uint256 token1Amount;
        if (isDODOBuy) {
            IERC20(_BASE_).transfer(_UNISWAP_, baseAmount);
            // transfer token1 into uniswap
            uint256 newToken0Balance = token0Balance.mul(token1Balance).div(
                token1Balance.add(baseAmount)
            );
            token0Amount = token0Balance.sub(newToken0Balance).mul(9969).div(10000); // mul 0.9969
            require(token0Amount > quoteAmount, "NOT_PROFITABLE");
            IUniswapV2Pair(_UNISWAP_).swap(token0Amount, token1Amount, address(this), "");
        } else {
            IERC20(_QUOTE_).transfer(_UNISWAP_, quoteAmount);
            // transfer token0 into uniswap
            uint256 newToken1Balance = token0Balance.mul(token1Balance).div(
                token0Balance.add(quoteAmount)
            );
            token1Amount = token1Balance.sub(newToken1Balance).mul(9969).div(10000); // mul 0.9969
            require(token1Amount > baseAmount, "NOT_PROFITABLE");
            IUniswapV2Pair(_UNISWAP_).swap(token0Amount, token1Amount, address(this), "");
        }
    }

    function _arbitrage(
        bool isDODOBuy,
        uint256 baseAmount,
        uint256 quoteAmount
    ) internal {
        (uint112 _reserve0, uint112 _reserve1, ) = IUniswapV2Pair(_UNISWAP_).getReserves();
        uint256 token0Balance = uint256(_reserve0);
        uint256 token1Balance = uint256(_reserve1);
        uint256 token0Amount;
        uint256 token1Amount;
        if (isDODOBuy) {
            IERC20(_BASE_).transfer(_UNISWAP_, baseAmount);
            // transfer token0 into uniswap
            uint256 newToken1Balance = token1Balance.mul(token0Balance).div(
                token0Balance.add(baseAmount)
            );
            token1Amount = token1Balance.sub(newToken1Balance).mul(9969).div(10000); // mul 0.9969
            require(token1Amount > quoteAmount, "NOT_PROFITABLE");
            IUniswapV2Pair(_UNISWAP_).swap(token0Amount, token1Amount, address(this), "");
        } else {
            IERC20(_QUOTE_).transfer(_UNISWAP_, quoteAmount);
            // transfer token1 into uniswap
            uint256 newToken0Balance = token1Balance.mul(token0Balance).div(
                token1Balance.add(quoteAmount)
            );
            token0Amount = token0Balance.sub(newToken0Balance).mul(9969).div(10000); // mul 0.9969
            require(token0Amount > baseAmount, "NOT_PROFITABLE");
            IUniswapV2Pair(_UNISWAP_).swap(token0Amount, token1Amount, address(this), "");
        }
    }

    function retrieve(address token, uint256 amount) external {
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
