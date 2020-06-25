module.exports = {
  client: require("ganache-cli"),
  port: 6545,
  testrpcOptions:
    "--port 6545 -l 0x1fffffffffffff -i 1002 -g 1 --allowUnlimitedContractSize",
  skipFiles: [
    "lib/SafeMath.sol",
    "lib/DecimalMath.sol",
    "lib/Types.sol",
    "lib/ReentrancyGuard.sol",
    "lib/Ownable.sol",
    "impl/DODOLpToken.sol",
    "intf",
    "helper",
  ],
};
