pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

interface IFeeManager {
    function rebate(address rebateTo, uint256 feeAmount, address fromToken) external;

}