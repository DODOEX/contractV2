pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

interface IWooPP {
    /// @dev Swap baseToken into quoteToken
    /// @param baseToken the base token
    /// @param baseAmount amount of baseToken that user want to swap
    /// @param minQuoteAmount minimum amount of quoteToken that user accept to receive
    /// @param to quoteToken receiver address
    /// @param rebateTo the wallet address for rebate
    /// @return quoteAmount the swapped amount of quote token
    function sellBase(
        address baseToken,
        uint256 baseAmount,
        uint256 minQuoteAmount,
        address to,
        address rebateTo
    ) external returns (uint256 quoteAmount);

    /// @dev Swap quoteToken into baseToken
    /// @param baseToken the base token
    /// @param quoteAmount amount of quoteToken that user want to swap
    /// @param minBaseAmount minimum amount of baseToken that user accept to receive
    /// @param to baseToken receiver address
    /// @param rebateTo the wallet address for rebate
    /// @return baseAmount the swapped amount of base token
    function sellQuote(
        address baseToken,
        uint256 quoteAmount,
        uint256 minBaseAmount,
        address to,
        address rebateTo
    ) external returns (uint256 baseAmount);

}