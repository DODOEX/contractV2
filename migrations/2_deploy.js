const DODOZoo = artifacts.require("DODOZoo");

module.exports = async (deployer, network) => {
  const deployDODOZoo = async () => {
    await deployer.deploy(DODOZoo);
  };

  if (network == "development") {
    await deployDODOZoo();
  }
};
