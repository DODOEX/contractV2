const DecimalMath = artifacts.require("DecimalMath");
const SafeERC20 = artifacts.require("SafeERC20");
const DODOMath = artifacts.require("DODOMath");
const DODO = artifacts.require("DODO");
const DODOZoo = artifacts.require("DODOZoo");

module.exports = async (deployer, network) => {
  const deployDODO = async () => {
    await deployer.deploy(DecimalMath);
    await deployer.deploy(SafeERC20);
    await deployer.deploy(DODOMath);

    await deployer.link(SafeERC20, DODO);
    await deployer.link(DecimalMath, DODO);
    await deployer.link(DODOMath, DODO);

    await deployer.deploy(DODO);
    await deployer.deploy(DODOZoo);
  };

  if (network == "production") {
  } else if (network == "kovan") {
  } else {
    // for development & test
    await deployDODO();
  }
};
